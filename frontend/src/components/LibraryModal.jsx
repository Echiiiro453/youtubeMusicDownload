import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, FolderOpen, RefreshCw, Music, Users, ChevronLeft, Disc, Mic, Heart, Edit3, Search } from 'lucide-react';
import axios from 'axios';

export function LibraryModal({ isOpen, onClose, getApiUrl, onPlaySong, onEditTags }) {
  const [library, setLibrary] = useState([]);
  const [studioLibrary, setStudioLibrary] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'artists' | 'favorites' | 'studio'
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchLibrary();
      setSelectedArtist(null);
      setSearch('');
    }
  }, [isOpen]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const [libRes, favsRes] = await Promise.all([
        axios.get(getApiUrl('/api/library')),
        axios.get(getApiUrl('/api/favorites')),
      ]);
      setLibrary(libRes.data.library || []);
      const favs = favsRes.data.favorites || [];
      setFavorites(favs);
      setFavoriteIds(new Set(favs.map(f => f.video_id)));

      try {
        const studioRes = await axios.get(getApiUrl('/api/studio_library'));
        if (studioRes.data?.library) setStudioLibrary(studioRes.data.library);
      } catch (e) { /* optional */ }
    } catch (e) {
      console.error('Failed to load library:', e);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = async () => {
    try { await axios.post(getApiUrl('/open_folder')); } catch (e) { /* ignore */ }
  };

  const toggleFavorite = useCallback(async (song, e) => {
    e.stopPropagation();
    const vid = song.video_id;
    if (!vid) return;
    const isFav = favoriteIds.has(vid);
    try {
      if (isFav) {
        await axios.delete(getApiUrl(`/api/favorites/${vid}`));
        setFavoriteIds(prev => { const s = new Set(prev); s.delete(vid); return s; });
        setFavorites(prev => prev.filter(f => f.video_id !== vid));
      } else {
        await axios.post(getApiUrl('/api/favorites/add'), {
          video_id: vid,
          title: song.title || '',
          file_path: song.file_path || '',
        });
        setFavoriteIds(prev => new Set([...prev, vid]));
        setFavorites(prev => [{ video_id: vid, title: song.title, file_path: song.file_path, added_at: Date.now() / 1000 }, ...prev]);
      }
    } catch (e) { console.error(e); }
  }, [favoriteIds, getApiUrl]);

  const getArtistName = (song) => {
    if (song.file_path?.includes('/')) return song.file_path.split('/')[0];
    if (song.file_path?.includes('\\')) return song.file_path.split('\\')[0];
    if (song.title?.includes(' - ')) return song.title.split(' - ')[0].trim();
    return 'Desconhecido';
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

  const filteredLibrary = useMemo(() => {
    if (!search) return library;
    return library.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()));
  }, [library, search]);

  const filteredFavorites = useMemo(() => {
    if (!search) return favorites;
    return favorites.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()));
  }, [favorites, search]);

  const renderSongItem = (song, idx, queue) => {
    const isFav = favoriteIds.has(song.video_id);
    return (
      <motion.div
        key={`${song.video_id}-${idx}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.02 }}
        className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl group transition-all duration-200 cursor-pointer"
        onClick={() => onPlaySong({ title: song.title, file: song.file_path, quality: 'Local' }, queue)}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-14 h-14 bg-black/50 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
            {song.video_id && (
              <img
                src={`https://i.ytimg.com/vi/${song.video_id}/mqdefault.jpg`}
                alt=""
                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity absolute inset-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <Play className="text-white opacity-0 group-hover:opacity-100 transition-opacity absolute z-10 drop-shadow-md" size={22} fill="currentColor" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-white font-medium truncate text-sm tracking-tight">{song.title || 'Música Desconhecida'}</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">{getArtistName(song)}</p>
          </div>
        </div>

        {/* Actions - sempre visíveis */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEditTags && song.file_path && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditTags(song); }}
              className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors"
              title="Editar Tags"
            >
              <Edit3 size={15} />
            </button>
          )}
          <motion.button
            onClick={(e) => toggleFavorite(song, e)}
            whileTap={{ scale: 0.8 }}
            className={`p-2 rounded-full transition-colors ${isFav ? 'text-red-400 hover:bg-red-400/10' : 'text-on-surface-variant hover:bg-white/10 hover:text-red-400'}`}
            title={isFav ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
          >
            <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
          </motion.button>
        </div>
      </motion.div>
    );
  };

  const renderContent = () => {
    if (loading) return (
      <div className="flex items-center justify-center h-40 text-on-surface-variant">
        <RefreshCw className="animate-spin mr-2" size={20} /> Carregando biblioteca...
      </div>
    );

    if (activeTab === 'all') {
      if (filteredLibrary.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-4">
          <Music size={48} className="opacity-20" />
          <p>{search ? 'Nenhuma música encontrada.' : 'Você ainda não baixou nenhuma música.'}</p>
        </div>
      );
      return <div className="space-y-1">{filteredLibrary.map((s, i) => renderSongItem(s, i, filteredLibrary))}</div>;
    }

    if (activeTab === 'favorites') {
      if (filteredFavorites.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-4">
          <Heart size={48} className="opacity-20" />
          <p>{search ? 'Nenhum favorito encontrado.' : 'Nenhuma música favoritada ainda. Passe o mouse numa música e clique no coração!'}</p>
        </div>
      );
      return <div className="space-y-1">{filteredFavorites.map((s, i) => renderSongItem(s, i, filteredFavorites))}</div>;
    }

    if (activeTab === 'artists') {
      if (selectedArtist) return (
        <div>
          <button onClick={() => setSelectedArtist(null)} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface mb-4 px-2 transition-colors font-medium">
            <ChevronLeft size={20} /> Voltar para Artistas
          </button>
          <h3 className="text-xl font-bold text-on-surface px-2 mb-4">{selectedArtist}</h3>
          <div className="space-y-1">{(groupedByArtist[selectedArtist] || []).map((s, i) => renderSongItem(s, i, groupedByArtist[selectedArtist]))}</div>
        </div>
      );
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2">
          {Object.entries(groupedByArtist).sort((a, b) => a[0].localeCompare(b[0])).map(([artist, songs]) => {
            const firstVideoId = songs.find(s => s.video_id)?.video_id;
            return (
              <div key={artist} onClick={() => setSelectedArtist(artist)}
                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] border border-white/5 group">
                <div className="w-14 h-14 bg-black/40 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {firstVideoId
                    ? <img src={`https://i.ytimg.com/vi/${firstVideoId}/mqdefault.jpg`} alt={artist} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => { e.target.style.display = 'none'; }} />
                    : <Disc className="text-on-surface-variant" size={24} />}
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-on-surface font-medium truncate text-sm">{artist}</h4>
                  <p className="text-xs text-on-surface-variant">{songs.length} música{songs.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'studio') {
      if (studioLibrary.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-4">
          <Mic size={48} className="opacity-20" />
          <p>Você ainda não processou nenhuma música na IA.</p>
        </div>
      );
      return (
        <div className="space-y-4">
          {studioLibrary.map((item, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center flex-shrink-0"><Mic size={24} /></div>
                <div>
                  <h4 className="text-on-surface font-bold text-lg">{item.track}</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Modelo: {item.model} • {new Date(item.created_at * 1000).toLocaleString()}</p>
                </div>
              </div>
              <div className="space-y-3 pl-16">
                {item.stems.map((stem, sIdx) => (
                  <div key={sIdx} className="bg-black/30 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-on-surface capitalize">{stem.name.replace('.mp3', '')}</span>
                      <span className="text-xs text-on-surface-variant bg-black/50 px-2 py-1 rounded-md">{stem.size}</span>
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
    if (activeTab === 'editor') {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-4 p-8 text-center">
          <Edit3 size={48} className="text-primary opacity-80" />
          <div>
            <h3 className="text-lg font-bold text-on-surface">Editor de Tags Independente</h3>
            <p className="mt-1 max-w-md">Você pode editar os metadados (capa, letra, artista) de qualquer música do seu computador, não apenas as que estão na biblioteca.</p>
          </div>
          <button 
            onClick={async () => {
              try {
                const res = await axios.post(getApiUrl('/api/choose_file'));
                if (res.data.file) {
                  const fileName = res.data.file.split(/[\\/]/).pop();
                  if (onEditTags) onEditTags({ file_path: res.data.file, title: fileName });
                }
              } catch (e) { console.error("Error picking file", e); }
            }}
            className="mt-2 px-6 py-3 bg-primary text-on-primary rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
          >
            Selecionar Música do PC
          </button>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'all', label: 'Geral', icon: Music, show: true },
    { id: 'favorites', label: 'Favoritos', icon: Heart, show: true, badge: favorites.length || null },
    { id: 'artists', label: 'Artistas', icon: Users, show: library.length > 0 },
    { id: 'studio', label: 'IA Stems', icon: Mic, show: studioLibrary.length > 0 },
    { id: 'editor', label: 'Editor Tags', icon: Edit3, show: true },
  ];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-surface-container-high rounded-[28px] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="p-6 border-b border-surface-container-highest flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-container rounded-full"><Music className="text-on-primary-container" size={22} /></div>
              <div>
                <h2 className="text-2xl font-bold text-on-surface">Sua Biblioteca</h2>
                <p className="text-sm text-on-surface-variant">{library.length} músicas salvas no seu PC</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="bg-surface-container-highest border border-outline-variant/30 rounded-full pl-8 pr-4 py-2 text-sm text-on-surface placeholder-on-surface-variant/50 outline-none focus:border-primary/50 w-44"
                />
              </div>
              <button onClick={openFolder} className="flex items-center gap-2 px-4 py-2 bg-surface-variant hover:bg-surface-container-highest text-on-surface-variant rounded-full transition-colors text-sm font-medium">
                <FolderOpen size={16} /><span className="hidden md:inline">Abrir Pasta</span>
              </button>
              <button onClick={fetchLibrary} className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors" title="Atualizar">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 px-6 py-3 border-b border-surface-container-highest flex-shrink-0 overflow-x-auto">
            {tabs.filter(t => t.show).map(tab => (
              <button key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedArtist(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}`}>
                <tab.icon size={15} fill={tab.id === 'favorites' && activeTab === tab.id ? 'currentColor' : 'none'} />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-1 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
