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

### 🚀 How to Run (Source Code)

1. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **FFmpeg**: Ensure FFmpeg is installed and added to your system PATH.

---

## 🇧🇷 Descrição em Português

**Aplicativo avançado para download de músicas e vídeos do YouTube com alta qualidade, metadados automáticos e suporte a letras.**

Este projeto oferece uma experiência premium, sem anúncios, focada em quem ama organizar sua biblioteca musical.

### ✨ Funcionalidades

- **Alta Qualidade**: Downloads de áudio em **MP3 320kbps** e **FLAC**.
- **Vídeos 4K**: Suporte a downloads de vídeo em até 4K.
- **Metadados Completos**: Capa do álbum, Artista, Título e Álbum embutidos automaticamente.
- **🎤 Legendas e Letras**:
  - O aplicativo busca legendas/letras no YouTube.
  - Elas são embutidas automaticamente no arquivo MP3/M4A.
- **Gerenciador de Playlists**:
  - Baixe playlists inteiras de uma vez.
  - Selecione apenas as músicas que você quer.
- **🛡️ Proteção Anti-Bloqueio**:
  - Sistema inteligente que previne bloqueios do YouTube (Erro 403).
  - Suporte a cookies para baixar vídeos com restrição de idade.

### 📸 Capturas de Tela

> *Adicione suas imagens na pasta `screenshots/` e descomente as linhas abaixo*

<!-- 
![Interface Principal](screenshots/interface_pt.png)
-->

### 🍪 Configuração de Cookies (Importante)

Para baixar playlists grandes ou evitar bloqueios, o uso de **cookies.txt** é recomendado.
1. Use a extensão "Get cookies.txt LOCALLY".
2. Salve o arquivo como `cookies.txt` na pasta do executável ou carregue via Configurações no app.

---

## 💻 Tech Stack / Tecnologias

- **Backend**: Python, FastAPI, yt-dlp, FFmpeg
- **Frontend**: React, Vite, TailwindCSS, Lucide Icons
- **Build**: PyInstaller (Standalone .exe)

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
