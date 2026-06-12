import winreg
import sys
import os

def register_extension(ext, prog_id, desc, icon, exe_path):
    try:
        # 1. Create ProgID
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{prog_id}") as key:
            winreg.SetValue(key, "", winreg.REG_SZ, desc)
            
            with winreg.CreateKey(key, "DefaultIcon") as icon_key:
                winreg.SetValue(icon_key, "", winreg.REG_SZ, icon)
            
            with winreg.CreateKey(key, r"shell\open\command") as cmd_key:
                winreg.SetValue(cmd_key, "", winreg.REG_SZ, f'"{exe_path}" "%1"')

        # 2. Link Extension to ProgID
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{ext}") as ext_key:
            winreg.SetValue(ext_key, "", winreg.REG_SZ, prog_id)

    except Exception as e:
        print(f"Erro ao registrar {ext}: {e}")
        raise e

def run_registration():
    exe_path = sys.executable
    icon_path = f"{exe_path},0"
    
    extensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg']
    for ext in extensions:
        register_extension(ext, "Lumina.AudioFile", "Lumina Audio File", icon_path, exe_path)

if __name__ == '__main__':
    # Se estiver empacotado, sys.executable aponta para Lumina.exe
    exe_path = sys.executable
    icon_path = f"{exe_path},0"
    
    extensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg']
    for ext in extensions:
        register_extension(ext, "Lumina.AudioFile", "Lumina Audio File", icon_path, exe_path)
    
    print("Registros adicionados com sucesso! O Lumina agora aparecerá no menu 'Abrir com'.")
