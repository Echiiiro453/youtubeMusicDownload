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

    // ── Settings
    settingsTitle: 'Configurações',
    settingsLanguage: 'Idioma',
    settingsTheme: 'Tema',
    settingsDownloadFolder: 'Pasta de downloads',
    settingsOrganizeArtist: 'Organizar por artista',
    settingsOrganizeArtistDesc: 'Cria subpastas por nome do artista automaticamente',
    settingsCookies: 'Autenticação (Cookies)',
    settingsCookiesDesc: 'Necessário para vídeos com restrição de idade',
    settingsUploadCookies: 'Importar cookies.txt',
    settingsConnected: 'Autenticado',
    settingsNotConnected: 'Não autenticado',
    settingsDbSync: 'Sincronizar Banco com Arquivos',
    settingsDbSyncDesc: 'Verifica se os arquivos baixados ainda existem no disco',
    settingsDbSyncRun: 'Sincronizar agora',
    settingsDbSyncing: 'Sincronizando...',
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

    // ── Settings
    settingsTitle: 'Settings',
    settingsLanguage: 'Language',
    settingsTheme: 'Theme',
    settingsDownloadFolder: 'Download folder',
    settingsOrganizeArtist: 'Organize by artist',
    settingsOrganizeArtistDesc: 'Automatically creates subfolders by artist name',
    settingsCookies: 'Authentication (Cookies)',
    settingsCookiesDesc: 'Required for age-restricted videos',
    settingsUploadCookies: 'Import cookies.txt',
    settingsConnected: 'Authenticated',
    settingsNotConnected: 'Not authenticated',
    settingsDbSync: 'Sync Database with Files',
    settingsDbSyncDesc: 'Checks if downloaded files still exist on disk',
    settingsDbSyncRun: 'Sync now',
    settingsDbSyncing: 'Syncing...',
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
  },

  es: {
    // ── Header / Nav
    appSubtitle: 'Descarga música de YouTube con calidad de estudio',
    navDownload: 'Descargar',
    navLibrary: 'Biblioteca',
    navSettings: 'Configuración',
    navDonate: 'Apoyar',

    // ── Search / Input
    searchPlaceholder: 'Pega un enlace de YouTube o busca una canción...',
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

    // ── Settings
    settingsTitle: 'Configuración',
    settingsLanguage: 'Idioma',
    settingsTheme: 'Tema',
    settingsDownloadFolder: 'Carpeta de descargas',
    settingsOrganizeArtist: 'Organizar por artista',
    settingsOrganizeArtistDesc: 'Crea subcarpetas por nombre de artista automáticamente',
    settingsCookies: 'Autenticación (Cookies)',
    settingsCookiesDesc: 'Necesario para vídeos con restricción de edad',
    settingsUploadCookies: 'Importar cookies.txt',
    settingsConnected: 'Autenticado',
    settingsNotConnected: 'No autenticado',
    settingsDbSync: 'Sincronizar base de datos con archivos',
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
