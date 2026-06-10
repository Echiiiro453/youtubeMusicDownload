import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Download, Users, ChevronDown, BellRing, AlertTriangle } from 'lucide-react';
import { SkeletonPlaylistItem } from './UIComponents';
import { t } from '../i18n';

export function PlaylistModal({
  isOpen,
  onClose,
  metadata,
  playlistLimit,
  setPlaylistLimit,
  fetchPlaylistDetails,
  selectedVideos,
  setSelectedVideos,
  playlistVideos,
  deselectAllVideos,
  downloadSelectedVideos,
  toggleVideoSelection,
  playlistLoading,
  executeRetry
}) {
  const [showArtistDropdown, setShowArtistDropdown] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState(null); // null | 'success' | 'already'

  if (!isOpen) return null;

  const uniqueArtists = Array.from(new Set(playlistVideos.map(v => v.uploader))).filter(Boolean).sort();

  const handleSubscribe = async () => {
    try {
      const res = await fetch('/api/subscriptions/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist_id: metadata.id,
          url: metadata.webpage_url || metadata.url,
          title: metadata.title,
          platform: metadata.magic_source || 'YouTube'
        })
      });
      const data = await res.json();
      setSubscribeStatus(data.success ? 'success' : 'already');
      setTimeout(() => setSubscribeStatus(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowArtistDropdown(false)}>
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container backdrop-blur-2xl rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-outline-variant/30 flex flex-col"
      >
        <div className="p-6 border-b border-outline-variant/30 flex-shrink-0">
          <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-bold text-on-surface">{t('playlistSelectMusic')}</h3>
                  {metadata?.id && (
                    <div className="relative">
                      <button
                        onClick={handleSubscribe}
                        className={`p-2 rounded-full transition-all flex items-center justify-center ${subscribeStatus === 'success' ? 'bg-primary text-on-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                        title="Monitorar playlist (Auto-Download)"
                      >
                        <BellRing size={16} />
                      </button>
                      {subscribeStatus && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap z-50 shadow-lg bg-surface-container-highest text-on-surface border border-outline-variant/30"
                        >
                          {subscribeStatus === 'success' ? 'Monitoramento ativado!' : 'Ja inscrito nesta playlist'}
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-on-surface-variant text-sm">{metadata?.title}</p>
                {metadata?.is_magic && metadata?.magic_source !== 'Spotify' && (
                  <div className="mt-2 text-xs bg-tertiary-container/30 text-on-tertiary-container p-2 rounded-xl border border-tertiary/20 flex items-start gap-2 max-w-lg">
                    <AlertTriangle size={14} className="text-tertiary flex-shrink-0 mt-0.5" />
                    <span>
                      Link do <b>{metadata.magic_source}</b>: apenas ~50 musicas sao carregadas por limitacoes da plataforma para visitantes. Para contornar, use um link equivalente do YouTube.
                    </span>
                  </div>
                )}
              <div className="flex items-center gap-2 mt-2 bg-surface-container-low p-1.5 rounded-xl w-fit border border-outline-variant/20">
                <span className="text-on-surface-variant text-xs font-medium">{t('playlistLoadLimit')}</span>
                <select
                  value={playlistLimit}
                  onChange={(e) => setPlaylistLimit(Number(e.target.value))}
                  className="bg-transparent text-on-surface text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={50} className="bg-surface-container-high text-on-surface">50 {t('playlistItems')}</option>
                  <option value={100} className="bg-surface-container-high text-on-surface">100 {t('playlistItems')}</option>
                  <option value={200} className="bg-surface-container-high text-on-surface">200 {t('playlistItems')}</option>
                  <option value={500} className="bg-surface-container-high text-on-surface">500 {t('playlistItems')}</option>
                  <option value={0} className="bg-surface-container-high text-on-surface">{t('playlistAllItems')}</option>
                </select>
                <button
                  onClick={fetchPlaylistDetails}
                  className="text-xs bg-on-surface/10 hover:bg-on-surface/20 text-on-surface px-2 py-1 rounded-full transition-colors flex items-center gap-1 ml-1"
                  title={t('playlistRefreshTitle')}
                >
                  {t('playlistRefresh')}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-on-surface/10 rounded-full transition-colors"
            >
              <X className="text-on-surface-variant" size={24} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="text-sm font-medium text-on-surface mr-2">
              {t('playlistSelectedOf', selectedVideos.size, playlistVideos.length)}
            </span>
            <button
              onClick={() => {
                const pendingIndices = new Set(
                  playlistVideos
                    .filter(v => v.status !== 'downloaded')
                    .map(v => v.index)
                );
                setSelectedVideos(pendingIndices);
              }}
              className="px-4 py-2 bg-on-surface/10 hover:bg-on-surface/20 text-on-surface rounded-full text-sm font-medium transition-colors"
            >
              {t('playlistSelectNew')}
            </button>
            
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowArtistDropdown(!showArtistDropdown); }}
                className="px-4 py-2 bg-on-surface/10 hover:bg-on-surface/20 text-on-surface rounded-full text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Users size={16} />
                Por Artista
                <ChevronDown size={14} className={`transition-transform ${showArtistDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showArtistDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto bg-surface-container-high/95 backdrop-blur-xl border border-outline-variant/30 rounded-2xl shadow-2xl z-[300] custom-scrollbar p-2"
                  >
                    {uniqueArtists.map(artist => {
                      const count = playlistVideos.filter(v => v.uploader === artist).length;
                      return (
                        <button 
                          key={artist}
                          className="w-full text-left px-3 py-2.5 hover:bg-on-surface/10 rounded-xl text-sm text-on-surface flex items-center justify-between transition-colors"
                          onClick={() => {
                            const indices = playlistVideos.filter(v => v.uploader === artist && v.status !== 'downloaded').map(v => v.index);
                            setSelectedVideos(new Set(indices)); // Replace selections
                            setShowArtistDropdown(false);
                          }}
                        >
                          <span className="truncate font-medium">{artist}</span>
                          <span className="text-gray-400 text-xs ml-2 bg-black/30 px-2 py-0.5 rounded-full">{count}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={deselectAllVideos}
              className="px-4 py-2 bg-transparent hover:bg-on-surface/5 text-on-surface-variant hover:text-on-surface rounded-full text-sm font-medium transition-colors ml-auto"
            >
              {t('playlistClearSelection')}
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
          {playlistLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonPlaylistItem key={i} />
            ))
          ) : (
            playlistVideos.map((video) => (
              <div
                key={video.index}
                onClick={() => {
                  if (video.status === 'downloaded') return;
                  toggleVideoSelection(video.index);
                }}
                className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${video.status === 'downloaded' ? 'opacity-50 cursor-default' : ''
                  } ${selectedVideos.has(video.index)
                    ? 'bg-primary/20 shadow-lg scale-[1.01]'
                    : video.status === 'downloaded'
                      ? 'bg-transparent'
                      : 'bg-transparent hover:bg-on-surface/5'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedVideos.has(video.index)
                  ? 'bg-primary border-primary'
                  : 'border-outline-variant/50'
                  }`}>
                  {selectedVideos.has(video.index) && <Check size={14} className="text-on-primary" />}
                </div>
                <div className="relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black/50">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-on-surface font-medium truncate">{video.title}</h4>
                    {video.status === 'downloaded' && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded border border-green-500/30">
                          {t('playlistAlreadyDownloaded')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            executeRetry(video, video.playlistIdRef);
                          }}
                          className="text-xs text-on-surface hover:text-primary underline transition-colors"
                        >
                          {t('playlistRedownload')}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-on-surface-variant text-sm flex items-center gap-2">
                    <span>{video.uploader}</span>
                    {video.duration_string && video.duration_string !== '0:00' && (
                      <>
                        <span>•</span>
                        <span>{video.duration_string}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-gray-500 text-sm font-mono flex-shrink-0">
                  #{video.index + 1}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-6 border-t border-outline-variant/30 bg-surface-container/50 backdrop-blur-md flex-shrink-0">
          <button
            onClick={downloadSelectedVideos}
            disabled={selectedVideos.size === 0}
            className="w-full py-4 bg-primary text-on-primary hover:bg-primary/90 disabled:bg-surface-container-highest disabled:text-on-surface-variant font-bold rounded-full transition-all transform shadow-xl flex items-center justify-center gap-2"
          >
            <Download size={20} />
            <span>{t('playlistDownloadCount', selectedVideos.size)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
