import threading
import uvicorn
import webview
import os
import sys
import io

# [CORREÇÃO CRÍTICA] Força o stdout e stderr a aceitarem UTF-8 (Emojis/Caracteres Especiais)
# Isso impede o erro fatal de "charmap codec can't encode character" quando o app roda sem console (windowed)
# IMPORTANTE: Não redirecionar se for o processo filho do Demucs (--run-demucs) ou Spotify (--run-spotify), senão a saída/progresso quebra!
if '--run-demucs' not in sys.argv and '--run-spotify' not in sys.argv:
    if sys.stdout is None or getattr(sys, 'frozen', False):
        log_file = open('AppMusica.log', 'wb')
        sys.stdout = io.TextIOWrapper(log_file, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(log_file, encoding='utf-8')
else:
    if sys.stdout is not None:
        try: sys.stdout.reconfigure(encoding='utf-8')
        except: pass
    if sys.stderr is not None:
        try: sys.stderr.reconfigure(encoding='utf-8')
        except: pass

# Import at top-level so PyInstaller statically detects it, but after stdout fix
import main

def run_server():
    # Se estiver rodando como EXE compilado, injeta a pasta oculta (_MEIPASS) no PATH do Windows
    # Isso garante que node.exe, ffmpeg.exe e aria2c.exe sejam encontrados magicamente pelo yt-dlp.
    resource_dir = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        if hasattr(sys, '_MEIPASS'):
            resource_dir = sys._MEIPASS
        else:
            resource_dir = os.path.join(os.path.dirname(sys.executable), '_internal')
            
    os.environ["PATH"] = resource_dir + os.pathsep + os.environ.get("PATH", "")

    uvicorn.run(main.app, host="127.0.0.1", port=8000, reload=False, log_level="warning")

import time
import socket

def wait_and_load(window):
    # Polling the local port until uvicorn is ready
    for _ in range(60):
        try:
            with socket.create_connection(("127.0.0.1", 8000), timeout=1):
                window.load_url('http://127.0.0.1:8000')
                return
        except OSError:
            time.sleep(0.5)
    print("Falha: O servidor demorou muito para iniciar.")

def start_desktop():
    print("Iniciando servidor local...")
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    print("Iniciando interface nativa (Webview)...")
    
    loading_html = '''
    <body style="background-color:#09090b;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;margin:0;">
        <h2>Iniciando AppMusica...</h2>
        <p style="color:#a855f7;">Carregando componentes do servidor</p>
    </body>
    '''
    
    window = webview.create_window(
        'Music Downloader', 
        html=loading_html, 
        width=1100, 
        height=800,
        min_size=(800, 600),
        background_color='#09090b'
    )
    
    # Inicia a janela com private_mode=False para não apagar o localStorage
    webview.start(wait_and_load, window, private_mode=False)
    os._exit(0)

if __name__ == "__main__":
    if '--server-only' in sys.argv:
        run_server()
    else:
        start_desktop()
