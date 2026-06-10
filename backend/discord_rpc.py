import time
import threading
from pypresence import Presence

CLIENT_ID = "1316441416954257418"  # Replace with actual Discord Client ID
_rpc = None
_connected = False
_start_time = None
_lock = threading.Lock()

def connect_rpc():
    global _rpc, _connected
    try:
        if _connected:
            return
        _rpc = Presence(CLIENT_ID)
        _rpc.connect()
        _connected = True
        print("Discord RPC Conectado!")
    except Exception as e:
        print(f"Não foi possível conectar ao Discord RPC (Pode estar fechado): {e}")
        _connected = False

def update_presence(title, artist, is_playing, cover_url=None):
    global _rpc, _connected, _start_time
    
    with _lock:
        if not _connected:
            # Try to reconnect silently
            try:
                connect_rpc()
            except:
                pass
            
        if not _connected:
            return

        try:
            if not is_playing:
                _start_time = None
                _rpc.update(
                    state="Pausado",
                    details=title,
                    large_image=cover_url or "lumina_logo",
                    large_text=artist,
                    small_image="pause",
                    small_text="Pausado"
                )
            else:
                if _start_time is None:
                    _start_time = int(time.time())
                
                _rpc.update(
                    state=f"por {artist}",
                    details=title,
                    start=_start_time,
                    large_image=cover_url or "lumina_logo",
                    large_text=title,
                    small_image="play",
                    small_text="Ouvindo"
                )
        except Exception as e:
            print(f"Erro ao atualizar Discord RPC: {e}")
            _connected = False

def disconnect_rpc():
    global _rpc, _connected
    with _lock:
        if _connected and _rpc:
            try:
                _rpc.close()
            except:
                pass
        _connected = False
