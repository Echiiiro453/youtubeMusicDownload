# 🎵 Music Downloader
[![Website](https://img.shields.io/badge/Website-Visit%20Page-ff0050?style=for-the-badge&logo=github)](https://Echiiiro453.github.io/appmusicaYoutube/)


Aplicativo avançado para download de músicas e vídeos do YouTube com alta qualidade, metadados automáticos e suporte a letras.

![Interface](https://github.com/user-attachments/assets/placeholder.png)

## ✨ Funcionalidades

- **Alta Qualidade**: Downloads de áudio em MP3 320kbps e FLAC.
- **Vídeos 4K**: Suporte a downloads de vídeo em até 4K.
- **Metadados Completos**: Capa do álbum, Artista, Título e Álbum embutidos automaticamente.
- **🎤 Legendas e Letras**:
  - O aplicativo busca legendas/letras no YouTube.
  - Elas são embutidas automaticamente no arquivo MP3/M4A.
  - Compatível com a maioria dos players de música.
- **Gerenciador de Playlists**:
  - Selecione quais vídeos baixar de uma playlist.
  - Baixe dezenas de músicas de uma vez.
- **🛡️ Proteção Anti-Bloqueio**:
  - Sistema inteligente que previne bloqueios do YouTube.
  - Alerta e bloqueia downloads em massa (>20 itens) se você não estiver autenticado.
- **Corte e Edição**: Recorte trechos específicos do áudio/vídeo antes de baixar.

---

## 🚀 Como Usar (Versão Executável)

Se você recebeu o arquivo `AppMusica.exe`:

1. **Localize o arquivo**: Geralmente na pasta `backend/dist` ou onde foi descompactado.
2. **Execute**: Dê dois cliques em `AppMusica.exe`.
   - *Nota*: Pode demorar alguns segundos para abrir na primeira vez enquanto carrega o servidor interno.
3. **Acesse**: Uma janela preta do terminal irá abrir (não feche ela!) e o navegador deve abrir automaticamente em `http://localhost:8000`.

---

## 🍪 Configuração de Cookies (IMPORTANTE)

O YouTube bloqueia downloads rápidos ou em grande quantidade se você não estiver "logado". Para baixar playlists ou evitar o erro `HTTP Error 403: Forbidden`, você precisa fornecer seus cookies.

### Como conseguir o arquivo `cookies.txt`:

1. Instale a extensão **"Get cookies.txt LOCALLY"** no seu navegador (Chrome/Edge/Firefox).
   - [Link para Chrome Store](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflccgomilepojc)
2. Acesse o [YouTube](https://www.youtube.com) e faça login na sua conta.
3. Clique na extensão e depois no botão **"Export"** (selecione "Netscape format" se perguntar, ou apenas baixe).
4. Salve o arquivo como `cookies.txt`.

### Onde colocar o arquivo:

**Opção A (Recomendada - Via App):**
1. No aplicativo, clique no botão **Configurar** (ícone de engrenagem no topo direito).
2. Clique em **"Carregar cookies.txt"**.
3. Selecione o arquivo que você baixou.

**Opção B (Manual):**
1. Pegue o arquivo `cookies.txt`.
2. Cole ele na **mesma pasta** onde está o `AppMusica.exe`.

---

## ❓ Solução de Problemas

### Erro: "HTTP Error 403: Forbidden"
- **Causa**: O YouTube bloqueou o download porque detectou comportamento de robô.
- **Solução**: Você PRECISA configurar o arquivo `cookies.txt` conforme explicado acima.

### Erro: "Video unavailable" (Bloqueio Temporário)
- **Causa**: Você tentou baixar muitas músicas sem cookies e seu IP foi bloqueado temporariamente (rate-limit).
- **Solução**: Espere cerca de 1 hora e tente novamente COMP o `cookies.txt` configurado.

### O download não começa
- Verifique se a janela preta (terminal) do programa ainda está aberta. O navegador precisa dela para funcionar.

---

## 💻 Para Desenvolvedores

### Pré-requisitos
- Python 3.10+
- Node.js 18+
- FFmpeg (instalado e no PATH)

### Instalação

1. Clone o repositório.
2. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm install
   ```

### Rodando Localmente

1. **Terminal 1 (Backend)**:
   ```bash
   cd backend
   .\venv\Scripts\activate
   uvicorn main:app --reload
   ```
2. **Terminal 2 (Frontend)**:
   ```bash
   cd frontend
   npm run dev
   ```

### Gerando o Executável (.exe)

```bash
cd backend
# Certifique-se de que o frontend foi buildado (npm run build)
python -m PyInstaller build.spec
```
