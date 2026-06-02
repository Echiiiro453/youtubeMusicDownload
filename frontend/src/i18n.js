/**
 * i18n.js - Sistema de internacionalização leve sem dependências externas
 * Idiomas suportados: pt (Português), en (English), es (Español)
 */

const translations = {
  pt: {
    // ── Header / Nav
    appSubtitle: 'Baixe músicas do YouTube com qualidade de estúdio',
    navDownload: 'Download',
    navLibrary: 'Biblioteca',
    navSettings: 'Configurações',
    navDonate: 'Apoiar',

    // ── Search / Input
    searchPlaceholder: 'Cole o link do YouTube ou pesquise uma música...',
    searchButton: 'Analisar',
    searching: 'Analisando...',

    // ── Mode / Quality
    modeAudio: 'Áudio',
    modeVideo: 'Vídeo',
    quality320: 'Ultra (320kbps)',
    qualityBest: 'Lossless (M4A)',
    qualityFlac: 'FLAC',
    quality128: 'Padrão (128kbps)',

    // ── Confirm step
    confirmTitle: 'Pronto para baixar',
    confirmDownload: 'Baixar agora',
    confirmBack: 'Voltar',
    confirmDuration: 'Duração',
    confirmChannel: 'Canal',
    confirmFormat: 'Formato',

    // ── Queue / Download
    queueTitle: 'Fila de Download',
    queueEmpty: 'Nenhum download na fila',
    queueClear: 'Limpar fila',
    statusQueued: 'Na fila',
    statusDownloading: 'Baixando',
    statusProcessing: 'Processando',
    statusDone: 'Concluído',
    statusError: 'Erro',
    statusCancelled: 'Cancelado',
    cancelDownload: 'Cancelar',
    retryDownload: 'Tentar novamente',

    // ── Playlist
    playlistTitle: 'Gerenciar Playlist',
    playlistLoad: 'Carregar Playlist',
    playlistLoading: 'Carregando...',
    playlistSelectAll: 'Selecionar tudo',
    playlistDeselectAll: 'Desmarcar tudo',
    playlistDownloadSelected: 'Baixar selecionados',
    playlistDownloaded: 'Baixado',
    playlistPending: 'Pendente',
    playlistVideos: 'vídeos',
    playlistEmpty: 'Nenhum vídeo encontrado',
    playlistSelectMusic: '📋 Selecionar Músicas',
    playlistLoadLimit: 'Carregar:',
    playlistItems: 'itens',
    playlistAllItems: 'Todos (Pode demorar)',
    playlistRefresh: '🔄 Atualizar',
    playlistRefreshTitle: 'Recarregar playlist com novo limite',
    playlistSelectedOf: (selected, total) => `${selected} de ${total} selecionadas`,
    playlistSelectNew: 'Selecionar Novos',
    playlistClearSelection: 'Limpar Seleção',
    playlistAlreadyDownloaded: 'Já Baixado',
    playlistRedownload: 'Rebaixar',
    playlistDownloadCount: (count) => `Baixar ${count} Música${count !== 1 ? 's' : ''}`,

    // ── Settings
    settingsTitle: 'Configurações',
    settingsLanguage: 'Idioma',
    settingsTheme: 'Tema',
    settingsCookies: 'Autenticação (Cookies)',
    settingsCookiesDesc: 'Faça o upload do seu arquivo cookies.txt do YouTube para evitar o erro 403 (Bloqueado) e permitir downloads de vídeos com restrição de idade ou qualidade máxima.',
    settingsCookiesHowTo: 'Como obter o cookies.txt:',
    settingsCookiesStep1: 'Instale a extensão <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">Get cookies.txt LOCALLY</a> no seu navegador (Chrome/Edge/Brave).',
    settingsCookiesStep2: 'Acesse o site do <b>YouTube</b> no navegador e faça login na sua conta normalmente.',
    settingsCookiesStep3: 'Clique no ícone da extensão no topo do navegador para exportar. Depois, faça o upload desse arquivo aqui embaixo.',
    settingsUploadCookies: 'Fazer Upload do cookies.txt',
    settingsUploadCookiesDesc: 'Apenas arquivos .txt',
    settingsDownloadFolder: 'Pasta de Downloads',
    settingsChangeFolder: 'Mudar Pasta',
    settingsOrganizeArtist: 'Organizar por Artista',
    settingsOrganizeArtistDesc: 'Criar subpastas automaticamente',
    settingsConnected: 'Autenticado',
    settingsNotConnected: 'Não autenticado',
    settingsDbSync: 'Sincronizar Banco de Dados',
    settingsDbSyncDesc: 'Verifica se os arquivos baixados ainda existem no disco',
    settingsDbSyncRun: 'Sincronizar agora',
    settingsDbSyncing: 'Sincronizando...',
    settingsShutdownApp: 'Encerrar Aplicativo',
    settingsShutdownConfirm: '⚠️ Tem certeza que deseja encerrar o servidor?\nIsso fechará o aplicativo e interromperá todos os downloads.',
    settingsShutdownSuccess: 'Servidor Encerrado',
    settingsShutdownCloseTab: 'Pode fechar esta guia.',
    settingsVersion: 'Versão',
    settingsChangelog: 'Ver changelog',
    settingsClose: 'Fechar',

    // ── Player
    playerNoTrack: 'Nenhuma música tocando',
    playerLyricsNotFound: 'Letra não encontrada',

    // ── Toasts / Messages
    toastCopied: 'Copiado!',
    toastError: 'Ocorreu um erro',
    toastSuccess: 'Sucesso!',
    toastDownloadStarted: 'Download iniciado!',
    toastFolderOpened: 'Pasta aberta',
    toastInvalidUrl: 'URL inválida ou não suportada',
    toastCookiesOk: 'Cookies importados com sucesso!',
    toastSyncDone: (checked, missing) => `Sync concluído: ${checked} verificados, ${missing} ausentes`,

    // ── Misc
    close: 'Fechar',
    cancel: 'Cancelar',
    save: 'Salvar',
    loading: 'Carregando...',
    openFolder: 'Abrir pasta',
    noResults: 'Nenhum resultado encontrado',
    searchResults: 'Resultados da pesquisa',
    organizeByArtist: 'Organizar por artista',
    pitchControl: 'Tom',
    speedControl: 'Velocidade',
    resetDefaults: 'Restaurar padrões',
    updateAvailable: 'Atualização disponível',
    updateNow: 'Atualizar agora',
    later: 'Mais tarde',
    terms: 'Termos de uso',
    logs: 'Logs do sistema',
    
    // ── App.jsx UI
    btnUpdate: 'Atualizar',
    btnUpdateTitle: 'Verificar Atualizações',
    btnDonate: 'Apoiar',
    btnConnected: 'Conectado',
    btnConfigure: 'Configurar',
    
    // ── Resume Queue
    resumeTitle: 'Continuar Downloads?',
    resumeDesc: (count) => `Você tem ${count} downloads pendentes da última vez que fechou o aplicativo. Deseja continuar de onde parou?`,
    resumeNo: 'Não, descartar',
    resumeYes: 'Sim, continuar',
    
    // ── Donate
    donateTitle: 'Apoie o Projeto',
    donateDesc: 'Se este app te ajudou, considere fazer uma doação via PIX para manter o desenvolvimento ativo! 🚀',
    donateCopyPix: 'Copiar Código PIX (Copia e Cola)',
    donatePixCopied: 'Código PIX copiado!',
    
    // ── Main UI
    mainTitle: 'Music Downloader',
    mainSubtitleSearch: 'Cole seu link para começar.',
    mainSubtitleConfig: 'Configure seu download.',
    searchPlaceholderText: 'Cole um link do YouTube ou digite para pesquisar...',
    btnSearch: 'Pesquisar',
    btnOpenLink: 'Abrir Link',
    labelQty: 'Qtd:',
    btnClear: 'Limpar',
    readyToDownload: 'Pronto para baixar',
    playlistDetectedTitle: 'Playlist Detectada',
    playlistDetectedDesc: 'Use o botão abaixo para baixar a playlist completa.',
    btnViewPlaylist: 'Ver e Selecionar Músicas',
    btnLoadingPlaylist: '⏳ Carregando playlist...',
    tabAudio: '🎵 Áudio',
    tabVideo: '🎬 Vídeo',
    labelPresets: 'Presets',
    btnSavePreset: 'Salvar Atual',
    selectPreset: 'Selecione um efeito...',
    groupDefaultPresets: 'Padrões',
    groupMyPresets: 'Meus Presets',
    labelPitch: 'Tom (Pitch)',
  },

  en: {
    // ── Header / Nav
    appSubtitle: 'Download YouTube music with studio quality',
    navDownload: 'Download',
    navLibrary: 'Library',
    navSettings: 'Settings',
    navDonate: 'Support',

    // ── Search / Input
    searchPlaceholder: 'Paste a YouTube link or search for a song...',
    searchButton: 'Analyze',
    searching: 'Analyzing...',

    // ── Mode / Quality
    modeAudio: 'Audio',
    modeVideo: 'Video',
    quality320: 'Ultra (320kbps)',
    qualityBest: 'Lossless (M4A)',
    qualityFlac: 'FLAC',
    quality128: 'Standard (128kbps)',

    // ── Confirm step
    confirmTitle: 'Ready to download',
    confirmDownload: 'Download now',
    confirmBack: 'Back',
    confirmDuration: 'Duration',
    confirmChannel: 'Channel',
    confirmFormat: 'Format',

    // ── Queue / Download
    queueTitle: 'Download Queue',
    queueEmpty: 'No downloads in queue',
    queueClear: 'Clear queue',
    statusQueued: 'Queued',
    statusDownloading: 'Downloading',
    statusProcessing: 'Processing',
    statusDone: 'Done',
    statusError: 'Error',
    statusCancelled: 'Cancelled',
    cancelDownload: 'Cancel',
    retryDownload: 'Retry',

    // ── Playlist
    playlistTitle: 'Manage Playlist',
    playlistLoad: 'Load Playlist',
    playlistLoading: 'Loading...',
    playlistSelectAll: 'Select all',
    playlistDeselectAll: 'Deselect all',
    playlistDownloadSelected: 'Download selected',
    playlistDownloaded: 'Downloaded',
    playlistPending: 'Pending',
    playlistVideos: 'videos',
    playlistEmpty: 'No videos found',
    playlistSelectMusic: '📋 Select Songs',
    playlistLoadLimit: 'Load:',
    playlistItems: 'items',
    playlistAllItems: 'All (Might take a while)',
    playlistRefresh: '🔄 Refresh',
    playlistRefreshTitle: 'Reload playlist with new limit',
    playlistSelectedOf: (selected, total) => `${selected} of ${total} selected`,
    playlistSelectNew: 'Select New',
    playlistClearSelection: 'Clear Selection',
    playlistAlreadyDownloaded: 'Already Downloaded',
    playlistRedownload: 'Redownload',
    playlistDownloadCount: (count) => `Download ${count} Song${count !== 1 ? 's' : ''}`,

    // ── Settings
    settingsTitle: 'Settings',
    settingsLanguage: 'Language',
    settingsTheme: 'Theme',
    settingsCookies: 'Authentication (Cookies)',
    settingsCookiesDesc: 'Upload your YouTube cookies.txt file to avoid 403 (Forbidden) errors and allow downloading age-restricted or max quality videos.',
    settingsCookiesHowTo: 'How to get cookies.txt:',
    settingsCookiesStep1: 'Install the <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">Get cookies.txt LOCALLY</a> extension on your browser (Chrome/Edge/Brave).',
    settingsCookiesStep2: 'Go to the <b>YouTube</b> website and log into your account normally.',
    settingsCookiesStep3: 'Click the extension icon at the top of the browser to export. Then, upload that file below.',
    settingsUploadCookies: 'Upload cookies.txt',
    settingsUploadCookiesDesc: 'Only .txt files',
    settingsDownloadFolder: 'Download Folder',
    settingsChangeFolder: 'Change Folder',
    settingsOrganizeArtist: 'Organize by Artist',
    settingsOrganizeArtistDesc: 'Automatically create subfolders',
    settingsConnected: 'Authenticated',
    settingsNotConnected: 'Not authenticated',
    settingsDbSync: 'Sync Database',
    settingsDbSyncDesc: 'Checks if downloaded files still exist on disk',
    settingsDbSyncRun: 'Sync now',
    settingsDbSyncing: 'Syncing...',
    settingsShutdownApp: 'Shutdown App',
    settingsShutdownConfirm: '⚠️ Are you sure you want to shut down the server?\nThis will close the application and stop all downloads.',
    settingsShutdownSuccess: 'Server Shut Down',
    settingsShutdownCloseTab: 'You can close this tab.',
    settingsVersion: 'Version',
    settingsChangelog: 'View changelog',
    settingsClose: 'Close',

    // ── Player
    playerNoTrack: 'No track playing',
    playerLyricsNotFound: 'Lyrics not found',

    // ── Toasts / Messages
    toastCopied: 'Copied!',
    toastError: 'An error occurred',
    toastSuccess: 'Success!',
    toastDownloadStarted: 'Download started!',
    toastFolderOpened: 'Folder opened',
    toastInvalidUrl: 'Invalid or unsupported URL',
    toastCookiesOk: 'Cookies imported successfully!',
    toastSyncDone: (checked, missing) => `Sync complete: ${checked} checked, ${missing} missing`,

    // ── Misc
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    openFolder: 'Open folder',
    noResults: 'No results found',
    searchResults: 'Search results',
    organizeByArtist: 'Organize by artist',
    pitchControl: 'Pitch',
    speedControl: 'Speed',
    resetDefaults: 'Reset defaults',
    updateAvailable: 'Update available',
    updateNow: 'Update now',
    later: 'Later',
    terms: 'Terms of use',
    logs: 'System logs',

    // ── App.jsx UI
    btnUpdate: 'Update',
    btnUpdateTitle: 'Check for Updates',
    btnDonate: 'Donate',
    btnConnected: 'Connected',
    btnConfigure: 'Configure',
    
    // ── Resume Queue
    resumeTitle: 'Resume Downloads?',
    resumeDesc: (count) => `You have ${count} pending downloads from the last time you closed the app. Do you want to continue where you left off?`,
    resumeNo: 'No, discard',
    resumeYes: 'Yes, continue',
    
    // ── Donate
    donateTitle: 'Support the Project',
    donateDesc: 'If this app helped you, consider making a donation to keep the development active! 🚀',
    donateCopyPix: 'Copy PIX Code (Copy & Paste)',
    donatePixCopied: 'PIX Code copied!',
    
    // ── Main UI
    mainTitle: 'Music Downloader',
    mainSubtitleSearch: 'Paste your link to start.',
    mainSubtitleConfig: 'Configure your download.',
    searchPlaceholderText: 'Paste a YouTube link or type to search...',
    btnSearch: 'Search',
    btnOpenLink: 'Open Link',
    labelQty: 'Qty:',
    btnClear: 'Clear',
    readyToDownload: 'Ready to download',
    playlistDetectedTitle: 'Playlist Detected',
    playlistDetectedDesc: 'Use the button below to download the full playlist.',
    btnViewPlaylist: 'View & Select Songs',
    btnLoadingPlaylist: '⏳ Loading playlist...',
    tabAudio: '🎵 Audio',
    tabVideo: '🎬 Video',
    labelPresets: 'Presets',
    btnSavePreset: 'Save Current',
    selectPreset: 'Select an effect...',
    groupDefaultPresets: 'Defaults',
    groupMyPresets: 'My Presets',
    labelPitch: 'Pitch',
  },

  es: {
    // ── Header / Nav
    appSubtitle: 'Descarga música de YouTube con calidad de estudio',
    navDownload: 'Descargar',
    navLibrary: 'Biblioteca',
    navSettings: 'Configuración',
    navDonate: 'Apoyar',

    // ── Search / Input
    searchPlaceholder: 'Pega un enlace de YouTube ou busca una canción...',
    searchButton: 'Analizar',
    searching: 'Analizando...',

    // ── Mode / Quality
    modeAudio: 'Audio',
    modeVideo: 'Video',
    quality320: 'Ultra (320kbps)',
    qualityBest: 'Sin pérdida (M4A)',
    qualityFlac: 'FLAC',
    quality128: 'Estándar (128kbps)',

    // ── Confirm step
    confirmTitle: 'Listo para descargar',
    confirmDownload: 'Descargar ahora',
    confirmBack: 'Volver',
    confirmDuration: 'Duración',
    confirmChannel: 'Canal',
    confirmFormat: 'Formato',

    // ── Queue / Download
    queueTitle: 'Cola de descarga',
    queueEmpty: 'Sin descargas en cola',
    queueClear: 'Limpiar cola',
    statusQueued: 'En cola',
    statusDownloading: 'Descargando',
    statusProcessing: 'Procesando',
    statusDone: 'Completado',
    statusError: 'Error',
    statusCancelled: 'Cancelado',
    cancelDownload: 'Cancelar',
    retryDownload: 'Reintentar',

    // ── Playlist
    playlistTitle: 'Gestionar playlist',
    playlistLoad: 'Cargar playlist',
    playlistLoading: 'Cargando...',
    playlistSelectAll: 'Seleccionar todo',
    playlistDeselectAll: 'Deseleccionar todo',
    playlistDownloadSelected: 'Descargar seleccionados',
    playlistDownloaded: 'Descargado',
    playlistPending: 'Pendiente',
    playlistVideos: 'videos',
    playlistEmpty: 'No se encontraron videos',
    playlistSelectMusic: '📋 Seleccionar Canciones',
    playlistLoadLimit: 'Cargar:',
    playlistItems: 'elementos',
    playlistAllItems: 'Todos (Puede tardar)',
    playlistRefresh: '🔄 Actualizar',
    playlistRefreshTitle: 'Recargar playlist con nuevo límite',
    playlistSelectedOf: (selected, total) => `${selected} de ${total} seleccionadas`,
    playlistSelectNew: 'Seleccionar Nuevos',
    playlistClearSelection: 'Limpiar Selección',
    playlistAlreadyDownloaded: 'Ya Descargado',
    playlistRedownload: 'Volver a descargar',
    playlistDownloadCount: (count) => `Descargar ${count} Cancion${count !== 1 ? 'es' : ''}`,

    // ── Settings
    settingsTitle: 'Configuración',
    settingsLanguage: 'Idioma',
    settingsTheme: 'Tema',
    settingsCookies: 'Autenticación (Cookies)',
    settingsCookiesDesc: 'Sube tu archivo cookies.txt de YouTube para evitar errores 403 (Prohibido) y permitir la descarga de videos con restricción de edad o de máxima calidad.',
    settingsCookiesHowTo: 'Cómo obtener cookies.txt:',
    settingsCookiesStep1: 'Instala la extensión <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">Get cookies.txt LOCALLY</a> en tu navegador (Chrome/Edge/Brave).',
    settingsCookiesStep2: 'Ve al sitio web de <b>YouTube</b> en el navegador e inicia sesión en tu cuenta normalmente.',
    settingsCookiesStep3: 'Haz clic en el icono de la extensión en la parte superior del navegador para exportar. Luego, sube ese archivo a continuación.',
    settingsUploadCookies: 'Subir cookies.txt',
    settingsUploadCookiesDesc: 'Solo archivos .txt',
    settingsDownloadFolder: 'Carpeta de Descargas',
    settingsChangeFolder: 'Cambiar Carpeta',
    settingsOrganizeArtist: 'Organizar por Artista',
    settingsOrganizeArtistDesc: 'Crear subcarpetas automáticamente',
    settingsConnected: 'Autenticado',
    settingsNotConnected: 'No autenticado',
    settingsDbSync: 'Sincronizar Base de Datos',
    settingsDbSyncDesc: 'Verifica si los archivos descargados aún existen en el disco',
    settingsDbSyncRun: 'Sincronizar ahora',
    settingsDbSyncing: 'Sincronizando...',
    settingsVersion: 'Versión',
    settingsChangelog: 'Ver changelog',
    settingsClose: 'Cerrar',

    // ── Player
    playerNoTrack: 'Sin pista en reproducción',
    playerLyricsNotFound: 'Letra no encontrada',

    // ── Toasts / Messages
    toastCopied: '¡Copiado!',
    toastError: 'Ocurrió un error',
    toastSuccess: '¡Éxito!',
    toastDownloadStarted: '¡Descarga iniciada!',
    toastFolderOpened: 'Carpeta abierta',
    toastInvalidUrl: 'URL inválida o no compatible',
    toastCookiesOk: '¡Cookies importadas con éxito!',
    toastSyncDone: (checked, missing) => `Sincronización completa: ${checked} verificados, ${missing} ausentes`,

    // ── Misc
    close: 'Cerrar',
    cancel: 'Cancelar',
    save: 'Guardar',
    loading: 'Cargando...',
    openFolder: 'Abrir carpeta',
    noResults: 'No se encontraron resultados',
    searchResults: 'Resultados de búsqueda',
    organizeByArtist: 'Organizar por artista',
    pitchControl: 'Tono',
    speedControl: 'Velocidad',
    resetDefaults: 'Restaurar valores',
    updateAvailable: 'Actualización disponible',
    updateNow: 'Actualizar ahora',
    later: 'Más tarde',
    terms: 'Términos de uso',
    logs: 'Registros del sistema',
    
    // ── App.jsx UI
    btnUpdate: 'Actualizar',
    btnUpdateTitle: 'Buscar Actualizaciones',
    btnDonate: 'Apoyar',
    btnConnected: 'Conectado',
    btnConfigure: 'Configurar',
    
    // ── Resume Queue
    resumeTitle: '¿Reanudar Descargas?',
    resumeDesc: (count) => `Tienes ${count} descargas pendientes desde la última vez que cerraste la aplicación. ¿Deseas continuar desde donde lo dejaste?`,
    resumeNo: 'No, descartar',
    resumeYes: 'Sí, continuar',
    
    // ── Donate
    donateTitle: 'Apoya el Proyecto',
    donateDesc: 'Si esta aplicación te ayudó, considera hacer una donación para mantener activo el desarrollo. 🚀',
    donateCopyPix: 'Copiar Código PIX',
    donatePixCopied: '¡Código PIX copiado!',
    
    // ── Main UI
    mainTitle: 'Music Downloader',
    mainSubtitleSearch: 'Pega tu enlace para empezar.',
    mainSubtitleConfig: 'Configura tu descarga.',
    searchPlaceholderText: 'Pega un enlace de YouTube o escribe para buscar...',
    btnSearch: 'Buscar',
    btnOpenLink: 'Abrir Enlace',
    labelQty: 'Cant:',
    btnClear: 'Limpiar',
    readyToDownload: 'Listo para descargar',
    playlistDetectedTitle: 'Playlist Detectada',
    playlistDetectedDesc: 'Usa el botón de abajo para descargar la playlist completa.',
    btnViewPlaylist: 'Ver y Seleccionar Canciones',
    btnLoadingPlaylist: '⏳ Cargando playlist...',
    tabAudio: '🎵 Audio',
    tabVideo: '🎬 Video',
    labelPresets: 'Ajustes Preestablecidos',
    btnSavePreset: 'Guardar Actual',
    selectPreset: 'Selecciona un efecto...',
    groupDefaultPresets: 'Predeterminados',
    groupMyPresets: 'Mis Ajustes',
    labelPitch: 'Tono (Pitch)',
  },
};

export const LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English',   flag: '🇺🇸' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
];

const DEFAULT_LANG = 'pt';

let currentLang = localStorage.getItem('appLanguage') || DEFAULT_LANG;
if (!translations[currentLang]) currentLang = DEFAULT_LANG;

/**
 * t(key, ...args) - Translate a key.
 * If the value is a function, call it with ...args.
 * Falls back to English, then to the key itself.
 */
export function t(key, ...args) {
  const val = translations[currentLang]?.[key]
           ?? translations[DEFAULT_LANG]?.[key]
           ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

/**
 * setLanguage(code) - Change the active language and persist it.
 * Returns true if the language changed.
 */
export function setLanguage(code) {
  if (!translations[code]) return false;
  currentLang = code;
  localStorage.setItem('appLanguage', code);
  return true;
}

export function getLanguage() {
  return currentLang;
}
