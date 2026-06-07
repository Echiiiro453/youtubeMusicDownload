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

# EXPERIMENTAL: Forçando importação para o PyInstaller rastrear o Demucs/Shazam
try:
    import demucs
    import torch
    import torchaudio
    import shazamio
except ImportError:
    pass

# SECRET CLI INTERCEPT FOR DEMUCS:
# This allows the compiled AppMusica.exe to act as the "demucs" CLI
if len(sys.argv) > 1 and sys.argv[1] == "--run-demucs":
    import demucs.separate
    # Pass all arguments after --run-demucs to demucs
    # e.g. AppMusica.exe --run-demucs file.mp3 -n htdemucs_6s ...
    demucs.separate.main(sys.argv[2:])
    sys.exit(0)

import collections
from datetime import datetime
from urllib.request import Request as URLRequest, urlopen
import re
import yt_dlp
from dataclasses import asdict

from utils import get_base_dir, get_resource_path, get_data_dir, get_downloads_dir, get_cookies_path
from database import init_db, get_conn, get_downloaded_ids, mark_missing_db, get_download_record, sync_db_with_disk
from downloader import jobs, download_queue, worker_loop, MAX_CONCURRENT_DOWNLOADS, JobState
from urllib.parse import urlparse

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

APP_VERSION = "3.2.0"
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
    
    # Initialize download_sem from database so it respects the saved user settings on boot
    import downloader
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT value FROM app_settings WHERE key = 'concurrent_downloads'")
        row = cur.fetchone()
        conn.close()
        if row:
            value = max(1, min(8, int(row['value'])))
            downloader.download_sem = asyncio.Semaphore(value)
            print(f"[Startup] Concurrent downloads restored to {value}")
    except Exception as e:
        print(f"[Startup] Error loading concurrent downloads setting: {e}")

    for _ in range(20):
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
    query = request.query.strip()
    is_ytm = False
    if query.lower().startswith("music:"):
        is_ytm = True
        query = query[6:].strip()
    elif query.lower().startswith("ytm:"):
        is_ytm = True
        query = query[4:].strip()

    if is_ytm:
        try:
            import json
            from curl_cffi import requests as cffi_requests
            api_url = "https://music.youtube.com/youtubei/v1/search?prettyPrint=false"
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.apps.youtube.music/6.20.51 (Linux; U; Android 13; en_US) gzip"
            }
            payload = {
                "context": {
                    "client": {
                        "clientName": "ANDROID_MUSIC",
                        "clientVersion": "6.20.51",
                        "androidSdkVersion": 33,
                        "osName": "Android",
                        "osVersion": "13",
                    }
                },
                "query": query
            }
            res = cffi_requests.post(api_url, json=payload, headers=headers, impersonate="chrome120", timeout=10)
            if res.status_code == 200:
                data = res.json()
                results = []
                contents = data.get("contents", {}).get("tabbedSearchResultsRenderer", {}).get("tabs", [{}])[0].get("tabRenderer", {}).get("content", {}).get("sectionListRenderer", {}).get("contents", [])
                for section in contents:
                    if "musicShelfRenderer" in section:
                        items = section["musicShelfRenderer"].get("contents", [])
                        for item in items:
                            if "musicResponsiveListItemRenderer" in item:
                                info = item["musicResponsiveListItemRenderer"]
                                columns = info.get("flexColumns", [])
                                if len(columns) > 0:
                                    first_col = columns[0].get("musicResponsiveListItemFlexColumnRenderer", {}).get("text", {}).get("runs", [{}])[0]
                                    name = first_col.get("text", "Desconhecido")
                                    video_id = first_col.get("navigationEndpoint", {}).get("watchEndpoint", {}).get("videoId")
                                    if video_id:
                                        uploader = "YouTube Music"
                                        if len(columns) > 1:
                                            second_col_runs = columns[1].get("musicResponsiveListItemFlexColumnRenderer", {}).get("text", {}).get("runs", [])
                                            if second_col_runs:
                                                uploader = "".join([r.get("text", "") for r in second_col_runs])
                                        
                                        thumbnail = f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
                                        thumbnails = info.get("thumbnail", {}).get("musicThumbnailRenderer", {}).get("thumbnail", {}).get("thumbnails", [])
                                        if thumbnails:
                                            thumbnail = thumbnails[-1].get("url", thumbnail)
                                            
                                        results.append({
                                            "id": video_id,
                                            "title": name,
                                            "uploader": uploader,
                                            "duration_string": "",
                                            "url": f"https://music.youtube.com/watch?v={video_id}",
                                            "thumbnail": thumbnail,
                                            "view_count": 0
                                        })
                                        if len(results) >= request.limit:
                                            break
                        if len(results) >= request.limit:
                            break
                if results:
                    return {"results": results}
        except Exception as e:
            print(f"YT Music search failed: {e}. Falling back to yt-dlp.")

    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'cookiefile': get_cookies_path()
    }
    query_str = f"ytsearch{request.limit}:{query}"
    
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

import functools

@functools.lru_cache(maxsize=32)
def parse_magic_url(url: str):
    from magic_parsers import extract_magic_url
    res = extract_magic_url(url)
    if res:
        pseudo_playlist, is_magic, magic_source, cover_url, new_url = res
        return new_url, pseudo_playlist, is_magic, magic_source, cover_url
    return url, None, False, None, None
@app.post("/info")
async def get_info(request: DownloadRequest):
    try:
        url = request.url
        url, pseudo_playlist, is_magic, magic_source, magic_cover = await asyncio.to_thread(parse_magic_url, url)

        if pseudo_playlist:
            info = pseudo_playlist
            is_playlist = True
            is_magic = True
        else:
            # Prevent falling back to yt-dlp for raw Spotify/Apple Music URLs if magic parser failed
            if any(domain in url for domain in ['spotify.com', 'music.apple.com', 'deezer.com']) and not url.startswith('ytsearch'):
                raise HTTPException(status_code=400, detail="Não foi possível extrair dados deste serviço (verifique se a playlist é privada ou tente novamente mais tarde).")
                
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
        cur.execute("SELECT value FROM app_settings WHERE key = 'terms_accepted_v3'")
        row = cur.fetchone()
        conn.close()
        return {"accepted": row['value'] == 'true' if row else False}
    except: return {"accepted": False}

@app.post("/terms/accept")
def accept_terms():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('terms_accepted_v3', 'true')")
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/terms/content")
def get_terms_content():
    path = get_resource_path("TERMS.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f: return {"content": f.read()}
    return {"content": "Termos de Uso Padrão"}

@app.get("/api/settings/concurrent_downloads")
def get_concurrent_downloads():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT value FROM app_settings WHERE key = 'concurrent_downloads'")
        row = cur.fetchone()
        conn.close()
        return {"value": int(row['value']) if row else 2}
    except:
        return {"value": 2}

@app.post("/api/settings/concurrent_downloads")
def set_concurrent_downloads(body: dict):
    import downloader
    try:
        value = max(1, min(8, int(body.get("value", 2))))
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('concurrent_downloads', ?)", (str(value),))
        conn.commit()
        conn.close()
        # Update the live semaphore so it takes effect immediately without restart
        downloader.download_sem = asyncio.Semaphore(value)
        print(f"[Settings] Concurrent downloads updated to {value}")
        return {"status": "ok", "value": value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.post("/api/choose_file")
def choose_file():
    try:
        import webview
        if webview.windows:
            window = webview.windows[0]
            result = window.create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=('Audio Files (*.mp3;*.wav;*.m4a;*.flac)', 'All Files (*.*)')
            )
            if result and len(result) > 0:
                return {"status": "ok", "file": result[0]}
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

@app.get("/api/history")
def get_history(limit: int = 100, offset: int = 0):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT playlist_id, video_id, title, file_path, status, created_at, url
            FROM downloads
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?;
        """, (limit, offset))
        rows = cur.fetchall()
        cur.execute("SELECT COUNT(*) as total FROM downloads")
        total = cur.fetchone()["total"]
        conn.close()
        history = []
        for r in rows:
            history.append({
                "video_id": r["video_id"],
                "title": r["title"],
                "file_path": r["file_path"],
                "status": r["status"],
                "created_at": r["created_at"],
                "url": r["url"]
            })
        return {"history": history, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/history/{video_id}")
def delete_history_item(video_id: str):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM downloads WHERE video_id = ?", (video_id,))
        conn.commit()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FixMetadataRequest(BaseModel):
    file_path: str

@app.post("/api/fix_metadata")
def fix_metadata(request: FixMetadataRequest):
    try:
        from utils import get_downloads_dir
        from shazam_fixer import fix_metadata_sync
        
        abs_path = os.path.join(get_downloads_dir(), request.file_path)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
            
        result = fix_metadata_sync(abs_path)
        if result.get("success"):
            return {"status": "success", "data": result}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Erro desconhecido"))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import uuid
import re
from fastapi import BackgroundTasks

studio_jobs = {}
studio_install_jobs = {}

class StudioSplitRequest(BaseModel):
    file_path: str
    quality: str = "fast"
    model: str = "htdemucs_ft"
    two_stems: bool = True

def is_python_installed():
    import subprocess
    try:
        CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0
        subprocess.run(["python", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, creationflags=CREATE_NO_WINDOW, check=True)
        return True
    except Exception:
        return False
    
async def run_demucs_job(job_id: str, file_path: str, quality: str, model: str, two_stems: bool):
    try:
        from utils import get_downloads_dir, get_studio_dir
        import subprocess
        
        abs_path = os.path.join(get_downloads_dir(), file_path)
        if not os.path.exists(abs_path):
            studio_jobs[job_id].update({"status": "error", "message": "Arquivo original não encontrado.", "progress": 0})
            return
            
        studio_dir = get_studio_dir()
        CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0
        
        overlap = '0.25'
        shifts = '0'
        if quality == 'balanced':
            overlap = '0.50'
        elif quality == 'studio':
            overlap = '0.75'
            shifts = '2' # Aumentado de 1 para 2
        elif quality == 'ultra':
            overlap = '0.99'
            shifts = '4' # Aumentado de 2 para 4 para maior redução de ruído

        if getattr(sys, 'frozen', False):
            # PyInstaller mode: AppMusica.exe --run-demucs ...
            cmd_args = [sys.executable, '--run-demucs']
        else:
            # Source mode: python main.py --run-demucs ...
            main_script = os.path.abspath(sys.argv[0])
            cmd_args = [sys.executable, main_script, '--run-demucs']

        cmd_args.extend([
            abs_path, '-n', model, 
            '--overlap', overlap, 
            '-o', studio_dir, '--mp3', '--mp3-bitrate', '320'
        ])
        
        if two_stems:
            cmd_args.extend(['--two-stems', 'vocals'])

        if shifts != '0':
            cmd_args.extend(['--shifts', shifts])

        print(f"[\033[94mIA Studio\033[0m] Executando comando IA: {' '.join(cmd_args)}")

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=CREATE_NO_WINDOW
            )
        except FileNotFoundError:
            python_installed = is_python_installed()
            print("[\033[31mIA Studio\033[0m] ERRO: Demucs não encontrado no sistema.")
            studio_jobs[job_id].update({
                "status": "error", 
                "message": "Motor de IA (Demucs) não encontrado neste PC.", 
                "progress": 0,
                "demucs_missing": True,
                "python_missing": not python_installed
            })
            return
            
        print(f"[\033[94mIA Studio\033[0m] Iniciando separação para: {os.path.basename(abs_path)}")
        
        last_log_progress = -1
        buffer = ""
        while True:
            chunk = await process.stderr.read(1024)
            if not chunk:
                break
            text = chunk.decode(errors='replace')
            buffer += text
            
            # Keep buffer size in check
            if len(buffer) > 2048:
                buffer = buffer[-2048:]
            
            # Extract progress
            match_pct = re.findall(r'(\d+)%\|', buffer)
            if match_pct:
                progress = int(match_pct[-1])
                studio_jobs[job_id]["progress"] = progress
                studio_jobs[job_id]["status"] = "processing"
                
                # Check for elapsed time, ETA and speed in the buffer
                last_idx = buffer.rfind(f"{progress}%|")
                if last_idx != -1:
                    sub = buffer[last_idx:]
                    match_time = re.search(r'\[(\d+:\d+(?::\d+)?)\s*<\s*(\d+:\d+(?::\d+)?)\s*,\s*([^\]]+)\]', sub)
                    if match_time:
                        elapsed = match_time.group(1)
                        eta = match_time.group(2)
                        speed = match_time.group(3).strip()
                        
                        studio_jobs[job_id]["elapsed"] = elapsed
                        studio_jobs[job_id]["eta"] = eta
                        studio_jobs[job_id]["speed"] = speed
                        studio_jobs[job_id]["message"] = f"Separando faixas: {progress}% (Restante: {eta} @ {speed})"
                    else:
                        studio_jobs[job_id]["message"] = f"Separando faixas: {progress}%"
                else:
                    studio_jobs[job_id]["message"] = f"Separando faixas: {progress}%"
                
                if progress % 10 == 0 and progress != last_log_progress:
                    print(f"[\033[94mIA Studio\033[0m] Extraindo canais: {progress}%")
                    last_log_progress = progress
                
        await process.wait()
        
        if process.returncode != 0:
            print(f"[\033[31mIA Studio\033[0m] ERRO na separação: Código {process.returncode}")
            studio_jobs[job_id].update({"status": "error", "message": "Falha na separação da música.", "progress": 0})
        else:
            print(f"[\033[32mIA Studio\033[0m] SUCESSO! Separação concluída e salva na pasta Studio.")
            studio_jobs[job_id].update({"status": "success", "message": "Música separada por IA com sucesso!", "output_dir": studio_dir, "progress": 100})
            
    except Exception as e:
        print(f"[\033[31mIA Studio\033[0m] EXCEPTION: {e}")
        studio_jobs[job_id].update({"status": "error", "message": str(e), "progress": 0})

@app.post("/api/studio/split")
async def studio_split(request: StudioSplitRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    studio_jobs[job_id] = {
        "status": "starting",
        "progress": 0,
        "message": "Inicializando IA...",
        "file_path": request.file_path,
        "quality": request.quality,
        "model": request.model,
        "two_stems": request.two_stems,
        "eta": "",
        "speed": "",
        "elapsed": ""
    }
    background_tasks.add_task(run_demucs_job, job_id, request.file_path, request.quality, request.model, request.two_stems)
    return {"job_id": job_id}

@app.get("/api/studio/jobs")
def get_studio_all_jobs():
    return studio_jobs

@app.get("/api/studio/status/{job_id}")
def get_studio_status(job_id: str):
    if job_id not in studio_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return studio_jobs[job_id]

def install_ai_worker(job_id: str):
    try:
        import urllib.request
        import subprocess
        from utils import get_data_dir
        
        studio_jobs[job_id] = {"status": "processing", "progress": 10, "message": "Baixando Python (30 MB)..."}
        data_dir = get_data_dir()
        installer_path = os.path.join(data_dir, "python_installer.exe")
        
        # Download Python if not present
        if not os.path.exists(installer_path):
            urllib.request.urlretrieve("https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe", installer_path)
            
        studio_jobs[job_id] = {"status": "processing", "progress": 30, "message": "Instalando Python no sistema..."}
        
        # Install Python silently
        subprocess.run([installer_path, "/passive", "InstallAllUsers=0", "PrependPath=1", "Include_test=0"], check=True)
        
        studio_jobs[job_id] = {"status": "processing", "progress": 50, "message": "Instalando Motor de IA (Download de 2.5 GB, aguarde)..."}
        
        # Find Python executable
        local_app_data = os.environ.get('LOCALAPPDATA', '')
        python_exe = os.path.join(local_app_data, "Programs", "Python", "Python310", "python.exe")
        if not os.path.exists(python_exe):
            python_exe = "python" # fallback to path
            
        subprocess.run([python_exe, "-m", "pip", "install", "demucs"], check=True)
        
        studio_jobs[job_id] = {"status": "success", "progress": 100, "message": "Inteligência Artificial instalada com sucesso!"}
    except Exception as e:
        print(f"Erro na instalacao da IA: {e}")
        studio_jobs[job_id] = {"status": "error", "progress": 0, "message": f"Falha na instalação: {str(e)}"}

@app.post("/api/studio/install")
async def studio_install(background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    studio_jobs[job_id] = {"status": "starting", "progress": 0, "message": "Iniciando instalação..."}
    background_tasks.add_task(install_ai_worker, job_id)
    return {"job_id": job_id}

async def run_install_full(job_id: str):
    import subprocess
    import asyncio
    import urllib.request
    from utils import get_downloads_dir
    
    CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0
    studio_install_jobs[job_id] = {"status": "processing", "message": "Baixando instalador do Python 3.10..."}
    
    installer_path = os.path.join(get_downloads_dir(), "python_installer.exe")
    url = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe"
    try:
        urllib.request.urlretrieve(url, installer_path)
    except Exception as e:
        studio_install_jobs[job_id] = {"status": "error", "message": f"Erro ao baixar Python: {e}"}
        return

    studio_install_jobs[job_id]["message"] = "Instalando Python silenciosamente na pasta local...\nIsso não requer permissão de administrador."
    cmd_install = [installer_path, '/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_test=0']
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd_install, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=CREATE_NO_WINDOW
        )
        await proc.wait()
        if proc.returncode != 0:
            studio_install_jobs[job_id] = {"status": "error", "message": f"Falha ao instalar o Python. Código: {proc.returncode}"}
            return
    except Exception as e:
        studio_install_jobs[job_id] = {"status": "error", "message": f"Erro fatal ao instalar Python: {e}"}
        return

    studio_install_jobs[job_id]["message"] = "Python instalado com sucesso!\n\nIniciando download do Motor de IA (Demucs) (~2GB)..."
    
    # Python is installed in %LocalAppData%\Programs\Python\Python310\python.exe
    python_exe = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Programs', 'Python', 'Python310', 'python.exe')
    if not os.path.exists(python_exe):
        # Fallback to general 'python' just in case
        python_exe = "python"
        
    cmd_pip = [python_exe, '-m', 'pip', 'install', 'demucs']
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd_pip,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            creationflags=CREATE_NO_WINDOW
        )
    except FileNotFoundError:
        studio_install_jobs[job_id] = {"status": "error", "message": "Executável do Python não encontrado após instalação!"}
        return
        
    while True:
        line = await process.stdout.readline()
        if not line:
            break
        text = line.decode(errors='replace').strip()
        if text:
            studio_install_jobs[job_id]["message"] = text
    
    await process.wait()
    if process.returncode == 0:
        studio_install_jobs[job_id]["status"] = "success"
        studio_install_jobs[job_id]["message"] = "Inteligência Artificial instalada com sucesso!"
    else:
        studio_install_jobs[job_id]["status"] = "error"
        studio_install_jobs[job_id]["message"] = f"Erro na instalação da IA (código {process.returncode})."

@app.post("/api/studio/install_full")
async def studio_install_full(background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    studio_install_jobs[job_id] = {"status": "processing", "message": "Iniciando processo automatizado..."}
    background_tasks.add_task(run_install_full, job_id)
    return {"job_id": job_id}

async def run_install_demucs(job_id: str):
    import subprocess
    import asyncio
    CREATE_NO_WINDOW = 0x08000000 if os.name == 'nt' else 0
    cmd_args = ['python', '-m', 'pip', 'install', 'demucs']
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            creationflags=CREATE_NO_WINDOW
        )
    except FileNotFoundError:
        studio_install_jobs[job_id] = {"status": "error", "message": "O Python não está instalado neste computador! Instale o Python primeiro."}
        return
        
    while True:
        line = await process.stdout.readline()
        if not line:
            break
        text = line.decode(errors='replace').strip()
        if text:
            studio_install_jobs[job_id]["message"] = text
    
    await process.wait()
    if process.returncode == 0:
        studio_install_jobs[job_id]["status"] = "success"
        studio_install_jobs[job_id]["message"] = "Inteligência Artificial instalada com sucesso!"
    else:
        studio_install_jobs[job_id]["status"] = "error"
        studio_install_jobs[job_id]["message"] = f"Erro na instalação (código {process.returncode})."

@app.post("/api/studio/install")
async def studio_install(background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    studio_install_jobs[job_id] = {"status": "processing", "message": "Iniciando instalação do Demucs..."}
    background_tasks.add_task(run_install_demucs, job_id)
    return {"job_id": job_id}

@app.get("/api/studio/install/status/{job_id}")
def get_studio_install_status(job_id: str):
    if job_id not in studio_install_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return studio_install_jobs[job_id]

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
    artist = ""
    album = ""
    title = ""
    year = ""
    genre = ""
    file_size = 0
    try:
        file_size = os.path.getsize(abs_path)
    except:
        pass
    
    try:
        if ext == '.mp3':
            from mutagen.mp3 import MP3
            from mutagen.id3 import ID3
            audio = MP3(abs_path)
            try:
                tags = ID3(abs_path)
                if 'TPE1' in tags: artist = tags['TPE1'].text[0]
                if 'TALB' in tags: album = tags['TALB'].text[0]
                if 'TIT2' in tags: title = tags['TIT2'].text[0]
                if 'TDRC' in tags: year = str(tags['TDRC'].text[0])
                elif 'TYER' in tags: year = str(tags['TYER'].text[0])
                if 'TCON' in tags: genre = tags['TCON'].text[0]
            except: pass
            
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
            if 'artist' in audio: artist = audio['artist'][0]
            if 'album' in audio: album = audio['album'][0]
            if 'title' in audio: title = audio['title'][0]
            if 'date' in audio: year = audio['date'][0]
            if 'genre' in audio: genre = audio['genre'][0]
            
            if 'LYRICS' in audio:
                lyrics = audio['LYRICS'][0]
            if audio.pictures:
                cover_b64 = base64.b64encode(audio.pictures[0].data).decode('utf-8')
                mime_type = audio.pictures[0].mime
        elif ext in ('.m4a', '.aac', '.mp4'):
            from mutagen.mp4 import MP4
            audio = MP4(abs_path)
            if '\xa9ART' in audio: artist = audio['\xa9ART'][0]
            if '\xa9alb' in audio: album = audio['\xa9alb'][0]
            if '\xa9nam' in audio: title = audio['\xa9nam'][0]
            if '\xa9day' in audio: year = str(audio['\xa9day'][0])
            if '\xa9gen' in audio: genre = audio['\xa9gen'][0]
            
            if '\xa9lyr' in audio:
                lyrics = audio['\xa9lyr'][0]
            if 'covr' in audio and len(audio['covr']) > 0:
                pic = audio['covr'][0]
                cover_b64 = base64.b64encode(pic).decode('utf-8')
                mime_type = "image/png" if getattr(pic, 'imageformat', None) == 2 else "image/jpeg"
    except Exception as e:
        print(f"Error reading metadata from {file_path}: {e}")
        
    return {
        "lyrics": lyrics, 
        "cover_b64": cover_b64, 
        "mime_type": mime_type,
        "artist": artist,
        "album": album,
        "title": title,
        "year": year,
        "genre": genre,
        "file_size": file_size
    }

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
