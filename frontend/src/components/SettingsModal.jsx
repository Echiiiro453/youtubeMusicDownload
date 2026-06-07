import React, { useState } from 'react';
import { Settings, CheckCircle, AlertCircle, Upload, Power, Terminal, Database, RefreshCw, Globe, Palette, Download, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { LogViewerModal } from './LogViewerModal';
import { t, setLanguage, getLanguage, LANGUAGES } from '../i18n';

export function SettingsModal({ isOpen, onClose, isAuthenticated, organizeByArtist, setOrganizeByArtist, onUploadSuccess, apiUrl, onLanguageChange, wallpaper, setWallpaper, blurLevel, setBlurLevel }) {
  const [downloadFolder, setDownloadFolder] = React.useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [activeLang, setActiveLang] = useState(getLanguage());
  const [concurrentDownloads, setConcurrentDownloads] = React.useState(2);
  const [startWithWindows, setStartWithWindows] = useState(() => localStorage.getItem('app_start_windows') === 'true');
  const [activeTab, setActiveTab] = useState('appearance');

  const handleDbSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await axios.get(`${apiUrl}/api/db/sync`);
      setSyncResult(res.data);
    } catch (e) {
      setSyncResult({ error: t('toastError') });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  const handleLangChange = (code) => {
    setLanguage(code);
    setActiveLang(code);
    // Force a re-render of the whole app
    if (typeof onLanguageChange === 'function') onLanguageChange(code);
  };

  const handleWallpaperUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await axios.post(`${apiUrl}/api/upload_wallpaper`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.status === 'success') {
          const videoUrl = apiUrl + res.data.url;
          if (setWallpaper) setWallpaper(videoUrl);
          localStorage.setItem('app_wallpaper', videoUrl);
        }
      } catch (err) {
        alert("Erro ao enviar vídeo. Tente novamente.");
        console.error(err);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Comprimir imagens grandes para não exceder a cota do localStorage
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 720;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para JPEG com qualidade de 70%
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        try {
          if (setWallpaper) setWallpaper(compressedBase64);
          localStorage.setItem('app_wallpaper', compressedBase64);
        } catch (err) {
          alert("Erro: A imagem ainda é muito grande para salvar (QuotaExceededError). Tente outra.");
          console.error(err);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleClearWallpaper = () => {
    if (setWallpaper) setWallpaper('');
    localStorage.removeItem('app_wallpaper');
  };

  const toggleStartWithWindows = async () => {
    const newVal = !startWithWindows;
    setStartWithWindows(newVal);
    localStorage.setItem('app_start_windows', newVal);
    try {
      await axios.post(`${apiUrl}/api/system/startup?enable=${newVal}`);
    } catch (err) {
      console.error("Erro ao configurar inicialização:", err);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      axios.get(`${apiUrl}/api/settings/download_folder`)
        .then(res => setDownloadFolder(res.data.folder))
        .catch(console.error);
      axios.get(`${apiUrl}/api/settings/concurrent_downloads`)
        .then(res => setConcurrentDownloads(res.data.value))
        .catch(console.error);
    }
  }, [isOpen, apiUrl]);

  const handleConcurrentChange = async (val) => {
    setConcurrentDownloads(val);
    try {
      await axios.post(`${apiUrl}/api/settings/concurrent_downloads`, { value: val });
    } catch (e) {
      console.error('Failed to save concurrent downloads setting', e);
    }
  };

  const handleChooseFolder = async () => {
    try {
      const res = await axios.post(`${apiUrl}/api/settings/choose_folder`);
      if (res.data.status === 'ok') {
        setDownloadFolder(res.data.folder);
      } else {
        alert(res.data.message);
      }
    } catch (e) {
      alert("Erro ao conectar com o servidor: " + e.message);
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name !== 'cookies.txt') {
      alert("O arquivo deve se chamar exatamente 'cookies.txt'");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${apiUrl}/upload_cookies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploadSuccess();
    } catch (error) {
      alert("Erro ao enviar arquivo. Verifique o console.");
      console.error(error);
    }
  };

  const handleShutdown = async () => {
    if (!confirm(t('settingsShutdownConfirm'))) return;

    try {
      try { window.close(); } catch (e) { }

      await axios.post(`${apiUrl}/shutdown`);

      document.body.innerHTML = `
        <div style="height: 100vh; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ef4444; font-family: sans-serif;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
          <h1 style="margin-top: 20px; font-size: 24px;">${t('settingsShutdownSuccess')}</h1>
          <p style="opacity: 0.5; margin-top: 10px;">${t('settingsShutdownCloseTab')}</p>
        </div>
      `;
    } catch (e) {
      alert("Erro ao comunicar com o servidor: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface-container border border-outline-variant/30 rounded-4xl w-full max-w-4xl p-0 shadow-2xl relative max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface hover:bg-on-surface/10 z-50 bg-surface-container rounded-full w-8 h-8 flex items-center justify-center transition-colors">X</button>

        {/* Sidebar Tabs */}
        <div className="bg-surface-container-high w-full md:w-64 flex-shrink-0 p-6 flex flex-col border-r border-outline-variant/20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary-container rounded-xl">
              <Settings className="w-6 h-6 text-on-primary-container" />
            </div>
            <h2 className="text-xl font-bold text-white">{t('settingsTitle')}</h2>
          </div>
          
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-sm whitespace-nowrap ${activeTab === 'appearance' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
            >
              <Palette size={18} /> Aparência
            </button>
            <button
              onClick={() => setActiveTab('downloads')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-sm whitespace-nowrap ${activeTab === 'downloads' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
            >
              <Download size={18} /> Downloads
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-sm whitespace-nowrap ${activeTab === 'system' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
            >
              <Monitor size={18} /> Sistema
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-surface-container relative">
          
          {/* TAB 1: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6 border-b border-outline-variant/20 pb-4">
                <Palette className="w-5 h-5 text-primary" /> Aparência & Interface
              </h3>

              {/* Language Selector */}
              <div className="p-4 bg-surface-container-high rounded-3xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-white text-sm">{t('settingsLanguage')}</h4>
                </div>
                <div className="flex gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLangChange(lang.code)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-2xl border text-sm font-medium transition-all
                        ${activeLang === lang.code
                          ? 'bg-primary-container border-primary-container text-on-primary-container shadow-lg shadow-primary/10'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-xs">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallpaper Personalization */}
              <div className="p-4 bg-surface-container-high rounded-3xl border border-outline-variant/30 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" /> Wallpaper / Tema Monet
                </h4>
                <p className="text-xs text-on-surface-variant">Escolha uma imagem ou vídeo para colorir o app dinamicamente (M3).</p>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-primary hover:bg-primary/90 text-on-primary text-sm font-bold py-2 rounded-full transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <Upload size={16} /> Escolher Arquivo
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleWallpaperUpload} />
                  </label>
                  {wallpaper && (
                    <button
                      onClick={handleClearWallpaper}
                      className="px-4 py-2 bg-error/20 hover:bg-error/30 text-error rounded-full text-sm font-bold transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {wallpaper && (
                  <div className="pt-2">
                    <h4 className="font-bold text-white text-xs mb-2">Intensidade do Desfoque</h4>
                    <div className="flex gap-2 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/20">
                      {[
                        { id: 'none', label: 'Sem Desfoque' },
                        { id: 'sm', label: 'Suave' },
                        { id: 'md', label: 'Médio' },
                        { id: '3xl', label: 'Forte' },
                      ].map(b => (
                        <button
                          key={b.id}
                          onClick={() => {
                            if (setBlurLevel) setBlurLevel(b.id);
                            localStorage.setItem('app_blur_level', b.id);
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-all ${blurLevel === b.id
                              ? 'bg-primary text-on-primary shadow-sm'
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                            }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DOWNLOADS */}
          {activeTab === 'downloads' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6 border-b border-outline-variant/20 pb-4">
                <Download className="w-5 h-5 text-primary" /> Downloads & Autenticação
              </h3>

              {/* Auth Status */}
              <div className={`p-4 rounded-xl border ${isAuthenticated ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div className="flex items-center gap-3">
                  {isAuthenticated ? <CheckCircle className="text-green-400" /> : <AlertCircle className="text-red-400" />}
                  <div>
                    <h3 className={`font-bold ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                      {isAuthenticated ? t('settingsConnected') : t('settingsNotConnected')}
                    </h3>
                    <p className="text-sm text-secondary/80">
                      {isAuthenticated ? 'Você pode baixar vídeos em alta qualidade.' : 'Downloads podem falhar (Erro 403).'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cookies Info & Upload */}
              {!isAuthenticated && (
                <div className="space-y-3 bg-surface-container-high p-4 rounded-3xl border border-outline-variant/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-container rounded-xl shrink-0">
                      <AlertCircle className="w-5 h-5 text-on-primary-container" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{t('settingsCookies')}</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{t('settingsCookiesDesc')}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-bold text-white mb-3">{t('settingsCookiesHowTo')}</h4>
                    <div className="space-y-3 text-sm text-secondary">
                      <div className="flex gap-3 items-center bg-black/20 p-3 rounded-lg border border-white/5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">1</span>
                        <p dangerouslySetInnerHTML={{ __html: t('settingsCookiesStep1') }}></p>
                      </div>
                      <div className="flex gap-3 items-center bg-black/20 p-3 rounded-lg border border-white/5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">2</span>
                        <p dangerouslySetInnerHTML={{ __html: t('settingsCookiesStep2') }}></p>
                      </div>
                      <div className="flex gap-3 items-center bg-black/20 p-3 rounded-lg border border-white/5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">3</span>
                        <p dangerouslySetInnerHTML={{ __html: t('settingsCookiesStep3') }}></p>
                      </div>
                    </div>
                  </div>
                  <div className="relative group mt-4">
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-outline-variant/50 group-hover:border-primary group-hover:bg-primary-container/20 rounded-3xl p-6 flex flex-col items-center justify-center transition-all text-center gap-2">
                      <Upload className="w-8 h-8 text-on-surface-variant group-hover:text-primary transition-colors" />
                      <p className="text-sm font-medium text-white">{t('settingsUploadCookies')}</p>
                      <p className="text-xs text-on-surface-variant">{t('settingsUploadCookiesDesc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Folder */}
              <div className="p-4 bg-surface-container-high rounded-3xl border border-outline-variant/30 space-y-3">
                <h4 className="font-bold text-white">{t('settingsDownloadFolder')}</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={downloadFolder}
                    readOnly
                    className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface outline-none overflow-hidden text-ellipsis whitespace-nowrap"
                    placeholder={t('loading')}
                  />
                  <button
                    onClick={handleChooseFolder}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary text-sm font-bold rounded-full transition-colors whitespace-nowrap shadow-lg shadow-primary/20"
                  >
                    {t('settingsChangeFolder')}
                  </button>
                </div>
              </div>

              {/* Concurrent Downloads Slider */}
              <div className="p-4 bg-surface-container-high rounded-3xl border border-outline-variant/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Downloads Simultâneos</h4>
                    {concurrentDownloads > 4 ? (
                      <p className="text-xs text-error mt-0.5">⚠️ Valores altos podem causar travamentos por alto uso de CPU/RAM.</p>
                    ) : (
                      <p className="text-xs text-on-surface-variant mt-0.5">Acelera filas, mas usa mais do PC.</p>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-primary min-w-[2rem] text-right">{concurrentDownloads}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={concurrentDownloads}
                  onChange={(e) => handleConcurrentChange(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-secondary/60 px-0.5">
                  <span>1 (Seq)</span>
                  <span>4</span>
                  <span>8 (Máx)</span>
                </div>
              </div>

              {/* Organize by Artist */}
              <div className="flex items-center justify-between p-4 bg-surface-container-high rounded-3xl border border-outline-variant/30">
                <div>
                  <h4 className="font-bold text-white">{t('settingsOrganizeArtist')}</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">{t('settingsOrganizeArtistDesc')}</p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !organizeByArtist;
                    setOrganizeByArtist(newValue);
                    localStorage.setItem('organizeByArtist', newValue.toString());
                  }}
                  className={`relative w-14 h-8 rounded-full transition-colors border ${organizeByArtist ? 'bg-primary border-primary' : 'bg-surface-container-highest border-outline-variant'}`}
                >
                  <motion.div
                    animate={{ x: organizeByArtist ? 26 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`absolute top-1 w-5 h-5 rounded-full shadow-lg ${organizeByArtist ? 'bg-on-primary' : 'bg-outline'}`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM */}
          {activeTab === 'system' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6 border-b border-outline-variant/20 pb-4">
                <Monitor className="w-5 h-5 text-primary" /> Sistema & Avançado
              </h3>

              {/* System Integration */}
              <div className="p-4 bg-surface-container-high rounded-3xl border border-outline-variant/30 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary" /> Sistema Operacional
                </h4>
                <label className="flex items-center justify-between cursor-pointer p-2 hover:bg-surface-container rounded-xl transition-colors">
                  <span className="text-sm font-medium text-white">Iniciar junto com o Windows</span>
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={startWithWindows} onChange={toggleStartWithWindows} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${startWithWindows ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${startWithWindows ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>

              {/* System Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowLogs(true)}
                  className="w-full py-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-white rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                  <Terminal className="w-5 h-5 group-hover:text-primary transition-colors text-on-surface-variant" />
                  <span className="font-bold text-sm text-on-surface">{t('logs')}</span>
                </button>

                <button
                  onClick={handleDbSync}
                  disabled={isSyncing}
                  className="w-full py-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-white rounded-2xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {isSyncing
                    ? <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    : <Database className="w-5 h-5 group-hover:text-primary transition-colors text-on-surface-variant" />
                  }
                  <span className="font-bold text-sm text-on-surface">
                    {isSyncing ? t('settingsDbSyncing') : t('settingsDbSync')}
                  </span>
                </button>

                {syncResult && !syncResult.error && (
                  <div className="text-xs text-center py-2 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                    {t('toastSyncDone', syncResult.checked, syncResult.marked_missing)}
                  </div>
                )}
                {syncResult?.error && (
                  <div className="text-xs text-center py-2 px-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                    {syncResult.error}
                  </div>
                )}
              </div>

              {/* Shutdown */}
              <div className="pt-4 mt-4">
                <button
                  onClick={handleShutdown}
                  className="w-full py-3 bg-error-container/10 hover:bg-error-container/30 border border-error/20 hover:border-error/50 text-error rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                  <Power className="w-5 h-5 group-hover:text-error transition-colors" />
                  <span className="font-bold text-sm">{t('settingsShutdownApp')}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>

      <AnimatePresence>
        <LogViewerModal
          isOpen={showLogs}
          onClose={() => setShowLogs(false)}
          apiUrl={apiUrl}
        />
      </AnimatePresence>
    </div>
  );
}
