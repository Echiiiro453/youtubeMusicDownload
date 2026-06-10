import os
import json
import time
import asyncio
import threading
from utils import get_data_dir
import downloader

SUBS_FILE = os.path.join(get_data_dir(), "subscriptions.json")

def load_subscriptions():
    if not os.path.exists(SUBS_FILE):
        return []
    try:
        with open(SUBS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_subscriptions(subs):
    try:
        with open(SUBS_FILE, 'w', encoding='utf-8') as f:
            json.dump(subs, f, indent=4)
    except Exception as e:
        print(f"Erro ao salvar subscriptions: {e}")

def add_subscription(playlist_id, url, title, platform):
    subs = load_subscriptions()
    if not any(s['id'] == playlist_id for s in subs):
        subs.append({
            "id": playlist_id,
            "url": url,
            "title": title,
            "platform": platform,
            "added_at": time.time(),
            "last_checked": 0
        })
        save_subscriptions(subs)
        return True
    return False

def remove_subscription(playlist_id):
    subs = load_subscriptions()
    subs = [s for s in subs if s['id'] != playlist_id]
    save_subscriptions(subs)

def get_all_subscriptions():
    return load_subscriptions()

async def check_subscriptions():
    """Roda em background de tempos em tempos para procurar músicas novas."""
    while True:
        subs = load_subscriptions()
        for sub in subs:
            # Pula se foi checado há menos de 4 horas
            if time.time() - sub.get('last_checked', 0) < 4 * 3600:
                continue
                
            print(f"[Monitor] Checando playlist: {sub['title']}")
            try:
                # Extrai os dados da playlist
                import yt_dlp
                ydl_opts = {
                    'extract_flat': 'in_playlist',
                    'playlistend': 50,
                    'quiet': True,
                    'ignoreerrors': True
                }
                def _extract():
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        return ydl.extract_info(sub['url'], download=False)
                info = await asyncio.to_thread(_extract)
                
                if not info or 'entries' not in info:
                    continue
                
                # Se houver itens, atualizamos o last_checked
                sub['last_checked'] = time.time()
                save_subscriptions(subs)
                
                # Para cada música, verificar se já baixamos. 
                # (Simplificação: Enfileirar. Se já existir, o downloader.py pulará sozinho 
                # e o status ficará "already_downloaded").
                
                # Envia para a fila real do app
                for entry in info['entries']:
                    if not entry: continue
                    vid = entry.get('id')
                    vtitle = entry.get('title')
                    if not vid: continue
                    
                    # Vamos enfileirar no downloader.py passando a URL do vídeo
                    video_url = entry.get('webpage_url') or entry.get('url') or f"https://youtube.com/watch?v={vid}"
                    
                    # Adiciona silenciosamente ao worker queue do main.py
                    from main import DownloadRequest
                    from downloader import jobs, download_queue, JobState
                    import uuid
                    
                    # Simular envio
                    job_id = str(uuid.uuid4())
                    req = DownloadRequest(
                        url=video_url,
                        quality="320",
                        format="mp3",
                        mode="audio",
                        title=vtitle,
                        playlist_id=sub['id'],
                        video_id=vid
                    )
                    
                    jobs[job_id] = JobState(
                        id=job_id, 
                        status="queued", 
                        progress=0.0, 
                        created_at=time.time(), 
                        title=req.title
                    )
                    await download_queue.put((job_id, req))
                    
            except Exception as e:
                print(f"[Monitor] Erro ao checar {sub['title']}: {e}")
                
        # Dorme por 30 minutos antes da próxima passagem
        await asyncio.sleep(30 * 60)

def start_monitor():
    loop = asyncio.get_event_loop()
    loop.create_task(check_subscriptions())
