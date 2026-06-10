import os
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# Global state for miniplayer synchronization
miniplayer_state = {
    "title": "",
    "artist": "",
    "cover_url": "",
    "isPlaying": False,
    "progress": 0,
    "duration": 0
}
command_queue = []

class MiniPlayerState(BaseModel):
    title: str
    artist: str
    cover_url: str
    isPlaying: bool
    progress: float
    duration: float

class MiniPlayerCommand(BaseModel):
    command: str  # "play", "pause", "next", "prev"

@router.post("/api/miniplayer/state")
def update_miniplayer_state(state: MiniPlayerState):
    global miniplayer_state
    miniplayer_state = state.dict()
    return {"success": True}

@router.get("/api/miniplayer/state")
def get_miniplayer_state():
    return miniplayer_state

@router.post("/api/miniplayer/command")
def send_command(cmd: MiniPlayerCommand):
    command_queue.append(cmd.command)
    return {"success": True}

@router.get("/api/miniplayer/command")
def poll_command():
    if command_queue:
        cmd = command_queue.pop(0)
        return {"command": cmd}
    return {"command": None}

@router.get("/miniplayer", response_class=HTMLResponse)
def miniplayer_html():
    return """
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lumina Mini</title>
        <style>
            :root {
                --primary: #a855f7;
                --bg: #09090b;
                --surface: #18181b;
                --text: #ffffff;
                --text-muted: #a1a1aa;
            }
            body {
                margin: 0; padding: 0;
                background-color: var(--bg);
                color: var(--text);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                overflow: hidden;
                user-select: none;
                -webkit-app-region: drag; /* Makes the window draggable */
            }
            .container {
                display: flex;
                align-items: center;
                height: 100vh;
                padding: 0 12px;
                box-sizing: border-box;
                gap: 12px;
            }
            .cover {
                width: 60px;
                height: 60px;
                border-radius: 12px;
                background-color: var(--surface);
                object-fit: cover;
                flex-shrink: 0;
                -webkit-app-region: no-drag;
            }
            .info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .title {
                font-size: 14px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin: 0;
            }
            .artist {
                font-size: 11px;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin: 2px 0 0 0;
            }
            .controls {
                display: flex;
                align-items: center;
                gap: 8px;
                -webkit-app-region: no-drag;
            }
            .btn {
                background: none;
                border: none;
                color: var(--text);
                cursor: pointer;
                padding: 6px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .btn:hover {
                background: var(--surface);
            }
            .btn-play {
                background: var(--text);
                color: var(--bg);
                padding: 8px;
            }
            .btn-play:hover {
                background: var(--primary);
                color: white;
            }
            .progress-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: var(--surface);
                width: 100%;
            }
            .progress-fill {
                height: 100%;
                background: var(--primary);
                width: 0%;
                transition: width 0.3s linear;
            }
            svg { width: 18px; height: 18px; }
            .btn-play svg { width: 20px; height: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <img id="cover" class="cover" src="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'%2318181b\\'></svg>'" />
            <div class="info">
                <p id="title" class="title">Nenhuma música</p>
                <p id="artist" class="artist">-</p>
            </div>
            <div class="controls">
                <button class="btn" onclick="sendCommand('prev')">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                </button>
                <button class="btn btn-play" id="playBtn" onclick="togglePlay()">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button class="btn" onclick="sendCommand('next')">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
            </div>
        </div>
        <div class="progress-bar">
            <div id="progress" class="progress-fill"></div>
        </div>

        <script>
            let isPlaying = false;
            
            function sendCommand(cmd) {
                fetch('/api/miniplayer/command', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({command: cmd})
                });
            }
            
            function togglePlay() {
                sendCommand(isPlaying ? 'pause' : 'play');
                // Optmistic UI
                isPlaying = !isPlaying;
                updatePlayBtn();
            }
            
            function updatePlayBtn() {
                const btn = document.getElementById('playBtn');
                if (isPlaying) {
                    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
                } else {
                    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
                }
            }
            
            async function fetchState() {
                try {
                    const res = await fetch('/api/miniplayer/state');
                    const state = await res.json();
                    
                    document.getElementById('title').textContent = state.title || 'Lumina';
                    document.getElementById('artist').textContent = state.artist || 'Aguardando...';
                    
                    if (state.cover_url && document.getElementById('cover').src !== state.cover_url) {
                        document.getElementById('cover').src = state.cover_url;
                    }
                    
                    if (state.duration > 0) {
                        const pct = (state.progress / state.duration) * 100;
                        document.getElementById('progress').style.width = pct + '%';
                    }
                    
                    if (isPlaying !== state.isPlaying) {
                        isPlaying = state.isPlaying;
                        updatePlayBtn();
                    }
                } catch (e) {}
            }
            
            setInterval(fetchState, 500);
            fetchState();
        </script>
    </body>
    </html>
    """
