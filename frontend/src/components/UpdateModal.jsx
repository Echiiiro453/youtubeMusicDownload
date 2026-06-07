import React from 'react';
import { motion } from 'framer-motion';
import { Download, X, Gift, AlertCircle, RefreshCw } from 'lucide-react';

export function UpdateModal({ isOpen, onClose, updateData }) {
  if (!isOpen || !updateData) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-surface-container-high border border-primary/30 rounded-2xl p-0 w-full max-w-lg shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-on-surface">Nova Versão Disponível!</h2>
                <p className="text-sm text-on-surface-variant">
                  Versão {updateData.latest_version} (Atual: {updateData.current_version})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-surface-container-highest border border-outline-variant/30 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Notas da Atualização
            </h3>
            <div className="text-sm text-on-surface-variant whitespace-pre-wrap font-mono custom-scrollfoo max-h-48 overflow-y-auto pr-2">
              {updateData.release_notes}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-on-surface bg-surface-container-highest hover:bg-on-surface/10 transition-colors"
            >
              Lembrar depois
            </button>
            <a
              href={updateData.download_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-on-primary bg-primary hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Baixar Atualização
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
