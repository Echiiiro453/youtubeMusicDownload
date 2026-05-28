import threading
import uvicorn
import webview
import os
import sys
import io

# [CORREÇÃO CRÍTICA] Força o stdout e stderr a aceitarem UTF-8 (Emojis/Caracteres Especiais)
# Isso impede o erro fatal de "charmap codec can't encode character" quando o app roda sem console (windowed)
if sys.stdout is None or getattr(sys, 'frozen', False):
    log_file = open('AppMusica.log', 'wb')
    sys.stdout = io.TextIOWrapper(log_file, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(log_file, encoding='utf-8')

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

    from main import app
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False, log_level="warning")

def start_desktop():
    print("Iniciando servidor local...")
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    print("Iniciando interface nativa (Webview)...")
    # Cria uma janela nativa do Windows sem precisar do Chrome
    webview.create_window(
        'Music Downloader', 
        'http://127.0.0.1:8000', 
        width=1100, 
        height=800,
        min_size=(800, 600),
        background_color='#09090b'
    )
    
    # Inicia a janela. Quando o usuário fechar a janela, o app encerra automaticamente.
    webview.start()
    os._exit(0)

if __name__ == "__main__":
    start_desktop()
