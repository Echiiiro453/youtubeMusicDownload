from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import os
import subprocess
import re
import json
from datetime import datetime
from urllib.request import Request, urlopen
from fastapi.staticfiles import StaticFiles
import sys
import time
import os

# Helper for Persistence (EXE vs Script)
def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_data_dir():
    # 1. Android (Chaquopy)
    try:
        from com.chaquo.python import Python
        context = Python.getPlatform().getApplication()
        return str(context.getFilesDir().getAbsolutePath())
    except:
        pass
        
    # 2. Windows/Desktop (PyInstaller)
    if getattr(sys, 'frozen', False):
        base = os.path.dirname(sys.executable)
        # Se estiver em Program Files, use APPDATA para poder escrever
        if "Program Files" in base:
            appdata = os.environ.get('APPDATA')
            if appdata:
                path = os.path.join(appdata, "AppMusica")
                os.makedirs(path, exist_ok=True)
                return path
        return base
    
    # 3. Development
    return os.path.dirname(os.path.abspath(__file__))

def get_downloads_dir():
    # 1. Android
    try:
        from com.chaquo.python import Python
        from android.os import Environment
        return str(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).getAbsolutePath())
    except:
        pass
        
    # 2. Desktop (Saved in User Downloads if in Program Files, else relative)
    data_dir = get_data_dir()
    if "Program Files" in os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else False:
        user_home = os.path.expanduser("~")
        return os.path.join(user_home, "Downloads", "AppMusica")
        
    return os.path.join(data_dir, "downloads")

# Error categorization constants
TRANSIENT_ERRORS = (
    "rate-limited",
    "try again later",
    "HTTP Error 429",
    "temporarily unavailable",
    "network is unreachable",
)

LOGIN_ERRORS = (
    "Sign in required",
    "account problem",
    "private video",
)

FORMAT_ERRORS = (
    "Requested format is not available",
    "requested format is not available",
)

def is_match(err_msg: str, fragments) -> bool:
    return any(f.lower() in err_msg.lower() for f in fragments)

import sys
import time
import threading
import asyncio
import uuid
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, Tuple, Set
from dataclasses import dataclass, asdict
import sqlite3
from pathlib import Path

# ====== BANCO DE DADOS (PERSISTÊNCIA) ======
DB_PATH = os.path.join(get_data_dir(), "downloads.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS downloads (
                playlist_id TEXT,
                video_id    TEXT,
                title       TEXT,
                file_path   TEXT,
                status      TEXT,      -- downloaded, error
                created_at  REAL,
                url         TEXT,      -- Added for redownload
                PRIMARY KEY (playlist_id, video_id)
            );
        """)
        
        # Table for general settings (acceptance of terms, etc)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key     TEXT PRIMARY KEY,
                value   TEXT
            );
        """)

        # Migration for existing tables (safe add column)
        try:
            cur.execute("ALTER TABLE downloads ADD COLUMN url TEXT;")
        except: 
            pass # Column likely exists
            
        conn.commit()
        conn.close()
        print("Banco de dados SQLite inicializado.")
    except Exception as e:
        print(f"Erro ao inicializar DB: {e}")

def mark_downloaded_db(playlist_id: str, video_id: str, title: str, file_path: str, url: str = None):
    if not playlist_id or not video_id: return
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO downloads
            (playlist_id, video_id, title, file_path, status, created_at, url)
            VALUES (?, ?, ?, ?, 'downloaded', ?, ?);
        """, (playlist_id, video_id, title, file_path, time.time(), url))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Erro ao salvar no DB: {e}")

def mark_error_db(playlist_id: str, video_id: str, title: str, error_msg: str):
    if not playlist_id or not video_id: return
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            INSERT OR REPLACE INTO downloads
            (playlist_id, video_id, title, file_path, status, created_at)
            VALUES (?, ?, ?, '', ?, ?);
        """, (playlist_id, video_id, title, f"error:{error_msg[:180]}", time.time()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Erro ao salvar erro no DB: {e}")

def get_downloaded_ids(playlist_id: str) -> list[str]:
    if not playlist_id: return []
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT video_id FROM downloads
            WHERE playlist_id = ? AND status = 'downloaded';
        """, (playlist_id,))
        rows = cur.fetchall()
        conn.close()
        return [r["video_id"] for r in rows]
    except:
        return []

def mark_missing_db(playlist_id: str, video_id: str):
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            UPDATE downloads
            SET status = 'missing'
            WHERE playlist_id = ? AND video_id = ?;
        """, (playlist_id, video_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Erro ao marcar missing: {e}")

def get_download_record(playlist_id: str, video_id: str) -> dict:
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT playlist_id, video_id, title, url
            FROM downloads
            WHERE playlist_id = ? AND video_id = ?;
        """, (playlist_id, video_id))
        row = cur.fetchone()
        conn.close()
        return dict(row) if row else None
    except:
        return None

# WebSocket removed as we use polling


app = FastAPI()

# ====== CONFIGURAÇÃO DE CONCORRÊNCIA ======
MAX_CONCURRENT_DOWNLOADS = 4
download_queue: asyncio.Queue = asyncio.Queue()
download_sem = asyncio.Semaphore(MAX_CONCURRENT_DOWNLOADS)

# ====== ESTRUTURA DE ESTADO DO JOB ======
@dataclass
class JobState:
    id: str
    status: str              # queued | running | downloading | processing | done | error
    progress: float          # 0..100
    title: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None
    created_at: float = 0.0
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    last_update: float = 0.0
    last_update: float = 0.0  # For throttling notifications

# Dicionário global que armazena o estado de todos os jobs
jobs: Dict[str, JobState] = {}

# Lock for concurrent duplicates
download_lock = threading.Lock()
active_downloads = set()


# CONFIGURAÇÃO CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "*" # Debug
]

# DEBUG: Middleware para logar todas as requisições
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"REQUEST: {request.method} {request.url}")
    return await call_next(request)

# DEBUG: Imprimir rotas no startup
@app.on_event("startup")
async def startup_event():
    print("\n=== ROTAS REGISTRADAS ===")
    for route in app.routes:
        print(f"Reviewing route: {route.__class__.__name__} -> {getattr(route, 'path', 'No Path')}")
    print("=========================\n")
    init_db() # Initialize SQLite DB

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    import traceback
    error_msg = f"VALIDATION ERROR: {exc.errors()}\n"
    print(error_msg)
    try:
        with open(os.path.join(get_base_dir(), "debug_validation.txt"), "w", encoding="utf-8") as f:
            f.write(error_msg)
    except:
        pass
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

from typing import Optional

# Polling Endpoint (Replaces WebSocket)
@app.get("/download/jobs")
async def get_all_jobs():
    """Return current state of all jobs for polling"""
    return {job_id: asdict(state) for job_id, state in jobs.items()}

# Legacy notification (No-op now since we use polling)
async def notify_job_update(job_id: str):
    pass


# Modelos
class DownloadRequest(BaseModel):
    url: str
    quality: str = "best"
    format: str = "mp3"
    mode: str = "audio"
    playlist: bool = False
    start_time: Optional[str] = None # "00:00"
    end_time: Optional[str] = None   # "00:00"
    pitch: int = 0         # -12 to +12
    speed: float = 1.0     # 0.5 to 2.0
    title: Optional[str] = None
    artist: Optional[str] = None
    cover_path: Optional[str] = None
    browser_cookies: Optional[str] = None # 'firefox', 'chrome', 'safari', 'edge'
    cookies_path: Optional[str] = None # Path to specific cookies.txt
    eq_preset: Optional[str] = None # 'bass', 'soft', 'treble', 'vocal'
    playlist_id: Optional[str] = None # ID da playlist para persistência
    video_id: Optional[str] = None    # ID do vídeo para persistência

class InfoRequest(BaseModel):
    url: str
    limit: int = 50

EQ_PRESETS = {
    'bass': 'equalizer=f=60:width_type=h:width=50:g=10',
    'soft': 'equalizer=f=1000:width_type=h:width=200:g=-5',
    'treble': 'equalizer=f=14000:width_type=h:width=1000:g=10',
    'vocal': 'equalizer=f=3000:width_type=h:width=1000:g=5'
}

# Configurar PATH para ffmpeg embutido
if getattr(sys, 'frozen', False):
    if hasattr(sys, '_MEIPASS'):
        resource_dir = sys._MEIPASS
    else:
        resource_dir = os.path.join(os.path.dirname(sys.executable), '_internal')
    
    # Add to system PATH for subprocesses (yt-dlp finding ffmpeg)
    os.environ["PATH"] += os.pathsep + resource_dir

def parse_time(time_str):
    if not time_str or time_str.strip() == "": return None
    try:
        parts = list(map(int, time_str.split(':')))
        if len(parts) == 1: return parts[0] # Seconds
        if len(parts) == 2: return parts[0] * 60 + parts[1] # MM:SS
        if len(parts) == 3: return parts[0] * 3600 + parts[1] * 60 + parts[2] # HH:MM:SS
    except:
        return None
    return None

# Globais para progresso
current_progress = {
    "percent": 0,
    "status": "idle"
}
main_event_loop = None

def progress_hook(d):
    global current_progress
    if d['status'] == 'downloading':
        try:
            p = d.get('_percent_str', '0%').replace('%','')
            current_progress['percent'] = float(p)
            current_progress['status'] = 'downloading'
        except:
            pass
    elif d['status'] == 'finished':
        current_progress['percent'] = 100
        current_progress['status'] = 'processing'

# Helper for Persistence (EXE vs Script)


HISTORY_FILE = os.path.join(get_data_dir(), 'history.json')

def get_cookies_path():
    # 1. User provided (dist/cookies.txt)
    user_path = os.path.join(get_data_dir(), 'cookies.txt')
    if os.path.exists(user_path):
        return user_path
    
    # 2. Bundled (sys._MEIPASS/cookies.txt)
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        bundled_path = os.path.join(sys._MEIPASS, 'cookies.txt')
        if os.path.exists(bundled_path):
            return bundled_path
            
    return None

def load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_to_history(item):
    history = load_history()
    # Add timestamp
    item['timestamp'] = datetime.now().isoformat()
    # Prepend new item
    history.insert(0, item)
    # Keep last 50
    history = history[:50]
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

# Rotas


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

@app.post("/presets")
def save_preset(request: dict):
    # Dummy save for now, logic to be implemented if file persistence is needed
    return {"status": "success"}

@app.post("/info")
async def get_info(request: DownloadRequest):
    try:
        url = request.url
        is_magic = False
        magic_source = None

        # Spotify/Apple Music "Magic Search" Logic
        if "spotify.com" in url or "music.apple.com" in url:
            try:
                print(f"Detectando Magic Search para: {url}")
                
                # Fetch Page Title
                # Note: verify ssl=False implicit in some envs or handle if needed
                req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                html = urlopen(req).read().decode('utf-8')
                
                # Extract Title Regex
                title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
                if title_match:
                    page_title = title_match.group(1)
                    # Clean title (remove " | Spotify", " on Apple Music", etc)
                    clean_title = re.sub(r' \| Spotify.*', '', page_title)
                    clean_title = re.sub(r' on Apple Music.*', '', clean_title)
                    # Remove common prefixes
                    clean_title = clean_title.replace("Song ·", "").replace("Album ·", "")
                    
                    # Convert to YouTube Search
                    # "Song - Artist" -> "ytsearch1:Song Artist audio"
                    url = f"ytsearch1:{clean_title} audio"
                    is_magic = True
                    magic_source = "Spotify" if "spotify.com" in request.url else "Apple Music"
                    print(f"Convertido para: {url}")
            except Exception as e:
                print(f"Erro no Magic Search: {e}")
                # Fallback to normal URL (will likely fail in yt-dlp but we try)

        ydl_opts = {
            'quiet': False, # Logs ativados
            'nocheckcertificate': True,
            'ignoreerrors': False, # Mostrar erro real
            'no_warnings': False,
            'js_runtimes': {'node': {'executable': r'C:\Program Files\nodejs\node.exe'}},
            'noplaylist': False,  # Allow playlist detection
            'extract_flat': 'in_playlist', # Fast extraction for playlists
            'cookiefile': get_cookies_path(),
            'no_overwrites': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['tv'],
                }
            }
        }
        
        # If Magic Search, we need full info to return the first result
        # 'extract_flat' is often used for speed but for search we need details
        
        # Try multiple clients to bypass Age Gates / Bot Detection / 403 Errors
        clients = ['tv', 'android', 'ios', 'web']
        success = False
        last_error = None
        
        for client in clients:
            try:
                print(f"Tentando extração com cliente: {client}")
                if client == 'web':
                     # 'web' means default behavior (no specific player_client arg)
                     if 'extractor_args' in ydl_opts:
                         del ydl_opts['extractor_args']
                else:
                     ydl_opts['extractor_args'] = {'youtube': {'player_client': [client]}}
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                
                success = True
                break # If successful, stop trying
            except Exception as e:
                print(f"Falha com cliente '{client}': {e}")
                last_error = e
                time.sleep(2) # Aguardar possível liberação de arquivo (WinError 32)
        
        if not success:
             print("Todas as tentativas de cliente falharam.")
             if last_error:
                 raise last_error

        # Handle Search Results
        if is_magic and 'entries' in info:
            try:
                info = info['entries'][0]
            except IndexError:
                raise HTTPException(status_code=404, detail="Música não encontrada no YouTube.")
            
        # Detect if it's a playlist (either a full list or a video inside a list)
        is_playlist = ('entries' in info or info.get('playlist_id')) and not is_magic 
        
        # Duration String Logic
        duration_str = info.get('duration_string')
        if not duration_str and info.get('duration'):
            import datetime
            duration_str = str(datetime.timedelta(seconds=info['duration']))
            if duration_str.startswith('0:'): duration_str = duration_str[2:] 

        # Extract resolutions
        resolutions = []
        if not is_magic:
            formats = info.get('formats', [])
            
            # If playlist, formats might be in the first entry
            if not formats and is_playlist and 'entries' in info and info['entries']:
                 first_entry = info['entries'][0]
                 formats = first_entry.get('formats', [])
                 
                 # if still no formats (due to flat extraction), fetch explicit info for first video
                 if not formats:
                     try:
                         first_url = first_entry.get('url') or first_entry.get('webpage_url')
                         if first_url:
                             # Use a new YDL instance to avoid conflicts and ensure full extraction
                             with yt_dlp.YoutubeDL({'quiet':True, 'noplaylist': True}) as ydl_temp:
                                 v_info = ydl_temp.extract_info(first_url, download=False)
                                 formats = v_info.get('formats', [])
                     except:
                         pass

            res_set = set()
            for f in formats:
                if f.get('vcodec') != 'none' and f.get('height'):
                    res_set.add(f['height'])
            resolutions = sorted(list(res_set), reverse=True)

        return {
            "status": "success",
            "title": info['entries'][0].get('title') if ('entries' in info and 'v=' in request.url) else info.get('title'),
            "thumbnail": info.get('thumbnail'),
            "url": info.get('webpage_url', request.url), # Return resolved URL
            "resolutions": resolutions,
            "is_playlist": is_playlist,
            "duration": info.get('duration'),
            "duration_string": duration_str,
            "magic_source": magic_source
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        error_msg = f"ERROR in /info: {str(e)}\n\n{traceback.format_exc()}"
        print(error_msg)
        try:
             with open(os.path.join(get_base_dir(), "debug_info.txt"), "w", encoding="utf-8") as f:
                f.write(error_msg)
        except:
             pass

        print(f"Erro ao obter info: {e}")
        if "spotify.com" in request.url:
             raise HTTPException(status_code=400, detail="Não foi possível ler este link do Spotify. Tente colar o nome da música.")
        raise HTTPException(status_code=500, detail=str(e))

# Novo endpoint para detalhes de playlist
# Este código deve ser adicionado ao main.py após o endpoint /info (linha ~298)

@app.post("/playlist/details")
def get_playlist_details(request: InfoRequest):
    """
    Retorna lista detalhada de todos os vídeos em uma playlist
    """
    try:
        url = request.url
        
        ydl_opts = {
            'quiet': False,
            'nocheckcertificate': True,
            'ignoreerrors': True,  # Continue mesmo se algum vídeo falhar
            'no_warnings': False,
            'js_runtimes': {'node': {}},
            'extract_flat': 'in_playlist',  # Extração rápida
            'cookiefile': get_cookies_path(),
            'no_overwrites': True,
        }

        if request.limit > 0:
            ydl_opts['playlistend'] = request.limit
        
        # Tentar diferentes clientes
        clients = ['web', 'android', 'tv']
        success = False
        playlist_info = None
        
        for client in clients:
            try:
                print(f"Fetching playlist with client: {client}")
                if client == 'web':
                    if 'extractor_args' in ydl_opts:
                        del ydl_opts['extractor_args']
                else:
                    ydl_opts['extractor_args'] = {'youtube': {'player_client': [client]}}
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    playlist_info = ydl.extract_info(url, download=False)
                
                success = True
                break
            except Exception as e:
                print(f"Failed with client '{client}': {e}")
                continue
        
        if not success or not playlist_info:
            raise HTTPException(status_code=500, detail="Falha ao carregar playlist")
        
        # Verificar se é realmente uma playlist
        if 'entries' not in playlist_info:
            raise HTTPException(status_code=400, detail="URL não é uma playlist")
        
        # Obter IDs já baixados desta playlist
        playlist_id = playlist_info.get('id', '')
        downloaded_ids = set(get_downloaded_ids(playlist_id)) if playlist_id else set()
        
        # Processar vídeos
        videos = []
        for idx, entry in enumerate(playlist_info['entries']):
            if entry is None:  # Vídeo privado/deletado
                continue
            
            entry_id = entry.get('id', '')
            status = 'downloaded' if entry_id in downloaded_ids else 'pending'
            
            # Formatar duração
            duration = entry.get('duration', 0)
            duration_str = entry.get('duration_string', '0:00')
            if not duration_str and duration:
                import datetime
                duration_str = str(datetime.timedelta(seconds=duration))
                if duration_str.startswith('0:'):
                    duration_str = duration_str[2:]
            
            videos.append({
                "index": idx,
                "id": entry_id,
                "title": entry.get('title', 'Sem título'),
                "thumbnail": entry.get('thumbnail') or entry.get('thumbnails', [{}])[0].get('url'),
                "duration": duration,
                "duration_string": duration_str,
                "uploader": entry.get('uploader', entry.get('channel', 'Desconhecido')),
                "url": entry.get('url') or entry.get('webpage_url') or f"https://www.youtube.com/watch?v={entry_id}",
                "status": status, # 'downloaded' or 'pending'
                "playlistIdRef": playlist_id # Reference for retry
            })
        
        return {
            "status": "success",
            "playlist_id": playlist_id,
            "title": playlist_info.get('title', 'Playlist'),
            "total_videos": len(videos),
            "downloaded_count": len([v for v in videos if v['status'] == 'downloaded']), # Info extra
            "uploader": playlist_info.get('uploader', playlist_info.get('channel', 'Desconhecido')),
            "videos": videos
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        error_msg = f"ERROR in /playlist/details: {str(e)}\n\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/progress")
def get_progress():
    return current_progress

@app.post("/open_folder")
def open_folder():
    downloads_dir = os.path.join(os.getcwd(), "downloads")
    if os.path.exists(downloads_dir):
        os.startfile(downloads_dir)
    return {"status": "opened"}

# ====== CONCURRENT DOWNLOAD SYSTEM ======

def build_ydl_opts(job_id: str, request: DownloadRequest) -> Dict[str, Any]:
    def progress_hook(d: Dict[str, Any]):
        st = jobs.get(job_id)
        if not st: return

        if d.get("status") == "downloading":
            st.status = "downloading"
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            downloaded = d.get("downloaded_bytes") or 0
            if total > 0:
                st.progress = round(downloaded * 100 / total, 1)
            
            info = d.get("info_dict", {})
            if info.get("title") and not st.title:
                st.title = info["title"]

        elif d.get("status") == "finished":
            st.status = "processing"
            st.progress = 100.0

    # Reusing existing logic for paths and options
    downloads_dir = get_downloads_dir()
    os.makedirs(downloads_dir, exist_ok=True)
    
    # Resource Path
    resource_dir = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        if hasattr(sys, '_MEIPASS'):
            resource_dir = sys._MEIPASS
        else:
            resource_dir = os.path.join(os.path.dirname(sys.executable), '_internal')

    format_str = 'bestaudio/best'
    postprocessors = []

    if request.mode == 'video':
        # SPEED OPTIMIZATION: Prefer MP4 containers directly (avoids complex mkv muxing sometimes)
        format_str = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        
        if request.quality == '4k':
             # 4k often requires webm/mkv for VP9/AV1, so we keep flexible but prefer mp4 if avail
            format_str = 'bestvideo[height>=2160]+bestaudio/best'
        elif request.quality.endswith('p') and request.quality[:-1].isdigit():
            height = int(request.quality[:-1])
            # Strict height cap, prefer efficient codecs
            format_str = f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best[height<={height}]'
        
        postprocessors.append({'key': 'FFmpegThumbnailsConvertor', 'format': 'jpg'})
        postprocessors.append({'key': 'EmbedThumbnail'})
        postprocessors.append({'key': 'FFmpegMetadata'})

    else:
        # ====== OTIMIZAÇÃO MÚSICA (AUDIO-ONLY) ======
        # Baixa apenas o stream de áudio (muito mais rápido que vídeo+audio)
        format_str = 'bestaudio/best'
        
        # Add FFmpeg extract audio post-processor
        # Configuração Otimizada para velocidade vs qualidade
        audio_extract = {
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192', # Default high quality
        }
        
        if request.quality == 'flac':
             audio_extract['preferredcodec'] = 'flac'
             format_str = 'bestaudio/best' # FLAC needs good source
        elif request.quality == 'best': 
             audio_extract['preferredcodec'] = 'm4a'
             format_str = 'bestaudio[ext=m4a]/best'
        elif request.quality == 'medium':
             audio_extract['preferredcodec'] = 'mp3'
             audio_extract['preferredquality'] = '128'
        elif request.quality == 'high':
             audio_extract['preferredcodec'] = 'mp3'
             audio_extract['preferredquality'] = '192'
        else: # Ultra / Default
             audio_extract['preferredcodec'] = 'mp3'
             audio_extract['preferredquality'] = '320' # VBR 0 (~245kbps avg) or CBR 320
             
             # Se for mp3, usar VBR '5' se o usuário não pediu 320 explicito?
             # O usuário sugeriu "preferredquality": "5" (VBR), mas 320 é CBR. 
             # Vamos manter o mapeamento de qualidade existente para consistência mas com codec certo.
             if request.quality == 'ultra':
                 audio_extract['preferredquality'] = '320'

        postprocessors.append(audio_extract)
        
        # Embed Metadata & Cover
        postprocessors.append({'key': 'FFmpegThumbnailsConvertor', 'format': 'jpg'})
        postprocessors.append({'key': 'EmbedThumbnail'})
        postprocessors.append({'key': 'FFmpegMetadata'})
        
        # Force single thread for FFmpeg to prevent CPU contention with download threads
        # ydl_opts['postprocessor_args'] = {'FFmpegExtractAudio': ['-threads', '0']} # Auto defaults to 0 usually, but making explicit if needed


    # Audio Filters
    postprocessor_args = {}
    af_filters = []
    if request.pitch != 0 or request.speed != 1.0:
         pitch_factor = 2 ** (request.pitch / 12.0)
         new_rate = int(44100 * pitch_factor)
         required_atempo = request.speed / pitch_factor
         atempos = []
         while required_atempo > 2.0:
             atempos.append(2.0)
             required_atempo /= 2.0
         while required_atempo < 0.5:
             atempos.append(0.5)
             required_atempo /= 0.5
         atempos.append(required_atempo)
         af_filters.append(f"asetrate={new_rate}")
         for t in atempos: af_filters.append(f"atempo={t}")
         af_filters.append("aresample=44100")

    if request.eq_preset and request.eq_preset in EQ_PRESETS:
         af_filters.append(EQ_PRESETS[request.eq_preset])

    if af_filters:
         postprocessor_args = {'ffmpeg': ['-af', ",".join(af_filters)]}

    # Custom Logger to avoid file spam
    class NopLogger:
        def debug(self, msg): pass
        def warning(self, msg): pass
        def error(self, msg): pass

    # Hook local para capturar progresso deste job específico e notificar WS
    def local_progress_hook(d):
        if d['status'] == 'downloading':
            try:
                p = d.get('_percent_str', '0%').replace('%','')
                
                # Atualizar JobState global
                if job_id in jobs:
                    jobs[job_id].status = 'downloading'
                    try:
                        jobs[job_id].progress = float(p)
                    except:
                        pass
                    jobs[job_id].title = d.get('info_dict', {}).get('title') or jobs[job_id].title
                    
                    # Notificar WebSocket - REMOVED (Polling strategy)
                    # if main_event_loop:
                    #     asyncio.run_coroutine_threadsafe(notify_job_update(job_id), main_event_loop)
            except Exception as e:
                print(f"Hook error: {e}")
        elif d['status'] == 'finished':
            if job_id in jobs:
                jobs[job_id].progress = 100
                jobs[job_id].status = 'processing'
                # if main_event_loop:
                #     asyncio.run_coroutine_threadsafe(notify_job_update(job_id), main_event_loop)

    ydl_opts = {
        # ANTI-RATE-LIMIT (300+ OK)
        "sleep_requests": 1,
        "sleep_interval": 5,
        "max_sleep_interval": 15,

        'format': format_str,
        'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
        'quiet': False, 
        'logger': NopLogger(),
        'nocheckcertificate': True,
        'ignoreerrors': False, 
        'no_warnings': False, 
        'writethumbnail': True, 
        'ffmpeg_location': resource_dir, 
        'postprocessors': postprocessors,
        'postprocessor_args': postprocessor_args,
        'progress_hooks': [local_progress_hook],
        'noplaylist': not request.playlist,
        'merge_output_format': 'mp4' if request.mode == 'video' else None,
        'js_runtimes': {'node': {}}, 
        'extract_flat': False,
        'cookiefile': get_cookies_path(),
        'no_overwrites': True,
        'extractor_args': {'youtube': {'player_client': ['tv']}}
    }
    
    # Ranges
    start_sec = parse_time(request.start_time)
    end_sec = parse_time(request.end_time)
    if start_sec is not None or end_sec is not None:
        def range_func(info_dict, ydl):
            return [{'start_time': start_sec, 'end_time': end_sec}]
        ydl_opts['download_ranges'] = range_func
        ydl_opts['force_keyframes_at_cuts'] = True

    # Cover path overrides
    if request.cover_path and os.path.exists(request.cover_path):
        ydl_opts['writethumbnail'] = False
        postprocessors = [p for p in postprocessors if p.get('key') != 'EmbedThumbnail']
        ydl_opts['postprocessors'] = postprocessors

    # Remove legacy concurrent fragments and retries from here as they will be set per strategy
    # ydl_opts['concurrent_fragments'] = 8  # Moved to apply_common
    
    return ydl_opts

def apply_common_yt_dlp_options(ydl_opts, job_id, request):
    """Enriches the base ydl_opts with common settings like output path, logger, etc."""
    downloads_dir = get_downloads_dir()
    os.makedirs(downloads_dir, exist_ok=True)
    
    # Resource Path
    resource_dir = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        if hasattr(sys, '_MEIPASS'):
            resource_dir = sys._MEIPASS
        else:
            resource_dir = os.path.join(os.path.dirname(sys.executable), '_internal')
            
    # Common Options
    common_opts = {
        'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
        'quiet': False,
        'nocheckcertificate': True,
        'ignoreerrors': False,
        'no_warnings': False,
        'writethumbnail': True,
        'ffmpeg_location': resource_dir,
        'js_runtimes': {'node': {'executable': r'C:\Program Files\nodejs\node.exe'}}, 
        'noplaylist': True,
        'no_overwrites': True,
        'retries': 5,
        'fragment_retries': 3,
        'sleep_requests': 1,
        'sleep_interval': 2,
        'max_sleep_interval': 6,
    }
    
    ydl_opts.update(common_opts)
    
    # Ranges
    start_sec = parse_time(request.start_time)
    end_sec = parse_time(request.end_time)
    if start_sec is not None or end_sec is not None:
        def range_func(info_dict, ydl):
            return [{'start_time': start_sec, 'end_time': end_sec}]
        ydl_opts['download_ranges'] = range_func
        ydl_opts['force_keyframes_at_cuts'] = True

    # Post Processors handling for Metadata/Cover
    # (Re-use existing logic logic for postprocessors construction based on request)
    # Ideally we should extract the postprocessor construction logic to a helper too, 
    # but for now we will assume the caller 'build_ydl_opts_for_strategy' or the loop handles it.
    # To keep it simple, we will reuse the logic from the old 'build_ydl_opts' BUT 
    # since that function was doing EVERYTHING, we need to be careful.
    
    # LET'S RE-IMPLEMENT A LIGHTWEIGHT HELPER FOR POSTPROCESSORS
    postprocessors = []
    postprocessor_args = {}
    
    # ... (Logic for Audio/Video filters would go here, effectively duplicating or moving it)
    # For safely refactoring, let's keep build_ydl_opts as a 'base builder' but strip the strategy parts
    pass 

def build_ydl_opts_for_strategy(job_id: str, request, strategy: dict):
    # Base options for this strategy
    ydl_opts = {
        'format': strategy['format'],
        'concurrent_fragments': 4, # Less aggressive to avoid rate limits during retries
    }
    
    # Cookies
    if strategy.get("use_cookies") and request.cookies_path:
        ydl_opts["cookiefile"] = request.cookies_path
    elif strategy.get("use_cookies") and get_cookies_path():
        ydl_opts["cookiefile"] = get_cookies_path()
        
    # Client
    client = strategy.get("client")
    if client:
        ydl_opts.setdefault("extractor_args", {})
        ydl_opts["extractor_args"]["youtube"] = {
            "player_client": [client]
        }
        
    # Impersonate
    if strategy.get("impersonate"):
        ydl_opts["impersonate"] = strategy.get("impersonate")

    # Inherit complexity from legacy function (Postprocessors, Filters, Paths)
    # We call the legacy function to get the 'heavy lifting' opts, then override with strategy
    # This is a bit hacky but safer than rewriting 200 lines of codec logic right now.
    
    base_opts = build_ydl_opts(job_id, request) # Call the OLD function to get paths/filters
    
    # Merge strategy overrides
    base_opts.update(ydl_opts)
    
    return base_opts

def download_with_retries(job_id: str, request: DownloadRequest):
    """
    Smart Retry Pipeline for downloads.
    Cycles through strategies: Web -> Cookies -> IOs -> Fallback.
    """
    print(f"[{job_id}] STARTING SMART DOWNLOAD: {request.url}")
    
    strategies = [
        # 1. Standard Audio/Video (Web Client, No Cookies if possible)
        {
            "name": "standard_web",
            "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            "use_cookies": True, # Try with cookies if avail, safe default
            "client": "web",
        },
        # 2. TV Client (Often bypasses agegates)
        {
            "name": "tv_client",
            "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            "use_cookies": True,
            "client": "tv",
        },
        # 3. Android Client
        {
            "name": "android_client",
            "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            "use_cookies": True,
            "client": "android",
        },
         # 4. iOS Client
        {
            "name": "ios_client",
            "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            "use_cookies": True,
            "client": "ios",
        },
        # 5. Quality Fallback (720p / different audio) if Video
        {
            "name": "fallback_quality",
            "format": "bestvideo[height<=720]+bestaudio/best" if request.mode == 'video' else "bestaudio[protocol^=http]",
            "use_cookies": True,
            "client": "web",
        },
    ]

    st = jobs.get(job_id)
    if not st: return

    for idx, strat in enumerate(strategies, start=1):
        st.error = None # Clear previous error
        
        # Only notify 'trying' if it's not the first one to avoid UI flicker
        if idx > 1:
            st.status = f"retry_method_{idx}" # Frontend can show "Retrying (Method 2)..."
            if main_event_loop:
                 asyncio.run_coroutine_threadsafe(notify_job_update(job_id), main_event_loop)
        
        print(f"[{job_id}] Strategy {idx}/{len(strategies)}: {strat['name']}")
        
        try:
            ydl_opts = build_ydl_opts_for_strategy(job_id, request, strat)
            
            # Execute Download
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(request.url, download=True)
                
                # Check for 1080p success if requested
                if request.quality == '1080p' and request.mode == 'video':
                     h = info.get("height", 0)
                     print(f"[{job_id}] Downloaded height: {h}")

                filename = ydl.prepare_filename(info)
                final_filename = os.path.splitext(os.path.basename(filename))[0]
                
                # Suffix logic (copied from blocking_download)
                if request.mode == 'video': final_filename += '.mp4'
                elif request.quality == 'flac': final_filename += '.flac'
                elif request.quality == 'best': final_filename += '.m4a'
                else: final_filename += '.mp3'
                
                # Success!
                st.status = "processing"
                st.progress = 100.0
                st.filename = final_filename
                
                # History (simplified)
                try:
                    save_to_history({
                        "title": info.get('title'),
                        "file": final_filename,
                        "quality": request.quality,
                        "mode": request.mode,
                        "url": request.url
                    })
                except: pass
                
                # Save to DB (Persistence)
                mark_downloaded_db(request.playlist_id, request.video_id, info.get('title', 'Unknown'), final_filename, request.url)

                if main_event_loop:
                    asyncio.run_coroutine_threadsafe(notify_job_update(job_id), main_event_loop)
                return # Exit success

        except Exception as e:
            msg = str(e)
            print(f"[{job_id}] Strategy {idx} failed: {msg}")
            
            # 1. Rate Limit
            if is_match(msg, TRANSIENT_ERRORS):
                print(f"[{job_id}] RATE LIMIT DETECTED. Cooling down...")
                st.status = "rate_limited" 
                # Backoff: 5s, 10s, 15s...
                time.sleep(5 * idx) 
                continue # Try next strategy (or duplicate same strategy if we wanted)

            # 2. Login Required
            if is_match(msg, LOGIN_ERRORS):
                print(f"[{job_id}] LOGIN REQUIRED. Stopping.")
                st.status = "error"
                st.error = "Login necessário (YouTube bloqueou o vídeo). Atualize o cookies.txt."
                mark_error_db(request.playlist_id, request.video_id, f"Login Required", st.error) # DB
                if main_event_loop:
                    asyncio.run_coroutine_threadsafe(notify_job_update(job_id), main_event_loop)
                return # Stop completely
                
            # 3. Format Error
            if is_match(msg, FORMAT_ERRORS):
                 print(f"[{job_id}] Format unavailable. Trying next...")
                 continue

            # Generic error -> Try next
            time.sleep(1)
            continue
            
    # If we fall through here, all failed
    st.status = "error"
    st.error = "Falha em todos os métodos de download (possível link inválido ou bloqueio de IP)."
    mark_error_db(request.playlist_id, request.video_id, "All strategies failed", st.error) # DB
    if main_event_loop:
        asyncio.run_coroutine_threadsafe(notify_job_update(job_id), main_event_loop)

def blocking_download(job_id: str, request: DownloadRequest):
    # Wrapper to maintain compatibility but use new logic
    download_with_retries(job_id, request)

async def run_download(job_id: str, request: DownloadRequest):
    await asyncio.to_thread(blocking_download, job_id, request)

async def worker_loop():
    while True:
        job_id, request = await download_queue.get()
        st = jobs.get(job_id)
        if st:
            st.status = "running"
            st.started_at = time.time()
            await notify_job_update(job_id)
        
        async with download_sem:
            try:
                # TIMEOUT: 5 minutos (300 segundos) para evitar travamentos infinitos
                task = asyncio.create_task(run_download(job_id, request))
                done, pending = await asyncio.wait([task], timeout=300)

                if pending:
                    # Se não terminou em 5min, cancela e marca timeout
                    for t in pending: t.cancel()
                    if st:
                        st.status = "timeout"
                        st.error = "Download cancelado por tempo excedido (timeout 5min)"
                        await notify_job_update(job_id)
                else:
                    # Se terminou com sucesso (ou erro interno tratado), pega o exception se houver
                    try:
                        await task
                        # Se chegou aqui, run_download terminou ok
                        if st and st.status not in ["error", "timeout", "done"]: 
                             # 'done' é setado dentro do blocking_download normalmente, mas garantindo
                             pass 
                        
                        if st and st.status == "processing": # Se parou em processing no blocking_download
                             st.status = "done"
                             st.finished_at = time.time()
                             await notify_job_update(job_id)
                             
                    except Exception as task_error:
                        raise task_error # Vai para o except abaixo

            except asyncio.CancelledError:
                 if st: st.status = "cancelled"
            except Exception as e:
                # Should be handled in run_download/blocking_download, but just in case
                if st:
                    st.status = "error"
                    st.error = str(e)
                    await notify_job_update(job_id)
                    st.finished_at = time.time()
                    st.progress = 100.0
            except Exception as e:
                print(f"Job {job_id} Error: {e}")
                if st:
                    st.status = "error"
                    st.error = str(e)
                    st.finished_at = time.time()
            finally:
                download_queue.task_done()
                if st and st.status in ["done", "error", "timeout"]:
                     await notify_job_update(job_id)

@app.on_event("startup")
async def startup_event():
    # Capture main loop for thread-safe websocket updates
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()
    
    # Start workers based on MAX_CONCURRENT_DOWNLOADS
    for _ in range(MAX_CONCURRENT_DOWNLOADS):
        asyncio.create_task(worker_loop())

class RetryRequest(BaseModel):
    playlist_id: str
    video_id: str

@app.post("/download/retry")
async def retry_download(req: RetryRequest):
    print(f"Redownload requested for {req.video_id} in {req.playlist_id}")
    rec = get_download_record(req.playlist_id, req.video_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Registro não encontrado no histórico para este vídeo.")

    # Mark as 'missing' so it's treated as pending
    mark_missing_db(req.playlist_id, req.video_id)

    # Validate URL
    url = rec.get("url")
    if not url:
        url = f"https://www.youtube.com/watch?v={rec['video_id']}"

    # Re-queue
    download_req = DownloadRequest(
        url=url,
        playlist_id=req.playlist_id,
        video_id=req.video_id,
        title=rec.get("title"),
        quality="best", # Default to best
        mode="audio"    # Default to audio (safe guess, or we could store mode too)
    )

    job_id = str(uuid.uuid4())
    # Register job immediately
    jobs[job_id] = JobState(
        id=job_id,
        status="queued",
        progress=0.0,
        created_at=time.time(),
        title=rec.get("title") or "Redownload",
    )
    
    await download_queue.put((job_id, download_req))
    
    return {"status": "ok", "job_id": job_id, "message": "Enfileirado novamente"}

@app.post("/download/enqueue")
async def enqueue_download(req: DownloadRequest):
    job_id = str(uuid.uuid4())
    jobs[job_id] = JobState(
        id=job_id,
        status="queued",
        progress=0.0,
        created_at=time.time(),
        title=req.title # Initial title if generic
    )
    await download_queue.put((job_id, req))
    return {"job_id": job_id}

@app.get("/download/status/{job_id}")
async def get_download_status(job_id: str):
    st = jobs.get(job_id)
    if not st:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return asdict(st)

@app.post("/download")
async def download_music_legacy(request: DownloadRequest):
    """
    Endpoint legado: apenas enfileira o download e retorna job_id.
    Mantido para compatibilidade com o frontend antigo.
    """
    job_id = str(uuid.uuid4())
    jobs[job_id] = JobState(
        id=job_id,
        status="queued",
        progress=0.0,
        created_at=time.time(),
        title=request.title,
    )
    await download_queue.put((job_id, request))
    return {"job_id": job_id}

@app.get("/history")
def get_history():
    return load_history()

@app.delete("/history")
def clear_history():
    if os.path.exists(HISTORY_FILE):
        os.remove(HISTORY_FILE)
    return {"status": "cleared"}

@app.get("/auth_status")
def get_auth_status():
    cookie_path = os.path.join(get_data_dir(), "cookies.txt")
    if os.path.exists(cookie_path) and os.path.getsize(cookie_path) > 0:
        return {"authenticated": True}
    return {"authenticated": False}

@app.post("/open_folder")
def open_folder():
    downloads_dir = get_downloads_dir()
    if os.path.exists(downloads_dir):
        os.startfile(downloads_dir)
    return {"status": "opened"}

from fastapi import File, UploadFile
import shutil

@app.post("/upload_cookies")
async def upload_cookies(file: UploadFile = File(...)):
    try:
        cookie_path = os.path.join(get_data_dir(), "cookies.txt")
        
        with open(cookie_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"status": "success", "message": "Cookies atualizados com sucesso!"}
    except Exception as e:
        print(f"Erro no upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload_cover")
async def upload_cover(file: UploadFile = File(...)):
    try:
        temp_dir = os.path.join(get_data_dir(), "temp_covers")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save with original extension
        ext = os.path.splitext(file.filename)[1]
        if not ext: ext = ".jpg"
        
        # Unique name
        import uuid
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(temp_dir, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"status": "success", "path": filepath}
    except Exception as e:
        print(f"Erro no upload da capa: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/terms/status")
def get_terms_status():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT value FROM app_settings WHERE key = 'terms_accepted'")
        row = cur.fetchone()
        conn.close()
        return {"accepted": row['value'] == 'true' if row else False}
    except:
        return {"accepted": False}

@app.post("/terms/accept")
def accept_terms():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('terms_accepted', 'true')")
        conn.commit()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/terms/content")
def get_terms_content():
    path = os.path.join(get_data_dir(), "TERMOS_DE_USO.txt")
    if not os.path.exists(path):
        return {"content": "Termos de uso não encontrados."}
    with open(path, "r", encoding="utf-8") as f:
        return {"content": f.read()}

# App Execution and Static Files
# App Execution and Static Files
if getattr(sys, 'frozen', False):
    if hasattr(sys, '_MEIPASS'):
        static_dir = os.path.join(sys._MEIPASS, 'static')
    else:
        static_dir = os.path.join(os.path.dirname(sys.executable), '_internal', 'static')
else:
    static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

# DEBUG LOGGING
print(f"=== STATIC FILES DEBUG ===")
print(f"Running as executable: {getattr(sys, 'frozen', False)}")
print(f"Static directory: {static_dir}")
print(f"Static directory exists: {os.path.exists(static_dir)}")
if os.path.exists(static_dir):
    print(f"Contents: {os.listdir(static_dir)}")
    assets_path = os.path.join(static_dir, 'assets')
    if os.path.exists(assets_path):
        print(f"Assets contents: {os.listdir(assets_path)}")
print("========================")

# Only mount if directory exists (in .exe or if manually built)
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    try:
        import uvicorn
        import multiprocessing
        import webbrowser
        import threading
        import time

        # Freeze support for exe
        multiprocessing.freeze_support()
        
        # Extract Terms of Use if running as exe
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            try:
                terms_src = os.path.join(sys._MEIPASS, 'TERMOS_DE_USO.txt')
                terms_dst = os.path.join(get_data_dir(), 'TERMOS_DE_USO.txt')
                if os.path.exists(terms_src) and not os.path.exists(terms_dst):
                    shutil.copy2(terms_src, terms_dst)
                    print(f"📄 Termos de Uso extraídos para: {terms_dst}")
            except Exception as e:
                print(f"Aviso: Não foi possível extrair Termos de Uso: {e}")

        # Open browser automatically
        def open_browser():
            time.sleep(2)
            webbrowser.open("http://localhost:8000")
            
        threading.Thread(target=open_browser, daemon=True).start()
        
        print("Iniciando servidor...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
    except Exception as e:
        import traceback
        error_msg = f"CRASH: {str(e)}\n\n{traceback.format_exc()}"
        print(error_msg)
        with open("crash_log.txt", "w", encoding="utf-8") as f:
            f.write(error_msg)
        input("Pressione ENTER para fechar...")
