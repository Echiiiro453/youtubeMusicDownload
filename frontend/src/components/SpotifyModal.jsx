import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X } from 'lucide-react';

const SpotifyModal = ({
  showSpotifyModal,
  setShowSpotifyModal,
  spotifyInputUrl,
  setSpotifyInputUrl,
  setUrl,
  loadVideoDetails
}) => {
  return (
    <AnimatePresence>
      {showSpotifyModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-surface-container border border-outline-variant/30 shadow-2xl rounded-[2rem] p-6 flex flex-col relative overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container">
                  <Music size={20} />
                </div>
                <h3 className="text-xl font-bold text-on-surface tracking-tight">Importar Playlist</h3>
              </div>
              <button onClick={() => setShowSpotifyModal(false)} className="p-2 text-on-surface-variant hover:text-on-surface bg-surface-container-high hover:bg-surface-variant rounded-full transition-colors"><X size={20}/></button>
            </div>

            <div className="relative z-10 space-y-4">
              <p className="text-sm text-on-surface-variant">
                Cole o link da sua música ou Playlist do <b className="text-on-surface">Spotify</b>, <b className="text-on-surface">Apple Music</b> ou <b className="text-on-surface">SoundCloud</b>. O Lumina encontrará as músicas automaticamente.
              </p>
              <input
                type="text"
                placeholder="Ex: open.spotify.com/..., music.apple.com/... ou soundcloud.com/..."
                value={spotifyInputUrl}
                onChange={(e) => setSpotifyInputUrl(e.target.value)}
                className="w-full h-14 px-4 bg-surface-container-low border border-outline-variant/50 rounded-xl focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/50 transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && spotifyInputUrl) {
                    setUrl(spotifyInputUrl);
                    loadVideoDetails(spotifyInputUrl);
                    setShowSpotifyModal(false);
                    setSpotifyInputUrl('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (spotifyInputUrl) {
                    setUrl(spotifyInputUrl);
                    loadVideoDetails(spotifyInputUrl);
                    setShowSpotifyModal(false);
                    setSpotifyInputUrl('');
                  }
                }}
                disabled={!spotifyInputUrl}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-surface-container-highest disabled:text-on-surface-variant text-on-primary font-bold transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20"
              >
                Confirmar e Buscar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SpotifyModal;
