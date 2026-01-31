# Guia de Desenvolvimento - Music Downloader

Este documento serve como guia para desenvolvedores que desejam manter ou expandir o projeto.

## Estrutura do Projeto

- **/backend**: Código Python (FastAPI + yt-dlp).
  - `main.py`: Arquivo principal da API. Contém endpoints e lógica de download.
  - `venv/`: Ambiente virtual Python (NÃO COMITAR).
- **/frontend**: Código React (Vite + TailwindCSS).
  - `src/App.jsx`: Componente principal. Contém toda a lógica de UI e interação.
  - `src/index.css`: Estilos globais e Tailwind.

## Como Rodar o Projeto

1. **Backend**:
   ```bash
   cd backend
   .\venv\Scripts\activate
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

## Funcionalidades Principais

### 1. Playlist Manager
Localização: `frontend/src/App.jsx` (busca por "Playlist Manager")
- O estado `showPlaylistModal` controla a visibilidade.
- A função `fetchPlaylistDetails` chama o backend `/playlist/details`.
- O backend limita a busca a 50 itens para performance (`backend/main.py`).

### 2. Downloads
Localização: `backend/main.py` -> `download_music`
- Usa `yt-dlp` para baixar.
- Rotação de clientes ("tv", "android", "web") implementada para evitar erros 403.
- Cookies são carregados de `cookies.txt` na raiz do backend se existirem.

## Próximos Passos Sugeridos

1. **Paginação na Playlist**: Atualmente limitamos a 50 vídeos. O ideal seria implementar "Carregar Mais" no modal.
2. **Build Automático**: Criar scripts para gear o `.exe` automaticamente (usando PyInstaller).
3. **Refatoração do App.jsx**: O arquivo está grande (+800 linhas). Seria bom dividir em componentes menores (`PlaylistModal.jsx`, `SettingsModal.jsx`).

## Manutenção

- Sempre atualize `yt-dlp` periodicamente: `pip install --upgrade yt-dlp`
- Se o YouTube mudar algo e os downloads falharem, verifique se o `yt-dlp` está atualizado.
