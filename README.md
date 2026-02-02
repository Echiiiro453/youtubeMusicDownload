# 🎵 Multi-Platform Music Downloader
[![Website](https://img.shields.io/badge/Website-Visit%20Page-ff0050?style=for-the-badge&logo=github)](https://Echiiiro453.github.io/youtubeMusicDownload/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/Platforms-Desktop%20|%20Mobile%20|%20Web-brightgreen)](#)

Uma solução completa e profissional para download de músicas e vídeos, agora disponível para **Desktop (Windows)** e **Mobile (Android)**.

---

## 🌟 Visão Geral
Este projeto evoluiu de uma simples página web para um ecossistema multiplataforma robusto. Ele utiliza o poder do **yt-dlp** e **FFmpeg** no backend (Python) com interfaces modernas em **React** (Web/Desktop) e **React Native** (Android).

### ✨ Funcionalidades Principais
- **Áudio de Alta Fidelidade**: Suporte a MP3 (320kbps), M4A e FLAC (Lossless).
- **Vídeo em 4K**: Download de vídeos em alta resolução até 60fps.
- **Metadados Inteligentes**: Inserção automática de capas de álbum, artistas, títulos e letras 🎤.
- **Multi-Plataforma**: 
  - **🖥️ Desktop**: Aplicativo nativo ultra-leve construído com **Tauri (Rust)**.
  - **📱 Mobile**: APK standalone com backend embutido via **Chaquopy**.
  - **🌐 Web**: Interface responsiva e rápida.
- **Playlist Manager**: Seleção individual ou download em lote de playlists completas.
- **Magic Search**: Busque músicas colando links do Spotify ou Apple Music.

---

## 🏗️ Estrutura do Projeto
O repositório está organizado de forma modular para suportar todas as plataformas:

```text
youtubeMusicDownload/
├── 📂 backend/           # Lógica central em Python (FastAPI + yt-dlp)
├── 📂 frontend/          # Interface Web/Desktop principal
│   └── 📂 src-tauri/     # Configurações nativas do Desktop (Rust)
├── 📂 mobile/            # Aplicativo Android (React Native + Chaquopy)
├── 📂 docs/              # Landing Page do projeto (GitHub Pages)
└── 📄 README.md          # Esta documentação
```

---

## 🖥️ Como rodar: Desktop (Tauri + Rust)
A versão Desktop é a mais recomendada para uso pessoal, oferecendo performance nativa e transparência **Acrylic**.

### Pré-requisitos
- **Rust**: [Instalar via rustup.rs](https://rustup.rs/)
- **Node.js**: v18+

### Instruções
```bash
cd frontend
npm install
# Rodar em modo dev
npm run tauri dev
# Gerar instalador (.exe / .msi)
npm run tauri build
```

---

## 📱 Como rodar: Mobile (Android)
O aplicativo mobile roda o backend Python nativamente no seu celular!

### Pré-requisitos
- **Android Studio**
- **Java 17+**

### Instruções
1. Abra a pasta `mobile/android` no Android Studio.
2. O Gradle irá sincronizar automaticamente (baixando o Chaquopy e FFmpeg).
3. Conecte seu celular e rode:
```bash
cd mobile
npm install
npx react-native run-android
```

---

## 🌐 Como rodar: Web (Legacy/Dev)
Para rodar a versão web clássica no navegador:

**Terminal 1 (Backend):**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 📊 Roadmap de Evolução
Confira os próximos passos do projeto no [ROADMAP.md](ROADMAP.md).

## 📄 Licença
Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---
*Desenvolvido com ❤️ por [Echiiiro453](https://github.com/Echiiiro453)*
