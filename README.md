[![Website](https://img.shields.io/badge/Website-Visit%20Page-ff0050?style=for-the-badge&logo=github)](https://Echiiiro453.github.io/youtubeMusicDownload/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/Platforms-Desktop%20|%20Web-brightgreen)](#)

[🇺🇸 English](#-english) | [🇧🇷 Português](#-português)

---

## 🇺🇸 English

### 🌟 Overview
AppMusica is a professional solution for downloading music and videos from YouTube, available for **Desktop (Windows)**.

### ✨ Key Features
- **High Fidelity Audio**: Support for MP3 (320kbps), M4A, and FLAC (Lossless).
- **4K Video**: Download high-resolution videos up to 60fps.
- **Smart Metadata**: Automatic embedding of album covers, artists, titles, and **lyrics** 🎤.
- **Multi-Platform**: 
  - **🖥️ Desktop**: Ultra-lightweight portable `.exe` built with **PyWebView & FastAPI**.
- **Magic Search**: Search for songs by pasting Spotify or Apple Music links.
- **Smart Retry & Proxy Survival**: Intelligent system with 4 fallback clients and free rotating proxies to bypass YouTube blocks (download 1000+ songs easily).
- **Queue Memory**: Automatically saves your pending downloads so you can resume them anytime.

### 🏗️ Project Structure
```text
youtubeMusicDownload/
├── 📂 backend/           # Core Python Logic (FastAPI + yt-dlp + PyInstaller)
├── 📂 frontend/          # Web/Desktop Interface (React)
└── 📄 README.md          # Documentation
```

### 🖥️ Desktop Setup (Development)
1. Install [Node.js](https://nodejs.org/) and [Python 3.10+](https://www.python.org/).
2. Setup Frontend: `cd frontend && npm install && npm run build`
3. Setup Backend: `cd backend && pip install -r requirements.txt`
4. Build Portable `.exe`: `python build_exe.py`

---

## 🇧🇷 Português

### 🌟 Visão Geral
O AppMusica é uma solução profissional para download de músicas e vídeos do YouTube, disponível para **Desktop (Windows)**.

### ✨ Funcionalidades Principais
- **Áudio de Alta Fidelidade**: Suporte para MP3 (320kbps), M4A e FLAC (Lossless).
- **Vídeo em 4K**: Download de vídeos em alta resolução até 60fps.
- **Metadados Inteligentes**: Inserção automática de capas, artistas, títulos e **letras** 🎤.
- **Multi-Plataforma**: 
  - **🖥️ Desktop**: App nativo leve e 100% portátil (`.exe`) construído com **PyWebView & FastAPI**.
- **Magic Search**: Busque músicas colando links do Spotify ou Apple Music.
- **Smart Retry & Proxy Survival**: Sistema inteligente com 4 clientes de fallback e proxies rotativos gratuitos para ignorar bloqueios do YouTube (baixe 1000+ músicas seguidas).
- **Memória de Fila**: Salva automaticamente seus downloads pendentes para você continuar de onde parou.

### 🏗️ Estrutura do Projeto
```text
youtubeMusicDownload/
├── 📂 backend/           # Lógica central em Python (FastAPI + yt-dlp)
├── 📂 frontend/          # Interface Web/Desktop (React)
└── 📄 README.md          # Documentação
```

### 🖥️ Configuração Desktop (Desenvolvimento)
1. Instale o [Node.js](https://nodejs.org/) e o [Python 3.10+](https://www.python.org/).
2. Frontend: `cd frontend && npm install && npm run build`
3. Backend: `cd backend && pip install -r requirements.txt`
4. Compilar `.exe` portátil: `python build_exe.py`

---
*Developed with ❤️ by [Echiiiro453](https://github.com/Echiiiro453)*
