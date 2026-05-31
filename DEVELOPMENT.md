# Guia de Desenvolvimento - AppMusica

Este documento serve como guia para desenvolvedores que desejam manter ou expandir o projeto.

## Estrutura do Projeto

- **/backend**: Código Python (FastAPI + yt-dlp + PyWebView).
  - `main.py`: Arquivo principal da aplicação. Inicia o servidor FastAPI e a janela do WebView nativa.
  - `downloader.py`: Motor de download utilizando `yt-dlp` e manipulação de metadados.
  - `database.py`: Gerenciamento do SQLite para controle de duplicatas e persistência (suporte a histórico e downloads em lote/singles).
  - `AppMusica.spec`: Arquivo de configuração do PyInstaller para build.
- **/frontend**: Código React (Vite + TailwindCSS).
  - `src/App.jsx`: Componente central. Gerencia o roteamento, fila global (WebSockets) e a interface principal.
  - `src/components/`: Componentes modulares como `PlaylistModal`, `SettingsModal`, `PlayerBar` e `LogViewerModal`.
  - `src/i18n.js`: Sistema nativo de internacionalização (i18n) em 3 idiomas (PT, EN, ES).
  - `src/index.css`: Estilos globais Tailwind e CSS personalizado (efeitos Glassmorphism).

## Como Rodar o Projeto

1. **Terminal 1 - Frontend (Desenvolvimento)**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Terminal 2 - Backend (Servidor Local)**:
   ```bash
   cd backend
   .\venv\Scripts\activate
   # Para ambiente de desenvolvimento sem abrir a janela PyWebView:
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## Compilação e Distribuição

A arquitetura mudou de Tauri para **PyWebView** com empacotamento standalone.
Para gerar o arquivo `.exe` portátil (Windows):

1. Gere o build de produção do frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Crie o executável via PyInstaller (requer `backend/AppMusica.spec`):
   ```bash
   cd backend
   pyinstaller --noconfirm AppMusica.spec
   ```
O executável final estará na pasta `backend/dist/AppMusica.exe`.

## Funcionalidades Principais

### 1. Sistema de Fila (Queue) e Banco de Dados
- **Fila e Retomada**: Interface salva a fila no `localStorage` e pergunta ao usuário se ele quer retomar downloads não concluídos.
- **Prevenção de Duplicatas**: `database.py` registra o verdadeiro `video_id` vindo do `yt-dlp` para singles e playlists, garantindo robustez e impedindo re-downloads desnecessários.

### 2. Downloads e Proxy Survival Mode
- O `downloader.py` usa o `yt-dlp` implementando uma rotação pesada de clientes (`tv_embedded`, `web`, `android`, `ios`) e pode utilizar proxies do `proxyscrape` se necessário para fugir de banimentos de IP e erros 403 do YouTube.
- **Autenticação**: O app lê o arquivo `cookies.txt` (carregado via modal de configurações) para destravar downloads com limite de idade e qualidades máximas de vídeos.

### 3. Internacionalização (i18n)
- A função `t(key)` no frontend gerencia traduções. Qualquer nova string adicionada na interface deve ser registrada em `frontend/src/i18n.js` para manter a paridade com Inglês, Espanhol e Português.

## Manutenção Constante

- **MUITO IMPORTANTE:** Sempre mantenha o `yt-dlp` atualizado. O YouTube muda constantemente suas APIs e o `yt-dlp` lança atualizações para lidar com isso.
  ```bash
  pip install --upgrade yt-dlp
  ```
- Logs no backend foram reduzidos intencionalmente para mostrar apenas eventos de sucesso/falha do banco de dados, mantendo o terminal e o visualizador de logs limpos.
