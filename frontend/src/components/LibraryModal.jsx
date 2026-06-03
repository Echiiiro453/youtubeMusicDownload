import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, FolderOpen, RefreshCw, Music } from 'lucide-react';
import axios from 'axios';

export function LibraryModal({ isOpen, onClose, getApiUrl, onPlaySong }) {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLibrary();
    }
  }, [isOpen]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(getApiUrl('/api/library'));
      setLibrary(res.data.library);
    } catch (e) {
      console.error("Failed to load library:", e);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = async () => {
    try {
      await axios.post(getApiUrl('/open_folder'));
    } catch (e) {
      console.error("Failed to open folder:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Music className="text-primary" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Sua Biblioteca</h2>
                <p className="text-sm text-gray-400">
                  {library.length} músicas baixadas e salvas no seu PC
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={openFolder}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/5"
              >
                <FolderOpen size={16} />
                Abrir Pasta
              </button>
              <button
                onClick={fetchLibrary}
                className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                title="Atualizar Biblioteca"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400">
                <RefreshCw className="animate-spin mr-2" size={20} /> Carregando biblioteca...
              </div>
            ) : library.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
                <Music size={48} className="opacity-20" />
                <p className="text-lg">Você ainda não baixou nenhuma música.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {library.map((song, idx) => (
                  <div
                    key={`${song.video_id}-${idx}`}
                    className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl group transition-colors cursor-pointer"
                    onClick={() => onPlaySong({
                        title: song.title,
                        file: song.file_path,
                        quality: "Local"
                    }, library)}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Play className="text-gray-400 group-hover:text-primary transition-colors ml-1" size={20} />
                      </div>
                      <div className="min-w-0 flex-1 pr-4">
                        <h4 className="text-white font-medium truncate text-sm">
                          {song.title || "Música Desconhecida"}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 font-mono">
                            {new Date(song.created_at * 1000).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
