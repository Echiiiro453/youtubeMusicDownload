import os
import subprocess
import sys
import shutil

def main():
    print("Iniciando processo de compilação do AppMusica...")
    
    # Certificar-se de que o PyInstaller está instalado
    try:
        import PyInstaller
    except ImportError:
        print("Instalando PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Arquivos binários que serão embutidos
    binaries = [
        ("ffmpeg.exe", "."),
        ("ffprobe.exe", "."),
        ("aria2c.exe", "."),
        ("node.exe", ".")
    ]
    
    # Arquivos de dados (Estáticos do Frontend, Termos)
    datas = [
        ("static", "static"),
        ("TERMOS_DE_USO.txt", "."),
        ("lyrics_fetcher.py", ".")
    ]
    
    # Imports ocultos (Essenciais para uvicorn e yt-dlp)
    hidden_imports = [
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "main",
        "utils",
        "downloader",
        "database",
        "yt_dlp.extractor",
        "curl_cffi",
        "webview",
        "webview.platforms.edgechromium",
        "syncedlyrics",
        "mutagen",
        "mutagen.id3",
        "mutagen.mp3",
        "mutagen.flac",
        "mutagen.mp4",
        "beautifulsoup4",
        "bs4"
    ]
    
    # Montar comando
    cmd = [
        "pyinstaller",
        "--noconfirm",
        "--onefile", 
        "--windowed", # Esconder o console CMD
        "--name", "AppMusica",
        "--icon", "icon.ico"
    ]
    
    for src, dst in binaries:
        if os.path.exists(os.path.join(base_dir, src)):
            cmd.extend(["--add-binary", f"{src};{dst}"])
        else:
            print(f"AVISO: {src} não encontrado! O executável pode não funcionar corretamente.")
            
    for src, dst in datas:
        if os.path.exists(os.path.join(base_dir, src)):
            cmd.extend(["--add-data", f"{src};{dst}"])
        else:
            print(f"AVISO: {src} não encontrado!")
            
    for imp in hidden_imports:
        cmd.extend(["--hidden-import", imp])
        
    cmd.append("backend_tray.py")
    
    print("\nExecutando PyInstaller com o comando:")
    print(" ".join(cmd))
    
    # Executar pyinstaller
    subprocess.check_call(cmd, cwd=base_dir)
    
    print("\n=======================================================")
    print("Compilação Concluída!")
    print("O seu executável 100% portátil está na pasta: backend/dist/AppMusica.exe")
    print("=======================================================")

if __name__ == "__main__":
    main()
