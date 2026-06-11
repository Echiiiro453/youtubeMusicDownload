import re

f = 'e:/youtubr/youtubeMusicDownload-main/backend/main.py'
content = open(f, 'r', encoding='utf-8').read()

# Add import
if 'from voice_engine import VoiceEngine' not in content:
    content = content.replace('from database import init_db, get_conn', 
                              'from database import init_db, get_conn\nfrom voice_engine import VoiceEngine')

# Add Voice Engine logic after manager = ConnectionManager()
voice_logic = """manager = ConnectionManager()

# --- VOICE ENGINE INTEGRATION ---
import asyncio

def on_voice_command(action_data):
    # Executado pela thread em background do Vosk
    try:
        # Acessar o loop ativo da thread principal do Uvicorn para rodar corrotina async
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast_json(action_data))
    except RuntimeError:
        pass

voice_engine = VoiceEngine(on_voice_command)
# --------------------------------
"""

if 'def on_voice_command' not in content:
    content = content.replace('manager = ConnectionManager()', voice_logic)

# Add API Routes near the bottom
voice_routes = """
@app.get("/api/voice/status")
def get_voice_status():
    return {"status": voice_engine.get_status()}

@app.post("/api/voice/toggle")
def toggle_voice():
    current_status = voice_engine.get_status()
    if current_status == "running" or current_status == "downloading":
        voice_engine.stop()
    else:
        voice_engine.start()
    return {"status": voice_engine.get_status()}
"""

if '/api/voice/status' not in content:
    # Append before the shutdown event
    content = content.replace('@app.on_event("shutdown")', voice_routes + '\n@app.on_event("shutdown")')

open(f, 'w', encoding='utf-8').write(content)
print("Injected Voice Engine into main.py")
