from fastapi import FastAPI, HTTPException, Request, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os
import sys
import json
import time
import uuid
import shutil
import asyncio
import collections
from datetime import datetime
from urllib.request import Request as URLRequest, urlopen
import re
import yt_dlp
from dataclasses import asdict

from utils import get_base_dir, get_resource_path, get_data_dir, get_downloads_dir, get_cookies_path
from database import init_db, get_conn, get_downloaded_ids, mark_missing_db, get_download_record
from downloader import jobs, download_queue, worker_loop, MAX_CONCURRENT_DOWNLOADS, JobState

app = FastAPI()

origins = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except:
                pass

manager = ConnectionManager()

APP_VERSION = "1.6.20"
GITHUB_REPO = "Echiiiro453/youtubeMusicDownload"

log_buffer = collections.deque(maxlen=500)

class LogInterceptor:
    def __init__(self, original_stream):
        self.original_stream = original_stream

    def write(self, text):
        self.original_stream.write(text)
        if text.strip():
            # Remove ANSI color codes for the web viewer
            clean_text = re.sub(r'\x1b\[[0-9;]*m', '', text)
            log_buffer.append(clean_text)

    def flush(self):
        self.original_stream.flush()

sys.stdout = LogInterceptor(sys.stdout)
sys.stderr = LogInterceptor(sys.stderr)

@app.get("/api/logs")
async def get_logs():
    return {"logs": list(log_buffer)}

@app.get("/version")
async def get_version():
    return {"version": APP_VERSION}

@app.get("/check_update")
async def check_update():
    import urllib.request
    import json
    try:
        req = urllib.request.Request(
            f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            latest_version = data.get("tag_name", "").replace("v", "")
            
            # Simple version comparison (assumes format x.y.z)
            current_parts = [int(p) for p in APP_VERSION.split(".")]
            latest_parts = [int(p) for p in latest_version.split(".")]
            
            update_available = False
            for i in range(max(len(current_parts), len(latest_parts))):
                c = current_parts[i] if i < len(current_parts) else 0
                l = latest_parts[i] if i < len(latest_parts) else 0
                if l > c:
                    update_available = True
                    break
                elif c > l:
                    break

            return {
                "update_available": update_available,
                "current_version": APP_VERSION,
                "latest_version": latest_version,
                "release_notes": data.get("body", "Sem notas de lançamento disponíveis."),
                "download_url": data.get("html_url", f"https://github.com/{GITHUB_REPO}/releases/latest")
            }
    except Exception as e:
        print(f"Update check failed: {e}")
        return {"update_available": False, "error": str(e)}
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def ws_broadcast_loop():
    while True:
        await asyncio.sleep(1)
        if manager.active_connections:
            jobs_data = {job_id: asdict(state) for job_id, state in jobs.items()}
            await manager.broadcast_json(jobs_data)

@app.on_event("startup")
async def startup_event():
    init_db()
    for _ in range(MAX_CONCURRENT_DOWNLOADS):
        asyncio.create_task(worker_loop())
    asyncio.create_task(ws_broadcast_loop())

class DownloadRequest(BaseModel):
    url: str
    quality: str = "best"
    format: str = "mp3"
    mode: str = "audio"
    playlist: bool = False
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    pitch: int = 0
    speed: float = 1.0
    title: Optional[str] = None
    artist: Optional[str] = None
    cover_path: Optional[str] = None
    browser_cookies: Optional[str] = None
    cookies_path: Optional[str] = None
    eq_preset: Optional[str] = None
    playlist_id: Optional[str] = None
    video_id: Optional[str] = None
    organize: bool = False

class InfoRequest(BaseModel):
    url: str
    limit: int = 50

class RetryRequest(BaseModel):
    playlist_id: str
    video_id: str

@app.get("/download/jobs")
async def get_all_jobs():
    return {job_id: asdict(state) for job_id, state in jobs.items()}

@app.get("/presets")
def get_presets():
    return {
        "defaults": [
            {'name': 'Nightcore', 'pitch': 3, 'speed': 1.15},
            {'name': 'Slowed + Reverb', 'pitch': -2, 'speed': 0.85},
            {'name': 'Daycore', 'pitch': -1, 'speed': 0.9},
            {'name': 'Double Time', 'pitch': 0, 'speed': 1.5},
            {'name': 'Half Time', 'pitch': 0, 'speed': 0.75}
        ],
        "custom": [] 
    }

@app.post("/info")
async def get_info(request: DownloadRequest):
    try:
        url = request.url
        is_magic = False
        magic_source = None
        if "spotify.com" in url or "music.apple.com" in url:
            if "spotify.com" in url:
                import re
                import json
                from curl_cffi import requests as cffi_requests
                # Extract Spotify ID
                spotify_id_match = re.search(r'/(track|album|playlist|episode)/([a-zA-Z0-9]+)', url)
                if spotify_id_match:
                    type_str = spotify_id_match.group(1)
                    item_id = spotify_id_match.group(2)
                    embed_url = f"https://open.spotify.com/embed/{type_str}/{item_id}"
                    
                    res = cffi_requests.get(embed_url, impersonate="chrome120")
                    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', res.text)
                    if match:
                        try:
                            data = json.loads(match.group(1))
                            entity = data['props']['pageProps']['state']['data']['entity']
                            title = entity.get('title') or entity.get('name') or ''
                            artist = ""
                            if 'artists' in entity and len(entity['artists']) > 0:
                                artist = entity['artists'][0].get('name', '')
                            
                            clean_title = f"{artist} {title}".strip()
                            url = f"ytsearch1:{clean_title} audio"
                            is_magic = True
                            magic_source = "Spotify"
                        except Exception as e:
                            print(f"Failed to parse Spotify embed: {e}")
            else:
                from curl_cffi import requests as cffi_requests
                res = cffi_requests.get(url, timeout=10, impersonate="chrome120")
                html = res.text
                import re
                title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
                if title_match:
                    clean_title = re.sub(r' \| Spotify.*', '', title_match.group(1))
                    clean_title = re.sub(r' on Apple Music.*', '', clean_title)
                    clean_title = clean_title.replace("Song ·", "").replace("Album ·", "")
                    url = f"ytsearch1:{clean_title} audio"
                    is_magic = True
                    magic_source = "Apple Music"

        ydl_opts = {
            'quiet': True,
            'nocheckcertificate': True,
            'extract_flat': 'in_playlist',
            'cookiefile': get_cookies_path(),
            'js_runtimes': {'node': {}},
            'remote_components': ['ejs:github']
        }
        
        info = None
        last_err = None
        for client in ['tv_embedded', 'web_embedded', 'ios_music', 'android_music', 'tv', 'web']:
            try:
                if client != 'web': ydl_opts['extractor_args'] = {'youtube': {'player_client': [client]}}
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                break
            except Exception as e: 
                last_err = str(e)
            
        if not info: 
            err_msg = "Falha ao extrair info."
            if last_err: err_msg += f" Detalhes: {last_err}"
            raise HTTPException(status_code=500, detail=err_msg)
            
        if is_magic and 'entries' in info:
            info = info['entries'][0]
            
        is_playlist = ('entries' in info or info.get('playlist_id')) and not is_magic 
        
        duration_str = info.get('duration_string')
        if not duration_str and info.get('duration'):
            import datetime
            duration_str = str(datetime.timedelta(seconds=info['duration']))
            if duration_str.startswith('0:'): duration_str = duration_str[2:] 

        resolutions = []
        if not is_magic:
            if is_playlist:
                resolutions = [2160, 1440, 1080, 720, 480, 360, 240, 144]
            else:
                formats = info.get('formats', [])
                res_set = set()
                for f in formats:
                    if f.get('vcodec') != 'none' and f.get('height'): res_set.add(f['height'])
                resolutions = sorted(list(res_set), reverse=True)

        return {
            "status": "success",
            "title": info['entries'][0].get('title') if ('entries' in info and 'v=' in request.url) else info.get('title'),
            "thumbnail": info.get('thumbnail'),
            "url": info.get('webpage_url', request.url),
            "resolutions": resolutions,
            "is_playlist": is_playlist,
            "duration": info.get('duration'),
            "duration_string": duration_str,
            "magic_source": magic_source
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/playlist/details")
def get_playlist_details(request: InfoRequest):
    try:
        ydl_opts = {
            'quiet': True,
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'extract_flat': 'in_playlist',
            'cookiefile': get_cookies_path(),
            'js_runtimes': {'node': {}},
            'remote_components': ['ejs:github']
        }
        if request.limit > 0: ydl_opts['playlistend'] = request.limit
        
        playlist_info = None
        for client in ['web_embedded', 'tv_embedded', 'web', 'android']:
            try:
                if client != 'web': ydl_opts['extractor_args'] = {'youtube': {'player_client': [client]}}
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    playlist_info = ydl.extract_info(request.url, download=False)
                break
            except Exception: pass
            
        if not playlist_info or 'entries' not in playlist_info:
            raise HTTPException(status_code=400, detail="URL não é uma playlist ou falhou")
            
        playlist_id = playlist_info.get('id', '')
        downloaded_ids = set(get_downloaded_ids(playlist_id)) if playlist_id else set()
        
        videos = []
        for idx, entry in enumerate(playlist_info['entries']):
            if entry is None: continue
            entry_id = entry.get('id', '')
            videos.append({
                "index": idx,
                "id": entry_id,
                "title": entry.get('title', 'Sem título'),
                "thumbnail": entry.get('thumbnail') or entry.get('thumbnails', [{}])[0].get('url'),
                "duration": entry.get('duration', 0),
                "uploader": entry.get('uploader', entry.get('channel', 'Desconhecido')),
                "url": entry.get('url') or entry.get('webpage_url') or f"https://www.youtube.com/watch?v={entry_id}",
                "status": 'downloaded' if entry_id in downloaded_ids else 'pending',
                "playlistIdRef": playlist_id
            })
            
        return {
            "status": "success",
            "playlist_id": playlist_id,
            "title": playlist_info.get('title', 'Playlist'),
            "total_videos": len(videos),
            "videos": videos
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@app.post("/download/retry")
async def retry_download(req: RetryRequest):
    rec = get_download_record(req.playlist_id, req.video_id)
    if not rec: raise HTTPException(status_code=404, detail="Não encontrado no histórico")
    mark_missing_db(req.playlist_id, req.video_id)
    url = rec.get("url") or f"https://www.youtube.com/watch?v={rec['video_id']}"
    
    dreq = DownloadRequest(url=url, playlist_id=req.playlist_id, video_id=req.video_id, title=rec.get("title"))
    job_id = str(uuid.uuid4())
    jobs[job_id] = JobState(id=job_id, status="queued", progress=0.0, created_at=time.time(), title=rec.get("title"))
    await download_queue.put((job_id, dreq))
    return {"status": "ok", "job_id": job_id}

@app.post("/download/enqueue")
@app.post("/download")
async def enqueue_download(req: DownloadRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = JobState(id=job_id, status="queued", progress=0.0, created_at=time.time(), title=req.title)
    await download_queue.put((job_id, req))
    return {"job_id": job_id}

@app.post("/download/cancel/{job_id}")
async def cancel_download(job_id: str):
    if job_id in jobs:
        jobs[job_id].status = "cancelled"
        jobs[job_id].error = "Cancelado pelo usuário"
        return {"job_id": job_id, "status": "cancelled"}
    raise HTTPException(status_code=404, detail="Job not found")

@app.get("/download/status/{job_id}")
async def get_download_status(job_id: str):
    st = jobs.get(job_id)
    if not st: raise HTTPException(status_code=404, detail="Not found")
    return asdict(st)

@app.post("/open_folder")
def open_folder():
    downloads_dir = get_downloads_dir()
    if os.path.exists(downloads_dir): os.startfile(downloads_dir)
    return {"status": "opened"}

@app.get("/auth_status")
def get_auth_status():
    cookie_path = get_cookies_path()
    return {"authenticated": bool(cookie_path and os.path.getsize(cookie_path) > 0)}

@app.post("/upload_cookies")
async def upload_cookies(file: UploadFile = File(...)):
    try:
        print(f"[Upload] Recebendo arquivo de cookies: {file.filename}")
        cookie_path = os.path.join(get_data_dir(), "cookies.txt")
        print(f"[Upload] Salvando em: {cookie_path}")
        
        with open(cookie_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        print("[Upload] Cookies salvos com sucesso!")
        return {"status": "success"}
    except Exception as e:
        print(f"[Upload] Erro ao salvar cookies: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no servidor: {str(e)}")

@app.get("/terms/status")
def get_terms_status():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT value FROM app_settings WHERE key = 'terms_accepted'")
        row = cur.fetchone()
        conn.close()
        return {"accepted": row['value'] == 'true' if row else False}
    except: return {"accepted": False}

@app.post("/terms/accept")
def accept_terms():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('terms_accepted', 'true')")
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/terms/content")
def get_terms_content():
    path = get_resource_path("TERMOS_DE_USO.txt")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f: return {"content": f.read()}
    return {"content": "Termos de Uso Padrão"}

@app.get("/api/settings/download_folder")
def get_download_folder():
    from utils import get_downloads_dir
    return {"folder": get_downloads_dir()}

@app.post("/api/settings/choose_folder")
def choose_folder():
    try:
        import webview
        if webview.windows:
            window = webview.windows[0]
            result = window.create_file_dialog(webview.FOLDER_DIALOG)
            if result and len(result) > 0:
                folder = result[0]
                conn = get_conn()
                cur = conn.cursor()
                cur.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('download_folder', ?)", (folder,))
                conn.commit()
                conn.close()
                return {"status": "ok", "folder": folder}
        return {"status": "error", "message": "Nenhuma janela ativa ou ação cancelada."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

static_dir = get_resource_path("static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
