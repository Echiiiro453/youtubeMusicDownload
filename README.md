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
  - **🖥️ Desktop**: Ultra-lightweight native app built with **Tauri (Rust)**.
- **Magic Search**: Search for songs by pasting Spotify or Apple Music links.
- **Smart Retry**: Intelligent system to bypass YouTube blocks (403 errors).

### 🏗️ Project Structure
```text
youtubeMusicDownload/
├── 📂 backend/           # Core Python Logic (FastAPI + yt-dlp)
├── 📂 frontend/          # Web/Desktop Interface (React)
│   └── 📂 src-tauri/     # Native Desktop Configs (Rust)
└── 📄 README.md          # Documentation
```

### 🖥️ Desktop Setup (Tauri)
1. Install [Rust](https://rustup.rs/) and [Node.js](https://nodejs.org/).
2. `cd frontend && npm install`
3. `npm run tauri dev` (Dev mode) or `npm run tauri build` (Generate .exe).

---

## 🇧🇷 Português

### 🌟 Visão Geral
O AppMusica é uma solução profissional para download de músicas e vídeos do YouTube, disponível para **Desktop (Windows)**.

### ✨ Funcionalidades Principais
- **Áudio de Alta Fidelidade**: Suporte para MP3 (320kbps), M4A e FLAC (Lossless).
- **Vídeo em 4K**: Download de vídeos em alta resolução até 60fps.
- **Metadados Inteligentes**: Inserção automática de capas, artistas, títulos e **letras** 🎤.
- **Multi-Plataforma**: 
  - **🖥️ Desktop**: App nativo leve construído com **Tauri (Rust)**.
- **Magic Search**: Busque músicas colando links do Spotify ou Apple Music.
- **Smart Retry**: Sistema inteligente para ignorar bloqueios do YouTube (erros 403).

### 🏗️ Estrutura do Projeto
```text
youtubeMusicDownload/
├── 📂 backend/           # Lógica central em Python
├── 📂 frontend/          # Interface Web/Desktop
│   └── 📂 src-tauri/     # Configurações Tauri (Rust)
└── 📄 README.md          # Documentação
```

### 🖥️ Configuração Desktop (Tauri)
1. Instale o [Rust](https://rustup.rs/) e o [Node.js](https://nodejs.org/).
2. `cd frontend && npm install`
3. `npm run tauri dev` (Modo dev) ou `npm run tauri build` (Gerar .exe).

---
*Developed with ❤️ by [Echiiiro453](https://github.com/Echiiiro453)*
