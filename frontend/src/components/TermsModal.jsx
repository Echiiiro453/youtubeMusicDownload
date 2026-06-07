import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check } from 'lucide-react';

export function TermsModal({ showTerms, termsLoading, termsContent, handleAcceptTerms }) {
  return (
    <AnimatePresence>
      {showTerms && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-surface-container-high border border-outline-variant/30 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 border-b border-outline-variant/30 pb-6">
                <div className="p-4 bg-primary/10 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-on-surface">Termos de Uso</h2>
                  <p className="text-on-surface-variant text-sm">Leia atentamente antes de continuar</p>
                </div>
              </div>

              <div className="max-h-[40vh] overflow-y-auto pr-4 custom-scroll text-on-surface-variant space-y-4 font-mono text-sm bg-surface-container p-6 rounded-2xl whitespace-pre-wrap">
                {termsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p>Carregando termos...</p>
                  </div>
                ) : termsContent}
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-xs text-on-surface-variant text-center">
                  Ao clicar em "Concordar e Continuar", você afirma que leu e aceita em sua totalidade os termos descritos acima.
                </p>
                <button
                  onClick={handleAcceptTerms}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Check size={24} />
                  <span>Concordar e Continuar</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
