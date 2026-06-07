import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, FolderOpen, RefreshCw, Music, Users, ChevronLeft, Disc, Mic } from 'lucide-react';
import axios from 'axios';

export function LibraryModal({ isOpen, onClose, getApiUrl, onPlaySong }) {
  const [library, setLibrary] = useState([]);
  const [studioLibrary, setStudioLibrary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'artists' | 'studio'
  const [selectedArtist, setSelectedArtist] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchLibrary();
      setSelectedArtist(null);
    }
  }, [isOpen]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(getApiUrl('/api/library'));
      setLibrary(res.data.library);
      
      try {
          const studioRes = await axios.get(getApiUrl('/api/studio_library'));
          if (studioRes.data && studioRes.data.library) {
              setStudioLibrary(studioRes.data.library);
          }
      } catch (e) {
          console.error("Failed to load studio library", e);
      }
      
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

  const getArtistName = (song) => {
    if (song.file_path && song.file_path.includes('/')) {
      return song.file_path.split('/')[0];
    }
    if (song.file_path && song.file_path.includes('\\')) {
      return song.file_path.split('\\')[0];
    }
    if (song.title && song.title.includes(' - ')) {
      return song.title.split(' - ')[0].trim();
    }
    return "Desconhecido";
  };

  const groupedByArtist = useMemo(() => {
    const groups = {};
    library.forEach(song => {
      const artist = getArtistName(song);
      if (!groups[artist]) groups[artist] = [];
      groups[artist].push(song);
    });
    return groups;
  }, [library]);

  const renderSongList = (songs) => (
    <div className="space-y-1">
      {songs.map((song, idx) => (
        <div
          key={`${song.video_id}-${idx}`}
          className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl group transition-all duration-300 cursor-pointer"
          onClick={() => onPlaySong({
              title: song.title,
              file: song.file_path,
              quality: "Local"
          }, songs)}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="w-16 h-16 bg-black/50 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
              {song.video_id && (
                <img 
                  src={`https://i.ytimg.com/vi/${song.video_id}/mqdefault.jpg`} 
                  alt="" 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity absolute inset-0" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity absolute z-10 drop-shadow-md" size={24} fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1 pr-4">
              <h4 className="text-white font-medium truncate text-base tracking-tight">
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
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-40 text-gray-400">
          <RefreshCw className="animate-spin mr-2" size={20} /> Carregando biblioteca...
        </div>
      );
    }
    
    if (library.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
          <Music size={48} className="opacity-20" />
          <p className="text-lg">Você ainda não baixou nenhuma música.</p>
        </div>
      );
    }

    if (activeTab === 'all') {
      return renderSongList(library);
    }

    if (activeTab === 'artists') {
      if (selectedArtist) {
        return (
          <div>
            <button 
              onClick={() => setSelectedArtist(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 px-2 transition-colors font-medium"
            >
              <ChevronLeft size={20} />
              Voltar para Artistas
            </button>
            <h3 className="text-xl font-bold text-white px-2 mb-4 tracking-tight">{selectedArtist}</h3>
            {renderSongList(groupedByArtist[selectedArtist] || [])}
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
          {Object.entries(groupedByArtist).sort((a,b) => a[0].localeCompare(b[0])).map(([artist, songs]) => {
            const firstVideoId = songs.find(s => s.video_id)?.video_id;
            return (
            <div 
              key={artist}
              onClick={() => setSelectedArtist(artist)}
              className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] border border-white/5 group"
            >
              <div className="w-14 h-14 bg-black/40 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner overflow-hidden relative">
                {firstVideoId ? (
                   <img src={`https://i.ytimg.com/vi/${firstVideoId}/mqdefault.jpg`} alt={artist} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                   <Disc className="text-white/50" size={24} />
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-white font-medium truncate text-sm">{artist}</h4>
                <p className="text-xs text-gray-500">{songs.length} música{songs.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            );
          })}
        </div>
      );
    }
    
    if (activeTab === 'studio') {
      if (studioLibrary.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
            <Mic size={48} className="opacity-20" />
            <p className="text-lg">Você ainda não processou nenhuma música na IA.</p>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {studioLibrary.map((item, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mic size={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">{item.track}</h4>
                  <p className="text-xs text-secondary mt-1">Modelo: {item.model} • {new Date(item.created_at * 1000).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="space-y-3 pl-16">
                {item.stems.map((stem, sIdx) => (
                  <div key={sIdx} className="bg-black/30 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-white capitalize">{stem.name.replace('.mp3', '')}</span>
                      <span className="text-xs text-secondary bg-black/50 px-2 py-1 rounded-md">{stem.size}</span>
                    </div>
                    <audio controls src={getApiUrl(`/downloads/${stem.path}`)} className="w-full h-8" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-surface-container-high rounded-[28px] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-surface-container-highest flex items-center justify-between bg-transparent flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-primary-container rounded-full">
                <Music className="text-on-primary-container" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-on-surface">Sua Biblioteca</h2>
                <p className="text-sm text-on-surface-variant">
                  {library.length} músicas salvas no seu PC
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={openFolder}
                className="flex items-center gap-2 px-4 py-2 bg-surface-variant hover:bg-surface-container-highest text-on-surface-variant rounded-full transition-colors text-sm font-medium border border-transparent"
              >
                <FolderOpen size={16} />
                <span className="hidden md:inline">Abrir Pasta</span>
              </button>
              <button
                onClick={fetchLibrary}
                className="p-2 text-on-surface-variant hover:text-on-surface transition-colors hover:bg-surface-variant rounded-full"
                title="Atualizar Biblioteca"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-on-surface-variant hover:text-on-surface transition-colors hover:bg-surface-variant rounded-full"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {!loading && (library.length > 0 || studioLibrary.length > 0) && (
            <div className="flex items-center gap-2 px-6 py-4 border-b border-surface-container-highest flex-shrink-0">
              {library.length > 0 && (
                  <>
                      <button
                        onClick={() => { setActiveTab('all'); setSelectedArtist(null); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${activeTab === 'all' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                      >
                        <Music size={16} />
                        Geral
                      </button>
                      <button
                        onClick={() => setActiveTab('artists')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${activeTab === 'artists' ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                      >
                        <Users size={16} />
                        Artistas
                      </button>
                  </>
              )}
              {studioLibrary.length > 0 && (
                  <button
                    onClick={() => setActiveTab('studio')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${activeTab === 'studio' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}
                  >
                    <Mic size={16} />
                    IA Stems
                  </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
