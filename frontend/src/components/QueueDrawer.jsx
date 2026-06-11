import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../i18n';
import { List, X, Trash2, PlayCircle } from 'lucide-react';
import { RippleButton } from './Ripple';
import { QueueItem } from './QueueItem';

const QueueDrawer = ({
  showQueue,
  setShowQueue,
  queue,
  setQueue,
  isProcessingQueue,
  processQueue,
  removeFromQueue,
  setCurrentSong,
  updateQueueItem,
  globalJobs,
  getApiUrl
}) => {
  return (
    <AnimatePresence>
      {showQueue && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQueue(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-surface border-l border-outline-variant z-[101] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="p-6 border-b border-outline-variant bg-surface-container-high">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <List className="text-primary" />
                  {t('queueTitle')}
                </h3>
                <button onClick={() => setShowQueue(false)} className="p-2 hover:bg-surface-variant text-on-surface-variant rounded-full">
                  <X />
                </button>
              </div>
              <div className="flex justify-between items-center text-sm text-secondary">
                <span>{queue.length} itens</span>
                <button
                  onClick={() => setQueue([])}
                  disabled={isProcessingQueue}
                  className="text-error hover:text-error/80 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 size={14} /> {t('queueClear')}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-secondary opacity-50">
                  <List size={48} className="mb-4" />
                  <p>{t('queueEmpty')}</p>
                </div>
              ) : (
                queue.map((item) => (
                  <QueueItem
                    key={item.uniqueId}
                    item={item}
                    getApiUrl={getApiUrl}
                    removeFromQueue={removeFromQueue}
                    setCurrentSong={setCurrentSong}
                    updateQueueItem={updateQueueItem}
                    job={globalJobs[item.jobId]} // Pass Global Job State
                  />
                ))
              )}
            </div>

            <div className="p-6 border-t border-outline-variant bg-surface-container-high">
              <RippleButton
                id="start-downloads-btn"
                onClick={processQueue}
                disabled={isProcessingQueue || queue.filter(i => i.status === 'pending').length === 0}
                className="w-full py-4 bg-white text-black hover:bg-gray-200 disabled:bg-white/10 disabled:text-white/30 font-bold rounded-full shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {isProcessingQueue ? (
                  <><div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" /> {t('loading')}</>
                ) : (
                  <><PlayCircle size={20} /> {t('confirmDownload')}</>
                )}
              </RippleButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QueueDrawer;
