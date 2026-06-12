import os
import zipfile
import threading
import queue
import json
import urllib.request
import time

# Lazy load so they don't break main.py if missing on a user's PC before building
import sounddevice as sd
from vosk import Model, KaldiRecognizer

MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip"
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "vosk-model-small-pt-0.3")
ZIP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "vosk-model-small-pt.zip")

class VoiceEngine:
    def __init__(self, callback):
        self.callback = callback
        self.is_running = False
        self.is_downloading = False
        self.audio_queue = queue.Queue()
        self.thread = None

    def ensure_model_exists(self):
        models_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        os.makedirs(models_base, exist_ok=True)

        if not os.path.exists(MODEL_DIR):
            self.is_downloading = True
            print("[Voice] Baixando modelo Vosk (40MB)...")
            try:
                urllib.request.urlretrieve(MODEL_URL, ZIP_PATH)
                print("[Voice] Extraindo modelo Vosk...")
                with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
                    zip_ref.extractall(models_base)
                os.remove(ZIP_PATH)
                print("[Voice] Modelo Vosk pronto!")
            except Exception as e:
                print(f"[Voice] Erro ao baixar modelo: {e}")
                self.is_downloading = False
                return False
            self.is_downloading = False
        return True

    def _audio_callback(self, indata, frames, time_info, status):
        if status:
            print(f"[Voice] Error in audio stream: {status}", flush=True)
        self.audio_queue.put(bytes(indata))

    def _recognize_loop(self):
        try:
            model = Model(MODEL_DIR)
            rec = KaldiRecognizer(model, 16000)
            
            with sd.RawInputStream(samplerate=16000, blocksize=8000, device=None, dtype='int16',
                                   channels=1, callback=self._audio_callback):
                print("[Voice] Escutando comandos...")
                while self.is_running:
                    data = self.audio_queue.get()
                    if rec.AcceptWaveform(data):
                        result = json.loads(rec.Result())
                        text = result.get("text", "").lower()
                        if text:
                            print(f"[Voice] Ouvido: {text}")
                            self._parse_command(text)
        except Exception as e:
            print(f"[Voice] Engine loop error: {e}")
            self.is_running = False

    def _parse_command(self, text):
        aliases = ["lumina", "luminaria", "luminária", "ilumina", "domina", "numina", "mina"]
        if any(alias in text for alias in aliases):
            if "pausar" in text or "pausa" in text or "parar" in text:
                self.callback({"type": "voice_command", "action": "pause"})
            elif "tocar" in text or "play" in text or "continuar" in text:
                self.callback({"type": "voice_command", "action": "play"})
            elif "próxima" in text or "pular" in text:
                self.callback({"type": "voice_command", "action": "next"})
            elif "voltar" in text or "anterior" in text:
                self.callback({"type": "voice_command", "action": "prev"})

    def start(self):
        if self.is_running or self.is_downloading:
            return
        
        # Download in background thread if needed
        def startup_routine():
            if self.ensure_model_exists():
                self.is_running = True
                self._recognize_loop()
        
        self.thread = threading.Thread(target=startup_routine, daemon=True)
        self.thread.start()

    def stop(self):
        self.is_running = False
        if self.thread:
            # We don't join to avoid blocking API, daemon thread will die or exit loop
            self.thread = None

    def get_status(self):
        if self.is_downloading:
            return "downloading"
        if self.is_running:
            return "running"
        return "stopped"

