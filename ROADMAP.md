# Music Downloader - Roadmap de Features

## 🎯 Prioridade ALTA (Próximas Implementações)

- [x] **Playlist Manager Avançado**
  - [x] Backend: Endpoint para listar todos os vídeos da playlist (`/playlist/details`)
  - [x] Backend: Download playlist com seleção individual
  - [x] Frontend: UI para mostrar lista de vídeos
  - [x] Frontend: Checkboxes para selecionar músicas
  - [ ] Frontend: Progresso individual por música (Implementado progresso geral)
  - [x] Frontend: Contador "X de Y músicas selecionadas"

- [x] **Busca Integrada do YouTube**
  - [x] Backend: Endpoint de busca usando yt-dlp
  - [x] Frontend: Barra de pesquisa (Híbrida com URL)
  - [x] Frontend: Grid de resultados com thumbnails
  - [x] Frontend: Download direto do resultado

- [ ] **Sistema de Presets**
  - [ ] Backend: Salvar/carregar presets
  - [ ] Frontend: UI de criação de preset
  - [ ] Frontend: Dropdown de presets prontos
  - [ ] Presets padrão: Nightcore, Slowed, Podcast

- [ ] **Download em Lote (Batch)**
  - [ ] Backend: Fila de downloads
  - [ ] Backend: Sistema de priorização
  - [ ] Frontend: UI de fila com drag & drop
  - [ ] Frontend: Pausar/retomar/cancelar individual

## 🎨 UI/UX Improvements

- [ ] **Toast de Notificações Melhorado**
  - [ ] Animações de entrada/saída
  - [ ] Botão "Abrir Pasta" no toast
  - [ ] Som de conclusão opcional

- [ ] **Tema Claro/Escuro**
  - [ ] Toggle de tema na UI
  - [ ] Persistir preferência
  - [ ] Transição suave entre temas

- [ ] **Preview de Thumbnail Melhorado**
  - [ ] Thumbnail maior no hover
  - [ ] Info do canal/uploader
  - [ ] Views e data de publicação

- [ ] **Skeleton Loading**
  - [ ] Durante carregamento de info
  - [ ] Na lista de playlist
  - [ ] No histórico

## ⚡ Features Avançadas

- [ ] **Conversor de Formatos**
  - [ ] UI para selecionar arquivos baixados
  - [ ] Conversão sem re-download
  - [ ] Batch conversion

- [ ] **Legendas Automáticas**
  - [ ] Download de legendas (SRT/VTT)
  - [ ] Queimar legendas no vídeo
  - [ ] Seleção de idioma

- [ ] **Cache de Metadados**
  - [ ] SQLite para cache local
  - [ ] TTL configurável
  - [ ] Botão limpar cache

- [ ] **Download Paralelo**
  - [ ] Configurar limite de simultâneos
  - [ ] Medidor de uso de banda
  - [ ] Throttling opcional

## 🎵 Audio Features

- [ ] **Normalizador de Volume**
  - [ ] ReplayGain integration
  - [ ] Análise de loudness
  - [ ] Aplicação automática

- [ ] **Efeitos Extras**
  - [ ] Reverb/Echo
  - [ ] Compressor
  - [ ] 3D Audio

- [ ] **Detecção de BPM**
  - [ ] Librosa integration
  - [ ] Mostrar BPM na UI
  - [ ] Filtrar por BPM

## 📊 Analytics & Gestão

- [ ] **Dashboard de Estatísticas**
  - [ ] Total de downloads
  - [ ] GB baixados
  - [ ] Gráficos de uso
  - [ ] Top artistas/canais

- [ ] **Organizador Automático**
  - [ ] Criar pastas por artista
  - [ ] Padrão de renomeação configurável
  - [ ] Auto-tag com metadados

- [ ] **Backup & Sync**
  - [ ] Export/import de histórico
  - [ ] Sync com nuvem (opcional)
  - [ ] Restauração de configurações

## 🔧 Funcionalidades Técnicas

- [ ] **Agendador de Downloads**
  - [ ] Interface de agendamento
  - [ ] Cron-like syntax
  - [ ] Notificação ao completar

- [ ] **Modo Privado**
  - [ ] Toggle "modo anônimo"
  - [ ] Não salvar histórico
  - [ ] Auto-limpar ao fechar

- [ ] **Webserver Remoto**
  - [ ] API REST completa
  - [ ] UI mobile-friendly
  - [ ] QR Code para conexão

## 🌐 Integrações

- [ ] **Mais Plataformas** (SoundCloud, Bandcamp, TikTok, Instagram, Vimeo)
- [ ] **Importar Playlists Spotify** (Matching inteligente)
- [ ] **Editor ID3 Avançado** (MusicBrainz, Letras)

## 🎁 Extras

- [ ] **Player Integrado** (Waveform, Playback)
- [ ] **Modo Karaokê** (Spleeter)
- [ ] **Sistema de Plugins**

---

### 📝 Status Atual
**Implementado:** ✅
- Sistema de rotação de clientes
- Download básico de áudio/vídeo
- Pitch shifting
- Speed control
- Equalizer
- Trim/corte de vídeo
- Editor de metadata
- Histórico de downloads
- Upload de cookies
- Support para Spotify/Apple Music (Magic Search)
- Playlist Manager Avançado (Básico funcional ✅)

**Em Progresso:** 🔄
- Melhorias na UI de Playlist
