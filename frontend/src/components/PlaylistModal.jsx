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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-purple-500/20 flex flex-col"
      >
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{t('playlistSelectMusic')}</h3>
              <p className="text-gray-300 text-sm">{metadata?.title}</p>
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
                  className="text-xs bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 px-2 py-1 rounded transition-colors flex items-center gap-1 ml-1 border border-purple-500/30"
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
            <span className="text-lg font-semibold text-purple-300">
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
              className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg text-sm font-medium transition-colors"
            >
              {t('playlistSelectNew')}
            </button>
            <button
              onClick={deselectAllVideos}
              className="px-4 py-2 bg-gray-600/30 hover:bg-gray-600/50 text-gray-200 rounded-lg text-sm font-medium transition-colors"
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
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${video.status === 'downloaded' ? 'opacity-50 cursor-default' : ''
                  } ${selectedVideos.has(video.index)
                    ? 'bg-purple-600/30 border-2 border-purple-500'
                    : video.status === 'downloaded'
                      ? 'bg-white/5 border-2 border-transparent'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedVideos.has(video.index)
                  ? 'bg-purple-600 border-purple-600'
                  : 'border-gray-400'
                  }`}>
                  {selectedVideos.has(video.index) && <Check size={14} className="text-white" />}
                </div>
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                />
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
                          className="text-xs text-purple-400 hover:text-purple-300 underline"
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
        
        <div className="p-6 border-t border-white/10 bg-gradient-to-r from-purple-600/10 to-pink-600/10 flex-shrink-0">
          <button
            onClick={downloadSelectedVideos}
            disabled={selectedVideos.size === 0}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <Download size={20} />
              <span>{t('playlistDownloadCount', selectedVideos.size)}</span>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
