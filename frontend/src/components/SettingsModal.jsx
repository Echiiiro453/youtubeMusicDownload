import React, { useState } from 'react';
import { Settings, CheckCircle, AlertCircle, Upload, Power, Terminal, Database, RefreshCw, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { LogViewerModal } from './LogViewerModal';
import { t, setLanguage, getLanguage, LANGUAGES } from '../i18n';

export function SettingsModal({ isOpen, onClose, isAuthenticated, organizeByArtist, setOrganizeByArtist, onUploadSuccess, apiUrl, onLanguageChange }) {
  const [downloadFolder, setDownloadFolder] = React.useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [activeLang, setActiveLang] = useState(getLanguage());

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

  React.useEffect(() => {
    if (isOpen) {
      axios.get(`${apiUrl}/api/settings/download_folder`)
        .then(res => setDownloadFolder(res.data.folder))
        .catch(console.error);
    }
  }, [isOpen, apiUrl]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-white z-50 bg-[#121214] rounded-full w-8 h-8 flex items-center justify-center">X</button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-surface rounded-xl">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white">{t('settingsTitle')}</h2>
        </div>

        <div className="space-y-4">

          {/* ── Language Selector ── */}
          <div className="p-4 bg-surface/30 rounded-xl border border-white/5 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <h4 className="font-bold text-white text-sm">{t('settingsLanguage')}</h4>
            </div>
            <div className="flex gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLangChange(lang.code)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all
                    ${activeLang === lang.code
                      ? 'bg-primary/20 border-primary/50 text-white shadow-lg shadow-primary/10'
                      : 'bg-white/5 border-white/10 text-secondary hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-xs">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Auth Status ── */}
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

          {/* ── Cookies Info ── */}
          <div className="space-y-3 pt-2 bg-surface/50 p-4 rounded-xl border border-white/5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">{t('settingsCookies')}</h4>
                <p className="text-xs text-secondary leading-relaxed">{t('settingsCookiesDesc')}</p>
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
          </div>

          {/* ── Cookie Upload ── */}
          <div className="relative group">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-white/10 group-hover:border-primary/50 group-hover:bg-primary/5 rounded-xl p-6 flex flex-col items-center justify-center transition-all text-center gap-2">
              <Upload className="w-8 h-8 text-secondary group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium text-white">{t('settingsUploadCookies')}</p>
              <p className="text-xs text-secondary">{t('settingsUploadCookiesDesc')}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4 space-y-4">

            {/* ── Download Folder ── */}
            <div className="p-4 bg-surface/30 rounded-xl border border-white/5 space-y-3">
              <h4 className="font-bold text-white">{t('settingsDownloadFolder')}</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={downloadFolder}
                  readOnly
                  className="flex-1 bg-[#1a1a1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-secondary outline-none overflow-hidden text-ellipsis whitespace-nowrap"
                  placeholder={t('loading')}
                />
                <button
                  onClick={handleChooseFolder}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-primary/20"
                >
                  {t('settingsChangeFolder')}
                </button>
              </div>
            </div>

            {/* ── Organize by Artist ── */}
            <div className="flex items-center justify-between p-4 bg-surface/30 rounded-xl border border-white/5">
              <div>
                <h4 className="font-bold text-white">{t('settingsOrganizeArtist')}</h4>
                <p className="text-xs text-secondary mt-0.5">{t('settingsOrganizeArtistDesc')}</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !organizeByArtist;
                  setOrganizeByArtist(newValue);
                  localStorage.setItem('organizeByArtist', newValue.toString());
                }}
                className={`relative w-14 h-7 rounded-full transition-colors ${organizeByArtist ? 'bg-primary' : 'bg-gray-600'}`}
              >
                <motion.div
                  animate={{ x: organizeByArtist ? 28 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                />
              </button>
            </div>

            {/* ── System Buttons ── */}
            <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
              <button
                onClick={() => setShowLogs(true)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center justify-center gap-2 group"
              >
                <Terminal className="w-5 h-5 group-hover:text-primary transition-colors" />
                <span className="font-bold text-sm">{t('logs')}</span>
              </button>

              <button
                onClick={handleDbSync}
                disabled={isSyncing}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isSyncing
                  ? <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  : <Database className="w-5 h-5 group-hover:text-primary transition-colors" />
                }
                <span className="font-bold text-sm">
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
          </div>

          {/* ── Shutdown ── */}
          <div className="pt-4 border-t border-white/10 mt-4">
            <button
              onClick={handleShutdown}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-300 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <Power className="w-5 h-5 group-hover:text-red-200 transition-colors" />
              <span className="font-bold text-sm">{t('settingsShutdownApp')}</span>
            </button>
          </div>
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
