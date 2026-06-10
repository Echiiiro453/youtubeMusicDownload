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

def ensure_firewall_rule():
    """Cria automaticamente uma regra de firewall para a porta 8000 (Mobile Sync).
    Silencioso — não mostra nada para o usuário se já existir ou se falhar."""
    import subprocess
    rule_name = "AppMusica Mobile Sync"
    try:
        # Checa se a regra já existe
        check = subprocess.run(
            ["netsh", "advfirewall", "firewall", "show", "rule", f"name={rule_name}"],
            capture_output=True, text=True, timeout=5
        )
        if "Nenhuma regra" in check.stdout or "No rules" in check.stdout or check.returncode != 0:
            # Cria a regra silenciosamente
            subprocess.run(
                ["netsh", "advfirewall", "firewall", "add", "rule",
                 f"name={rule_name}", "dir=in", "action=allow",
                 "protocol=TCP", "localport=8000"],
                capture_output=True, timeout=5
            )
    except Exception:
        pass  # Falha silenciosa — não bloqueia o startup do app

def run_server():
    # Libera automaticamente a porta 8000 no firewall para Mobile Sync funcionar
    ensure_firewall_rule()

    # Se estiver rodando como EXE compilado, injeta a pasta oculta (_MEIPASS) no PATH do Windows
    # Isso garante que node.exe, ffmpeg.exe e aria2c.exe sejam encontrados magicamente pelo yt-dlp.
    resource_dir = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, 'frozen', False):
        if hasattr(sys, '_MEIPASS'):
            resource_dir = sys._MEIPASS
        else:
            resource_dir = os.path.join(os.path.dirname(sys.executable), '_internal')
            
    os.environ["PATH"] = resource_dir + os.pathsep + os.environ.get("PATH", "")

    uvicorn.run(main.app, host="0.0.0.0", port=8000, reload=False, log_level="warning")

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

import pystray
from PIL import Image, ImageDraw

def create_tray_icon(window):
    # Cria uma imagem preta genérica para o ícone da bandeja se não houver arquivo .ico
    image = Image.new('RGB', (64, 64), color=(0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.ellipse((16, 16, 48, 48), fill=(255, 0, 80))
    
    # Try to load app icon if exists
    import sys
    try:
        if hasattr(sys, '_MEIPASS'):
            base_path = sys._MEIPASS
        else:
            base_path = os.path.dirname(os.path.abspath(__file__))
            
        icon_path = os.path.join(base_path, 'static', 'favicon.ico')
        if os.path.exists(icon_path):
            image = Image.open(icon_path)
    except:
        pass

    def show_window(icon, item):
        window.show()
        
    def exit_app(icon, item):
        icon.stop()
        window.destroy()
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Mostrar AppMusica", show_window, default=True),
        pystray.MenuItem("Sair", exit_app)
    )
    
    icon = pystray.Icon("appmusica", image, "AppMusica", menu)
    
    # Executa o ícone na thread atual (que não é a principal do webview, mas do tray)
    icon.run()

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
        background_color='#09090b',
        hidden=False # Inicialmente criado como visível
    )
    
    # Se o usuário clicar em "X", apenas ocultar a janela, não destruir
    def on_closing():
        window.hide()
        return False # Cancela o evento de fechar
        
    window.events.closing += on_closing
    
    # Inicia minimizado apenas se tiver a flag --minimized
    start_hidden = "--minimized" in sys.argv

    # Inicia a thread do Tray Icon
    tray_thread = threading.Thread(target=create_tray_icon, args=(window,), daemon=True)
    tray_thread.start()
    
    def on_loaded():
        wait_and_load(window)
        if start_hidden:
            window.hide()
            
    # Inicia a janela com private_mode=False para não apagar o localStorage
    webview.start(on_loaded, private_mode=False)
    os._exit(0)

if __name__ == "__main__":
    if '--server-only' in sys.argv:
        run_server()
    else:
        start_desktop()
