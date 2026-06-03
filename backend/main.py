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
from database import init_db, get_conn, get_downloaded_ids, mark_missing_db, get_download_record, sync_db_with_disk
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

APP_VERSION = "2.0.0"
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
        
    def __getattr__(self, attr):
        return getattr(self.original_stream, attr)

sys.stdout = LogInterceptor(sys.stdout)
sys.stderr = LogInterceptor(sys.stderr)

@app.get("/api/logs")
async def get_logs():
    return {"logs": list(log_buffer)}

@app.get("/api/db/sync")
async def sync_db():
    """Syncs the DB with disk, marking deleted files as 'missing'."""
    from utils import get_downloads_dir
    result = sync_db_with_disk(get_downloads_dir())
    return {"status": "ok", **result}

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

class SearchRequest(BaseModel):
    query: str
    limit: int = 30

class RetryRequest(BaseModel):
    playlist_id: str
    video_id: str

@app.get("/download/jobs")
async def get_all_jobs():
    return {job_id: asdict(state) for job_id, state in jobs.items()}

@app.get("/presets")
def get_presets():
    custom_presets = []
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT value FROM app_settings WHERE key = 'custom_presets'")
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            import json
            custom_presets = json.loads(row[0])
    except:
        pass
        
    return {
        "defaults": [
            {'name': 'Nightcore', 'pitch': 3, 'speed': 1.15},
            {'name': 'Slowed + Reverb', 'pitch': -2, 'speed': 0.85},
            {'name': 'Daycore', 'pitch': -1, 'speed': 0.9},
            {'name': 'Double Time', 'pitch': 0, 'speed': 1.5},
            {'name': 'Half Time', 'pitch': 0, 'speed': 0.75}
        ],
        "custom": custom_presets
    }

class PresetData(BaseModel):
    name: str
    pitch: float
    speed: float
    eq: str = 'normal'

@app.post("/presets")
def save_preset(preset: PresetData):
    custom_presets = []
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT value FROM app_settings WHERE key = 'custom_presets'")
        row = cur.fetchone()
        if row and row[0]:
            import json
            custom_presets = json.loads(row[0])
            
        # Add new preset or update existing
        new_preset = {
            "name": preset.name,
            "pitch": preset.pitch,
            "speed": preset.speed,
            "eq": preset.eq
        }
        
        custom_presets = [p for p in custom_presets if p["name"] != preset.name]
        custom_presets.append(new_preset)
        
        import json
        cur.execute("""
            INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)
        """, ('custom_presets', json.dumps(custom_presets)))
        conn.commit()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search_youtube(request: SearchRequest):
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'cookiefile': get_cookies_path()
    }
    query_str = f"ytsearch{request.limit}:{request.query}"
    
    def perform_search(opts):
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(query_str, download=False)
            if 'entries' in info:
                results = []
                for entry in info['entries']:
                    if entry:
                        dur = entry.get('duration')
                        dur_str = f"{int(dur)//60}:{int(dur)%60:02d}" if dur else ""
                        results.append({
                            "id": entry.get('id'),
                            "title": entry.get('title'),
                            "uploader": entry.get('uploader'),
                            "duration_string": dur_str,
                            "url": entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                            "thumbnail": entry.get('thumbnail') or f"https://i.ytimg.com/vi/{entry.get('id')}/mqdefault.jpg",
                            "view_count": entry.get('view_count', 0)
                        })
                return {"results": results}
            return {"results": []}

    try:
        return perform_search(ydl_opts)
    except Exception as e:
        error_msg = str(e)
        if "does not look like a Netscape format cookies file" in error_msg or "cookie" in error_msg.lower():
            print(f"Cookie error in search, falling back without cookies: {error_msg}")
            ydl_opts.pop('cookiefile', None)
            try:
                return perform_search(ydl_opts)
            except Exception as e2:
                print(f"Fallback search error: {e2}")
                raise HTTPException(status_code=500, detail=str(e2))
        else:
            print(f"Search error: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)

def parse_magic_url(url: str):
    pseudo_playlist = None
    is_magic = False
    magic_source = None
    cover_url = None
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
                        
                        cover_art = ""
                        if 'coverArt' in entity and 'sources' in entity['coverArt'] and len(entity['coverArt']['sources']) > 0:
                            cover_art = entity['coverArt']['sources'][0].get('url', '')
                            cover_url = cover_art
                        elif 'visuals' in entity and 'avatarImage' in entity['visuals'] and 'sources' in entity['visuals']['avatarImage']:
                            cover_art = entity['visuals']['avatarImage']['sources'][0].get('url', '')
                            cover_url = cover_art

                        clean_title = f"{artist} {title}".strip()
                        track_list = entity.get('trackList', [])
                        
                        if track_list and len(track_list) > 1:
                            entries = []
                            for idx, t in enumerate(track_list):
                                t_title = t.get('title', '')
                                t_artist = t.get('subtitle', '')
                                sq = f"{t_artist} {t_title}".strip()
                                entries.append({
                                    'id': f"spotify_magic_{idx}",
                                    'url': f"ytsearch1:{sq} audio",
                                    'title': sq,
                                    'duration': 0,
                                    'thumbnail': cover_art
                                })
                            pseudo_playlist = {
                                'title': clean_title if clean_title else "Spotify Playlist",
                                'uploader': 'Spotify',
                                'entries': entries,
                                'thumbnail': cover_art
                            }
                            is_magic = True
                            magic_source = "Spotify"
                        else:
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
            clean_title = ""
            if title_match:
                clean_title = re.sub(r' \| Spotify.*', '', title_match.group(1))
                clean_title = re.sub(r' on Apple Music.*', '', clean_title)
                clean_title = clean_title.replace("Song ·", "").replace("Album ·", "").strip()
            
            matches = re.findall(r'"artistName":"([^"]+)".*?"name":"([^"]+)"', html)
            unique_m = []
            seen = set()
            for m in matches:
                if m not in seen:
                    seen.add(m)
                    unique_m.append(m)
                    
            if len(unique_m) > 1:
                entries = []
                for idx, m in enumerate(unique_m):
                    sq = f"{m[0]} {m[1]}".strip()
                    entries.append({
                        'id': f"apple_magic_{idx}",
                        'url': f"ytsearch1:{sq} audio",
                        'title': sq,
                        'duration': 0
                    })
                pseudo_playlist = {
                    'title': clean_title if clean_title else "Apple Music Playlist",
                    'uploader': 'Apple Music',
                    'entries': entries
                }
                is_magic = True
                magic_source = "Apple Music"
            elif clean_title:
                url = f"ytsearch1:{clean_title} audio"
                is_magic = True
                magic_source = "Apple Music"
    
    return url, pseudo_playlist, is_magic, magic_source, cover_url

@app.post("/info")
async def get_info(request: DownloadRequest):
    try:
        url = request.url
        url, pseudo_playlist, is_magic, magic_source, magic_cover = parse_magic_url(url)

        if pseudo_playlist:
            info = pseudo_playlist
            is_playlist = True
            is_magic = True
        else:
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
                    if "does not look like a Netscape format cookies file" in last_err or "cookie" in last_err.lower():
                        if 'cookiefile' in ydl_opts:
                            print(f"Cookie error in get_info, retrying without cookies: {last_err}")
                            ydl_opts.pop('cookiefile', None)
                            try:
                                with yt_dlp.YoutubeDL(ydl_opts) as ydl2:
                                    info = ydl2.extract_info(url, download=False)
                                break
                            except Exception as e2:
                                last_err = str(e2)
                
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
            "thumbnail": magic_cover or info.get('thumbnail'),
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
        url, pseudo_playlist, is_magic, magic_source, magic_cover = parse_magic_url(request.url)
        
        if pseudo_playlist:
            playlist_info = pseudo_playlist
        else:
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
                        playlist_info = ydl.extract_info(url, download=False)
                    break
                except Exception as e:
                    err_str = str(e)
                    if "does not look like a Netscape format cookies file" in err_str or "cookie" in err_str.lower():
                        if 'cookiefile' in ydl_opts:
                            print(f"Cookie error in playlist details, retrying without cookies: {err_str}")
                            ydl_opts.pop('cookiefile', None)
                            try:
                                with yt_dlp.YoutubeDL(ydl_opts) as ydl2:
                                    playlist_info = ydl2.extract_info(url, download=False)
                                break
                            except Exception: pass
                    pass
            
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
            "videos": videos,
            "magic_source": magic_source
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
    if not cookie_path or not os.path.exists(cookie_path) or os.path.getsize(cookie_path) == 0:
        return {"authenticated": False}
    
    # Valida o formato Netscape básico
    try:
        with open(cookie_path, 'r', encoding='utf-8') as f:
            content = f.read(1024)
            if "# Netscape HTTP Cookie File" in content or "# HTTP Cookie File" in content:
                return {"authenticated": True}
    except Exception:
        pass
        
    return {"authenticated": False}

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

class OpenExternalRequest(BaseModel):
    file_path: str

@app.post("/api/open_external")
def open_external(request: OpenExternalRequest):
    try:
        from utils import get_downloads_dir
        abs_path = os.path.join(get_downloads_dir(), request.file_path)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="File not found")
        if os.name == 'nt':
            os.startfile(abs_path)
        elif sys.platform == 'darwin':
            subprocess.call(('open', abs_path))
        else:
            subprocess.call(('xdg-open', abs_path))
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/library")
def get_library():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT playlist_id, video_id, title, file_path, created_at, url FROM downloads WHERE status = 'downloaded' ORDER BY created_at DESC;")
        rows = cur.fetchall()
        conn.close()
        library = []
        for r in rows:
            library.append({
                "playlist_id": r["playlist_id"],
                "video_id": r["video_id"],
                "title": r["title"],
                "file_path": r["file_path"],
                "created_at": r["created_at"],
                "url": r["url"]
            })
        return {"status": "success", "library": library}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/track_metadata")
def get_track_metadata(file_path: str):
    import base64
    from utils import get_downloads_dir
    abs_path = os.path.join(get_downloads_dir(), file_path)
    
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    ext = os.path.splitext(abs_path)[1].lower()
    lyrics = ""
    cover_b64 = ""
    mime_type = "image/jpeg"
    
    try:
        if ext == '.mp3':
            from mutagen.mp3 import MP3
            audio = MP3(abs_path)
            if audio.tags:
                for key in audio.tags.keys():
                    if key.startswith('USLT'):
                        lyrics = audio.tags[key].text
                    if key.startswith('APIC'):
                        cover_b64 = base64.b64encode(audio.tags[key].data).decode('utf-8')
                        mime_type = audio.tags[key].mime
        elif ext == '.flac':
            from mutagen.flac import FLAC
            audio = FLAC(abs_path)
            if 'LYRICS' in audio:
                lyrics = audio['LYRICS'][0]
            if audio.pictures:
                cover_b64 = base64.b64encode(audio.pictures[0].data).decode('utf-8')
                mime_type = audio.pictures[0].mime
        elif ext in ('.m4a', '.aac', '.mp4'):
            from mutagen.mp4 import MP4
            audio = MP4(abs_path)
            if '\xa9lyr' in audio:
                lyrics = audio['\xa9lyr'][0]
            if 'covr' in audio and len(audio['covr']) > 0:
                pic = audio['covr'][0]
                cover_b64 = base64.b64encode(pic).decode('utf-8')
                mime_type = "image/png" if getattr(pic, 'imageformat', None) == 2 else "image/jpeg"
    except Exception as e:
        print(f"Error reading metadata from {file_path}: {e}")
        
    return {"lyrics": lyrics, "cover_b64": cover_b64, "mime_type": mime_type}

from utils import get_downloads_dir
try:
    os.makedirs(get_downloads_dir(), exist_ok=True)
    app.mount("/downloads", StaticFiles(directory=get_downloads_dir()), name="downloads")
except Exception as e:
    print(f"Could not mount downloads dir: {e}")

static_dir = get_resource_path("static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
