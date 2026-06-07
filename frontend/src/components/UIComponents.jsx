import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X, FolderOpen } from 'lucide-react';

export function SkeletonCard() {
  return (
    <div className="bg-surface-container-low backdrop-blur-md border border-outline-variant/30 rounded-xl p-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-on-surface/5 to-transparent animate-pulse" />
      <div className="relative space-y-3">
        <div className="w-full aspect-video bg-on-surface/10 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-on-surface/10 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-on-surface/10 rounded w-1/2 animate-pulse" />
        </div>
        <div className="h-9 bg-on-surface/10 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonPlaylistItem() {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/30">
      <div className="w-4 h-4 bg-on-surface/10 rounded animate-pulse" />
      <div className="w-16 h-16 bg-on-surface/10 rounded animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-on-surface/10 rounded w-2/3 animate-pulse" />
        <div className="h-3 bg-on-surface/10 rounded w-1/3 animate-pulse" />
      </div>
    </div>
  );
}

export function QualityOption({ id, label, sub, selected, set }) {
  const isSelected = selected === id;
  return (
    <button
      onClick={() => set(id)}
      className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 flex items-center justify-between group border ${isSelected
        ? 'bg-primary text-on-primary border-primary shadow-lg scale-[1.02]'
        : 'bg-transparent border-outline-variant/30 hover:border-outline-variant hover:bg-on-surface/5'
        }`}
    >
      <div>
        <p className={`font-medium tracking-tight ${isSelected ? 'text-on-primary' : 'text-on-surface'}`}>{label}</p>
        <p className={`text-xs mt-0.5 ${isSelected ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>{sub}</p>
      </div>
      {isSelected && (
        <motion.div layoutId="check">
          <CheckCircle className="w-5 h-5 text-on-primary" />
        </motion.div>
      )}
    </button>
  )
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="pointer-events-auto w-[320px] bg-surface-container-high/90 backdrop-blur-md border border-outline-variant/30 p-4 rounded-xl shadow-2xl flex items-start gap-3"
          >
            <div className={`mt-1 ${toast.type === 'success' ? 'text-green-400' : toast.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
              {toast.type === 'success' ? <CheckCircle size={18} /> :
                toast.type === 'error' ? <AlertTriangle size={18} /> :
                  <Info size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-sm ${toast.type === 'success' ? 'text-green-400' : toast.type === 'error' ? 'text-red-400' : 'text-on-surface'}`}>
                {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Erro' : 'Info'}
              </h4>
              <p className="text-sm text-on-surface-variant break-words leading-tight mt-1">{toast.title}</p>
              {toast.action && (
                <button onClick={toast.action.onClick} className="text-xs text-primary font-bold hover:underline mt-2 flex items-center gap-1">
                  <FolderOpen size={12} /> {toast.action.label}
                </button>
              )}
            </div>
            <button onClick={() => removeToast(toast.id)}><X size={14} className="text-on-surface-variant hover:text-on-surface" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
