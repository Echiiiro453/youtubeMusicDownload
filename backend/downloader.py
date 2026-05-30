import yt_dlp
import os
import time
import sys
import asyncio
import threading
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
from utils import get_downloads_dir, get_cookies_path, parse_time
from database import mark_downloaded_db, mark_error_db
from metadata_fetcher import apply_metadata
from proxy_manager import get_random_proxy
from yt_dlp.networking.impersonate import ImpersonateTarget

TRANSIENT_ERRORS = ("rate-limited", "try again later", "HTTP Error 429", "temporarily unavailable", "network is unreachable")
LOGIN_ERRORS = ("Sign in required", "account problem", "private video")
FORMAT_ERRORS = ("Requested format is not available", "requested format is not available")

def is_match(err_msg: str, fragments) -> bool:
    return any(f.lower() in err_msg.lower() for f in fragments)

EQ_PRESETS = {
    'bass': 'equalizer=f=60:width_type=h:width=50:g=10',
    'soft': 'equalizer=f=1000:width_type=h:width=200:g=-5',
    'treble': 'equalizer=f=14000:width_type=h:width=1000:g=10',
    'vocal': 'equalizer=f=3000:width_type=h:width=1000:g=5'
}

@dataclass
class JobState:
    id: str
    status: str
    progress: float
    title: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None
    created_at: float = 0.0
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    last_update: float = 0.0

jobs: Dict[str, JobState] = {}
download_queue: asyncio.Queue = asyncio.Queue()
MAX_CONCURRENT_DOWNLOADS = 4
download_sem = asyncio.Semaphore(MAX_CONCURRENT_DOWNLOADS)
main_event_loop = None
active_tasks = {}

async def memory_reaper():
    """Background task to clear old completed jobs from memory to prevent leaks."""
    while True:
        await asyncio.sleep(3600)  # run every 1 hour
        now = time.time()
        stale_jobs = []
        for j_id, st in jobs.items():
            if st.status in ["completed", "error", "cancelled", "rate_limited"]:
                if now - st.last_update > 43200: # 12 hours
                    stale_jobs.append(j_id)
        
        for j_id in stale_jobs:
            jobs.pop(j_id, None)
            active_tasks.pop(j_id, None)
        
        if stale_jobs:
            print(f"[\033[90mMemory Reaper\033[0m] Cleared {len(stale_jobs)} old jobs from RAM.")

def build_ydl_opts(job_id: str, request) -> Dict[str, Any]:
    downloads_dir = get_downloads_dir()
    os.makedirs(downloads_dir, exist_ok=True)
    
    if getattr(request, 'organize', False):
        outtmpl = os.path.join(downloads_dir, '%(artist,uploader|Unknown Artist)s', '%(album|Singles)s', '%(title)s.%(ext)s')
    else:
        outtmpl = os.path.join(downloads_dir, '%(title)s.%(ext)s')

    resource_dir = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        if hasattr(sys, '_MEIPASS'):
            resource_dir = sys._MEIPASS
        else:
            resource_dir = os.path.join(os.path.dirname(sys.executable), '_internal')

    format_str = 'bestaudio/best'
    postprocessors = []

    if request.mode == 'video':
        format_str = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        if request.quality == '4k':
            format_str = 'bestvideo[height>=2160]+bestaudio/bestvideo+bestaudio/best'
        elif request.quality.endswith('p') and request.quality[:-1].isdigit():
            height = int(request.quality[:-1])
            format_str = f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best'
        
        postprocessors.append({'key': 'FFmpegThumbnailsConvertor', 'format': 'jpg'})
        postprocessors.append({'key': 'EmbedThumbnail'})
        postprocessors.append({'key': 'FFmpegMetadata'})
    else:
        audio_extract = {'key': 'FFmpegExtractAudio'}
        
        if request.quality == 'flac':
             audio_extract['preferredcodec'] = 'flac'
             # FLAC é lossless, FFmpeg quebra se passarmos bitrate pra ele.
        elif request.quality == 'best': 
             audio_extract['preferredcodec'] = 'm4a'
             audio_extract['preferredquality'] = '320'
        elif request.quality == 'medium':
             audio_extract['preferredcodec'] = 'mp3'
             audio_extract['preferredquality'] = '128'
        elif request.quality == 'high':
             audio_extract['preferredcodec'] = 'mp3'
             audio_extract['preferredquality'] = '192'
        else:
             audio_extract['preferredcodec'] = 'mp3'
             audio_extract['preferredquality'] = '320'

        postprocessors.append(audio_extract)
        postprocessors.append({'key': 'FFmpegThumbnailsConvertor', 'format': 'jpg'})
        postprocessors.append({'key': 'EmbedThumbnail'})
        postprocessors.append({'key': 'FFmpegMetadata'})

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

    if request.mode != 'video':
         af_filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")

    if af_filters:
         postprocessor_args = {'ExtractAudio': ['-af', ",".join(af_filters)]}

    class StdoutLogger:
        def debug(self, msg): pass
        def warning(self, msg): 
            # Imprime o aviso com cor cinza escuro para não poluir
            print(f"      \033[90m[yt-dlp:warn] {msg}\033[0m")
        def error(self, msg): 
            # Imprime erro com cor vermelha
            print(f"      \033[31m[yt-dlp:err] {msg}\033[0m")

    def local_progress_hook(d):
        if job_id in jobs and jobs[job_id].status == 'cancelled':
            raise Exception("Download cancelado pelo usuario")
        
        if d['status'] == 'downloading':
            try:
                p = d.get('_percent_str', '0%').replace('%','')
                if job_id in jobs:
                    if jobs[job_id].status != 'cancelled':
                        jobs[job_id].status = 'downloading'
                    try:
                        jobs[job_id].progress = float(p)
                    except: pass
                    jobs[job_id].title = d.get('info_dict', {}).get('title') or jobs[job_id].title
            except Exception as e:
                pass
        elif d['status'] == 'finished':
            if job_id in jobs and jobs[job_id].status != 'cancelled':
                jobs[job_id].progress = 100
                jobs[job_id].status = 'processing'

    ydl_opts = {
        "socket_timeout": 15,
        'format': format_str,
        'outtmpl': outtmpl,
        'quiet': False, 
        'logger': StdoutLogger(),
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
        'extractor_args': {'youtube': {'player_client': ['tv']}},
        'remote_components': ['ejs:github'],
        'external_downloader': {'default': 'aria2c', 'm3u8': 'native', 'm3u8_native': 'native'},
        'external_downloader_args': {'aria2c': ['-c', '-j', '16', '-x', '16', '-s', '16', '-k', '1M']}
    }
    
    # Re-ativa o "Jittering" (Anti-Ban Sleep) SOMENTE para YouTube
    if "youtube.com" in request.url or "youtu.be" in request.url:
        ydl_opts["sleep_requests"] = 1.5
        ydl_opts["sleep_interval"] = 6
        ydl_opts["max_sleep_interval"] = 25
        ydl_opts["sleep_subtitles"] = 2
    
    start_sec = parse_time(request.start_time)
    end_sec = parse_time(request.end_time)
    if start_sec is not None or end_sec is not None:
        def range_func(info_dict, ydl):
            return [{'start_time': start_sec, 'end_time': end_sec}]
        ydl_opts['download_ranges'] = range_func
        ydl_opts['force_keyframes_at_cuts'] = True

    if request.cover_path and os.path.exists(request.cover_path):
        ydl_opts['writethumbnail'] = False
        postprocessors = [p for p in postprocessors if p.get('key') != 'EmbedThumbnail']
        ydl_opts['postprocessors'] = postprocessors

    return ydl_opts

def build_ydl_opts_for_strategy(job_id: str, request, strategy: dict):
    ydl_opts = {
        'format': strategy['format'],
        'concurrent_fragments': 4,
    }
    
    if strategy.get("use_cookies") and getattr(request, 'cookies_path', None):
        ydl_opts["cookiefile"] = request.cookies_path
    elif strategy.get("use_cookies") and get_cookies_path():
        ydl_opts["cookiefile"] = get_cookies_path()
        
    client = strategy.get("client")
    if client:
        ydl_opts.setdefault("extractor_args", {})
        ydl_opts["extractor_args"]["youtube"] = {"player_client": [client]}
        
    if strategy.get("impersonate"):
        ydl_opts["impersonate"] = ImpersonateTarget(client=strategy.get("impersonate"))
        
    if strategy.get("source_address"):
        ydl_opts["source_address"] = strategy.get("source_address")

    base_opts = build_ydl_opts(job_id, request)
    base_opts.update(ydl_opts)
    
    return base_opts

def download_with_retries(job_id: str, request):
    print(f"\n\033[1;35m[🎧] INICIANDO SMART DOWNLOAD:\033[0m \033[36m{request.url}\033[0m")
    strategies = [
        {"name": "standard_web", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "web", "impersonate": "chrome"},
        {"name": "legacy_web", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "web"},
        {"name": "tv_client", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "tv"},
        {"name": "android_client", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "android"},
        {"name": "ios_client", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "ios"},
        {"name": "android_music", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "android_music"},
        {"name": "ios_music", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "ios_music"},
        {"name": "mweb", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "mweb", "impersonate": "chrome"},
        {"name": "force_ipv4", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "web", "source_address": "0.0.0.0"},
        {"name": "force_ipv6", "format": "bestaudio/best" if request.mode == 'audio' else 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', "use_cookies": True, "client": "web", "source_address": "::"},
        {"name": "fallback_quality", "format": "bestvideo[height<=720]+bestaudio/best" if request.mode == 'video' else "bestaudio[protocol^=http]", "use_cookies": True, "client": "web", "impersonate": "chrome"},
        {"name": "proxy_survival", "format": "bestaudio[protocol^=http]", "use_cookies": False, "client": "web", "impersonate": "chrome", "use_proxy": True},
    ]

    st = jobs.get(job_id)
    if not st or st.status == "cancelled": return

    for idx, strat in enumerate(strategies, start=1):
        if st.status == "cancelled": return
        strat_name = strat['name'].upper()
        print(f"  \033[33m➔ [{idx}/{len(strategies)}] Testando método: \033[1;33m{strat_name}\033[0m")
        st.error = None
        if idx > 1:
            st.status = f"retry_method_{idx}"
        
        try:
            ydl_opts = build_ydl_opts_for_strategy(job_id, request, strat)
            
            def execute_ydl(opts):
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(request.url, download=True)
                    filename = ydl.prepare_filename(info)
                    
                    base_path, _ = os.path.splitext(filename)
                    
                    if request.mode == 'video': full_final_path = base_path + '.mp4'
                    elif request.quality == 'flac': full_final_path = base_path + '.flac'
                    elif request.quality == 'best': full_final_path = base_path + '.m4a'
                    else: full_final_path = base_path + '.mp3'
                    
                    final_filename_relative = os.path.relpath(full_final_path, get_downloads_dir())
                    
                    # Apply Premium Metadata
                    if request.mode != 'video':
                        st.status = "processing"
                        print(f"  \033[94m➔ Buscando metadados premium no iTunes...\033[0m")
                        success = apply_metadata(full_final_path, info.get('title', ''))
                        if success:
                            print(f"    \033[32m✔ Capa High-Res e Tags injetadas com sucesso!\033[0m")
                    
                    st.status = "done"
                    st.progress = 100.0
                    st.filename = final_filename_relative
                    
                    mark_downloaded_db(getattr(request, 'playlist_id', None), getattr(request, 'video_id', None), info.get('title', 'Unknown'), final_filename_relative, request.url)
                    print(f"  \033[32m✔ SUCESSO! Download concluído usando o método: {strat_name}\033[0m\n")
            
            if strat.get("use_proxy"):
                last_proxy_err = None
                success = False
                for proxy_attempt in range(1, 6):
                    if st.status == "cancelled": return
                    proxy = get_random_proxy()
                    if not proxy: break
                    ydl_opts['proxy'] = proxy
                    print(f"      \033[94m[proxy] Tentativa de sobrevivência {proxy_attempt}/5 com proxy: {proxy}\033[0m")
                    try:
                        execute_ydl(ydl_opts)
                        return # SUCESSO!
                    except Exception as proxy_err:
                        last_proxy_err = proxy_err
                        print(f"      \033[31m[proxy:err] Proxy falhou: {str(proxy_err).splitlines()[0][:80]}...\033[0m")
                        time.sleep(1)
                        continue
                if not success:
                    if last_proxy_err: raise last_proxy_err
                    else: raise Exception("Todos os proxies disponíveis falharam na conexão.")
            else:
                execute_ydl(ydl_opts)
                return 

        except Exception as e:
            msg = str(e)
            
            # Formatar erro resumido para o log
            short_msg = msg.split('\n')[0]
            if len(short_msg) > 100: short_msg = short_msg[:97] + "..."
            print(f"  \033[31m✖ Falha no método {strat_name}: {short_msg}\033[0m")

            if is_match(msg, TRANSIENT_ERRORS):
                st.status = "rate_limited" 
                time.sleep(2) 
                continue
            if is_match(msg, LOGIN_ERRORS):
                st.status = "error"
                st.error = "Login necessário (YouTube bloqueou o vídeo). Atualize o cookies.txt."
                mark_error_db(getattr(request, 'playlist_id', None), getattr(request, 'video_id', None), "Login Required", st.error)
                print(f"  \033[1;31m✖ Download abortado: Proteção de Login ativada.\033[0m\n")
                return 
            if is_match(msg, FORMAT_ERRORS):
                 continue
            time.sleep(1)
            continue
            
    st.status = "error"
    st.error = "Falha em todos os métodos de download (possível link inválido ou bloqueio de IP)."
    mark_error_db(getattr(request, 'playlist_id', None), getattr(request, 'video_id', None), "All strategies failed", st.error)
    print(f"  \033[1;31m✖ Download permanentemente falhou para: {request.url}\033[0m\n")

async def run_download(job_id: str, request):
    await asyncio.to_thread(download_with_retries, job_id, request)

async def worker_loop():
    while True:
        job_id, request = await download_queue.get()
        st = jobs.get(job_id)
        if st:
            if st.status == "cancelled":
                download_queue.task_done()
                continue
            st.status = "running"
            st.started_at = time.time()
        
        async with download_sem:
            try:
                task = asyncio.create_task(run_download(job_id, request))
                done, pending = await asyncio.wait([task], timeout=300)

                if pending:
                    for t in pending: t.cancel()
                    if st:
                        st.status = "timeout"
                        st.error = "Download cancelado por tempo excedido (timeout 5min)"
                else:
                    try:
                        await task
                        if st and st.status not in ["error", "timeout"]: 
                             st.status = "done"
                             st.finished_at = time.time()
                    except Exception as task_error:
                        raise task_error

            except asyncio.CancelledError:
                 if st: st.status = "cancelled"
            except Exception as e:
                if st:
                    st.status = "error"
                    st.error = str(e)
                    st.finished_at = time.time()
                    st.progress = 100.0
            finally:
                download_queue.task_done()
