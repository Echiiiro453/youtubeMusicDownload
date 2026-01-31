# 🎵 YouTube Music Downloader
[![Website](https://img.shields.io/badge/Website-Visit%20Page-ff0050?style=for-the-badge&logo=github)](https://Echiiiro453.github.io/youtubeMusicDownload/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-yellow)](https://www.python.org/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)](https://reactjs.org/)

[🇺🇸 English](#-english-description) | [🇧🇷 Português](#-descrição-em-português)

---

## 🇺🇸 English Description

**Advanced application for downloading music and videos from YouTube with high quality, automatic metadata, and lyrics support.**

This project separates itself from basic downloaders by offering a premium, ad-free experience with features tailored for music lovers and archivists.

### ✨ Key Features

- **High Fidelity Audio**: Download in **MP3 320kbps** or **FLAC** (Lossless).
- **4K Video Support**: Download videos up to 4K resolution / 60fps.
- **Smart Metadata**: Automatically finds and embeds:
  - Album Cover Art 🖼️
  - Correct Artist & Title 🎵
  - Release Year 📅
- **🎤 Lyrics Support**:
  - Fetches synchronized lyrics from YouTube.
  - Embeds them into the MP3/M4A file (viewable in players like MusicBee, Apple Music, etc).
- **Playlist Manager**:
  - Download entire playlists with a single click.
  - Selective downloading (choose specific tracks).
- **🛡️ Anti-Block System**:
  - Intelligent cookie handling to bypass YouTube's "403 Forbidden" errors.
  - Supports authenticated downloads for age-restricted content.

### 📸 Screenshots

> *Add your screenshots to the `screenshots/` folder and uncomment lines below*

<!-- 
![Main Interface](screenshots/main_interface.png)
![Playlist Download](screenshots/playlist_view.png) 
-->

### 🛠️ Prerequisites / Pré-requisitos

Before you start, ensure you have the following installed:
*Antes de começar, certifique-se de ter instalado:*

- **Python 3.10+**: [Download Here](https://www.python.org/downloads/)
- **Node.js 18+**: [Download Here](https://nodejs.org/)
- **Git**: [Download Here](https://git-scm.com/)
- **FFmpeg**: Essential for media processing.
  - *Windows*: `winget install "FFmpeg (Essentials)"` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
  - *Linux*: `sudo apt install ffmpeg`
  - *MacOS*: `brew install ffmpeg`

---

## 🚀 Installation Guide (English)

### 1. Clone the Repository
```bash
git clone https://github.com/Echiiiro453/youtubeMusicDownload.git
cd youtubeMusicDownload
```

### 2. Backend Setup
The backend handles the downloads and audio processing.

```bash
cd backend
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup
The frontend is the user interface designed with React.

```bash
# Open a new terminal window/tab
cd frontend

# Install Node dependencies
npm install
```

### 4. Running the App
You need two terminal windows running simultaneously.

**Terminal 1 (Backend):**
```bash
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173` to use the app.

---

## 🚀 Guia de Instalação (Português)

### 1. Clonar o Repositório
```bash
git clone https://github.com/Echiiiro453/youtubeMusicDownload.git
cd youtubeMusicDownload
```

### 2. Configuração do Backend
O backend é responsável por baixar e processar os arquivos.

```bash
cd backend
# Criar ambiente virtual
python -m venv venv

# Ativar o ambiente virtual
# No Windows:
.\venv\Scripts\activate
# No Linux/Mac:
source venv/bin/activate

# Instalar as dependências do Python
pip install -r requirements.txt
```

### 3. Configuração do Frontend
O frontend é a interface visual onde você interage com o app.

```bash
# Abra um novo terminal
cd frontend

# Instalar dependências do Node.js
npm install
```

### 4. Rodando o Projeto
Você precisa de dois terminais rodando ao mesmo tempo.

**Terminal 1 (Backend):**
```bash
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
Acesse `http://localhost:5173` no seu navegador para usar.

---

## 📖 How to Use / Como Usar

1. **Copy Link**: Copy a YouTube URL (Video, Music, or Playlist).
2. **Paste**: Paste it into the input field.
3. **Choose Format**: Select `MP3`, `FLAC` for audio or `MP4` for video.
4. **Download**: Click the download button and wait for the process to finish.
   - *Check the "Downloads" folder in the backend directory.*


## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
