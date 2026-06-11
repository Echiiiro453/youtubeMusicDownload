import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { t } from '../i18n';

export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS = {
  'Normal': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Rock': [5, 4, 3, 1, -1, -1, 0, 2, 3, 4],
  'Pop': [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2],
  'Vocal': [-2, -2, 0, 2, 4, 4, 3, 1, 0, -2],
  'Electronic': [4, 3, 1, -2, -3, 0, 1, 3, 4, 5],
  'Acoustic': [2, 2, 1, 0, 0, 0, 1, 1, 2, 2]
};

export function EqualizerModal({ isOpen, onClose, gains, setGains, preset, setPreset }) {
  if (!isOpen) return null;

  const handleGainChange = (index, value) => {
    const newGains = [...gains];
    newGains[index] = parseFloat(value);
    setGains(newGains);
    setPreset('Custom');
  };

  const applyPreset = (presetName) => {
    if (EQ_PRESETS[presetName]) {
      setGains(EQ_PRESETS[presetName]);
      setPreset(presetName);
    }
  };

  const formatHz = (freq) => {
    if (freq >= 1000) return `${freq / 1000}k`;
    return freq;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface border border-surface-variant rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-surface/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <SlidersHorizontal size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface">Equalizador</h2>
                <p className="text-sm text-on-surface-variant">Ajuste o áudio em tempo real</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
            >
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-8">
            {/* Presets */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-on-surface-variant">Presets</label>
                <button 
                  onClick={() => applyPreset('Normal')}
                  className="text-xs flex items-center space-x-1 text-primary hover:underline"
                >
                  <RefreshCw size={12} />
                  <span>Resetar</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(EQ_PRESETS).map(p => (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      preset === p 
                        ? 'bg-primary text-on-primary shadow-md' 
                        : 'bg-surface-variant text-on-surface hover:bg-tertiary/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <div className={`px-4 py-1.5 rounded-full text-sm font-medium border border-dashed border-surface-variant ${preset === 'Custom' ? 'text-primary border-primary' : 'text-on-surface-variant'}`}>
                  Custom
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="flex justify-between items-end space-x-2 pt-4">
              {EQ_BANDS.map((freq, index) => (
                <div key={freq} className="flex flex-col items-center space-y-4 flex-1">
                  <div className="text-xs font-mono text-on-surface-variant w-8 text-center h-4">
                    {gains[index] > 0 ? '+' : ''}{gains[index]}
                  </div>
                  
                  <div className="relative h-48 w-full flex justify-center py-2">
                    {/* Tick marks context */}
                    <div className="absolute inset-0 flex flex-col justify-between items-center pointer-events-none opacity-20 py-2">
                      <div className="w-4 h-px bg-on-surface"></div>
                      <div className="w-2 h-px bg-on-surface"></div>
                      <div className="w-4 h-px bg-on-surface"></div>
                      <div className="w-2 h-px bg-on-surface"></div>
                      <div className="w-4 h-px bg-on-surface"></div>
                    </div>

                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="0.1"
                      value={gains[index]}
                      onChange={(e) => handleGainChange(index, e.target.value)}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-1 appearance-none bg-transparent cursor-pointer"
                      style={{
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        accentColor: 'var(--md-sys-color-primary)',
                      }}
                    />
                    {/* Custom styling for slider thumb/track can be done via standard CSS, but simple inline accentColor works for modern browsers */}
                  </div>

                  <div className="text-xs font-medium text-on-surface-variant pt-2">
                    {formatHz(freq)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-tertiary/10 p-3 rounded-lg border border-tertiary/20 flex items-start space-x-3">
              <span className="text-tertiary text-sm mt-0.5">ℹ️</span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Este equalizador é aplicado nativamente em tempo real sobre a faixa de áudio. Dependendo do preset escolhido (como Bass Boost alto), faixas que já têm muito ganho natural podem distorcer. Ajuste conforme seu dispositivo de som.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
