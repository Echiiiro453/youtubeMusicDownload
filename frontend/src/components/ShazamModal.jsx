import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { t } from '../i18n';

export default function ShazamModal({ isOpen, onClose, apiUrl }) {
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLibrary();
    }
  }, [isOpen]);

  const fetchLibrary = async () => {
    setLoadingLib(true);
    try {
      const res = await axios.get(`${apiUrl}/api/library`);
      setLibrary(res.data.library);
    } catch (e) {
      console.error("Failed to load library:", e);
    } finally {
      setLoadingLib(false);
    }
  };

  const handleFix = async () => {
    if (!filePath) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${apiUrl}/api/fix_metadata`, { file_path: filePath });
      setResult(res.data.data);
    } catch (err) {
      alert("Erro ao processar: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative"
      >
        
        {/* Cabeçalho */}
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-white">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
            <Wand2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('shazamTitle')}</h2>
            <p className="text-sm text-secondary">{t('shazamSubtitle')}</p>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-secondary uppercase">{t('studioSelectSong')}</label>
            <select 
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              disabled={loadingLib}
              className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none cursor-pointer"
            >
              <option value="">{loadingLib ? t('studioLoadingSongs') : t('studioSelectPlaceholder')}</option>
              {library.map((song, i) => (
                <option key={i} value={song.file_path || song.title}>
                  {song.title || song.file_path}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleFix}
            disabled={loading || !filePath}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
            {loading ? t('shazamBtnFixing') : t('shazamBtnFix')}
          </button>

          {result && (
            <div className="mt-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg flex gap-4 items-center">
              {result.cover_url ? (
                <img src={result.cover_url} alt="Capa Identificada" className="w-16 h-16 rounded-md shadow-md" />
              ) : (
                <div className="w-16 h-16 bg-black/30 rounded-md flex items-center justify-center">
                  <CheckCircle className="text-blue-400" />
                </div>
              )}
              <div>
                <h3 className="text-white font-bold">{result.title}</h3>
                <p className="text-sm text-secondary">{result.artist}</p>
                <p className="text-xs text-blue-400 mt-1">{t('shazamSuccessDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
