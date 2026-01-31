# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [Não Lançado] - 2026-01-29

### Adicionado
- **Busca Integrada**: Pesquisa de vídeos do YouTube diretamente na barra inicial.
  - Endpoint `/search` backend (ytsearch10).
  - UI de resultados com grid interativa na home.
- **Suporte Multi-Plataforma Universal**: Input agora aceita links de qualquer site (Twitch, Kick, Instagram, etc) suportado pelo yt-dlp.
- **Player Integrado**: Escute suas músicas baixadas diretamente no app com controles de volume e barra de progresso.
- **Organização Automática**: Toggle nas Configurações para criar pastas automaticamente com o nome do Artista.
- **Botões de Ação Dupla**: Interface inteligente com botões "Pesquisar" e "Acessar Link".
- **Limites Configuráveis**: Seletor de quantidade de resultados (10 a 100) e playlist (50 a Todos).
- **Batch Download Robusto**: Sistema de fila com delay "humanizado" para evitar bloqueios do YouTube em downloads massivos.
- **Botão Sair**: Nova opção nas Configurações para encerrar completamente o servidor e o aplicativo.
- **Estabilidade em Efeitos**: Correção do erro "Invalid Argument" 500 ao usar Nightcore e outros efeitos, separando o processo de mixagem do download.
- **Skeleton Loading**: Animações de carregamento premium substituem spinners em Busca e Playlists para experiência visual mais fluida.
- **UI Feedback**: Barra de progresso animada ao iniciar buscas e tema Dark Mode nos menus de seleção.
- **Playlist Manager**: Nova funcionalidade para gerenciar downloads de playlists.
  - Botão "Ver e Selecionar Músicas" aparece automaticamente.
  - Modal interativo para seleção múltipla.
  - Otimização para playlists grandes (limite inicial de 50 itens).
- **Backend (/playlist/details)**: Novo endpoint para buscar detalhes rápidos de playlists.
  - Suporte a rotação de clientes (TV, Android, Web).

### Corrigido
- **App.jsx Corrompido**: Restauração completa do arquivo principal do frontend.
- **Crash em Playlists Grandes**: Limite de segurança no backend.
- **Duração "0:00"**: Interface oculta durações não disponíveis em vez de mostrar zero.
- **Erro de Reload no Frontend**: Correção de sintaxe JSX na injeção dos resultados de busca.

### Alterado
- **Interface**: Melhorias visuais no modal de playlist e cards de resultado (Glassmorphism).
- **Performance**: Uso de `extract_flat='in_playlist'` para carregamento ultra-rápido.

## [Anterior]
- Implementação inicial do downloader (Áudio/Vídeo).
- Sistema de autenticação com cookies.txt.
- Histórico de downloads.
- Configurações de qualidade e formato.
