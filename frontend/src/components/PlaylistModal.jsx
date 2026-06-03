import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Download } from 'lucide-react';
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-white/10 flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{t('playlistSelectMusic')}</h3>
              <p className="text-gray-300 text-sm">{metadata?.title}</p>
              {metadata?.magic_source && (
                <div className="mt-2 text-xs bg-amber-500/20 text-amber-200 p-2 rounded-lg border border-amber-500/30 flex items-start gap-2 max-w-lg">
                  <span className="text-amber-400">⚠️</span>
                  <span>
                    Como você está usando um link do <b>{metadata.magic_source}</b>, apenas as primeiras ~50 músicas serão carregadas devido às restrições para visitantes anônimos da plataforma. (Mudar o Limite de Carga abaixo não fará efeito). Para contornar, use um link equivalente do YouTube.
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 bg-black/20 p-1.5 rounded-lg w-fit">
                <span className="text-gray-400 text-xs font-medium">{t('playlistLoadLimit')}</span>
                <select
                  value={playlistLimit}
                  onChange={(e) => setPlaylistLimit(Number(e.target.value))}
                  className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={50} className="bg-slate-900 text-white">50 {t('playlistItems')}</option>
                  <option value={100} className="bg-slate-900 text-white">100 {t('playlistItems')}</option>
                  <option value={200} className="bg-slate-900 text-white">200 {t('playlistItems')}</option>
                  <option value={500} className="bg-slate-900 text-white">500 {t('playlistItems')}</option>
                  <option value={0} className="bg-slate-900 text-white">{t('playlistAllItems')}</option>
                </select>
                <button
                  onClick={fetchPlaylistDetails}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-full transition-colors flex items-center gap-1 ml-1"
                  title={t('playlistRefreshTitle')}
                >
                  {t('playlistRefresh')}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="text-gray-300" size={24} />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm font-medium text-white">
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
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors"
            >
              {t('playlistSelectNew')}
            </button>
            <button
              onClick={deselectAllVideos}
              className="px-4 py-2 bg-transparent hover:bg-white/5 text-white/50 hover:text-white rounded-full text-sm font-medium transition-colors"
            >
              {t('playlistClearSelection')}
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
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
                    ? 'bg-white/10 shadow-lg scale-[1.01]'
                    : video.status === 'downloaded'
                      ? 'bg-transparent'
                      : 'bg-transparent hover:bg-white/5'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selectedVideos.has(video.index)
                  ? 'bg-white border-white'
                  : 'border-white/30'
                  }`}>
                  {selectedVideos.has(video.index) && <Check size={14} className="text-black" />}
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
                    <h4 className="text-white font-medium truncate">{video.title}</h4>
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
                          className="text-xs text-white hover:text-white/70 underline transition-colors"
                        >
                          {t('playlistRedownload')}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm flex items-center gap-2">
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
        
        <div className="p-6 border-t border-white/10 bg-slate-900/50 backdrop-blur-md flex-shrink-0">
          <button
            onClick={downloadSelectedVideos}
            disabled={selectedVideos.size === 0}
            className="w-full py-4 bg-white text-black hover:bg-gray-200 disabled:bg-white/10 disabled:text-white/30 font-bold rounded-full transition-all transform shadow-xl flex items-center justify-center gap-2"
          >
            <Download size={20} />
            <span>{t('playlistDownloadCount', selectedVideos.size)}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
