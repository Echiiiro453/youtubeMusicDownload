import React from 'react';
import { t } from '../i18n';
import { 
  Music, ArrowRightLeft, Mic, Search, List, 
  Clock, RefreshCw, Smartphone, BellRing, Heart, Settings 
} from 'lucide-react';
import { RippleButton } from './Ripple';
import { WindowControls } from './WindowControls';

const TopAppBar = ({
  setShowConverter,
  setShowStudioModal,
  setShowShazamModal,
  setShowLibrary,
  setShowHistory,
  checkForUpdates,
  isCheckingUpdate,
  setShowMobileSync,
  setShowSubscriptionsModal,
  setShowDonate,
  setShowSettings,
  isAuthenticated
}) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-5xl pointer-events-none">
      <div
        data-tauri-drag-region
        className="pointer-events-auto w-full h-16 bg-surface-container-highest rounded-full shadow-lg shadow-black/10 flex items-center justify-between px-4 border border-outline-variant/30 transition-colors duration-500"
      >
        <div className="flex items-center gap-3 pointer-events-none pl-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-inner">
            <Music className="w-5 h-5 text-on-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-on-surface">
            Lumina
          </span>
        </div>

        <div className="flex items-center gap-2">
          <RippleButton onClick={() => setShowConverter(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title="Conversor de Arquivos">
            <ArrowRightLeft className="w-5 h-5" />
          </RippleButton>
          <RippleButton onClick={() => setShowStudioModal(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title={t('studioTitle')}>
            <Mic className="w-5 h-5" />
          </RippleButton>
          <RippleButton onClick={() => setShowShazamModal(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title={t('shazamTitle')}>
            <Search className="w-5 h-5" />
          </RippleButton>
          <RippleButton onClick={() => setShowLibrary(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title={t('navLibrary')}>
            <List className="w-5 h-5" />
          </RippleButton>
          <RippleButton onClick={() => setShowHistory(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title="Histórico">
            <Clock className="w-5 h-5" />
          </RippleButton>
          <RippleButton onClick={() => checkForUpdates(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title={t('btnUpdateTitle')}>
            <RefreshCw className={`w-5 h-5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
          </RippleButton>
          <RippleButton onClick={() => setShowMobileSync(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title="Sincronizar com Celular">
            <Smartphone className="w-5 h-5" />
          </RippleButton>
          <RippleButton onClick={() => setShowSubscriptionsModal(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title="Gerenciar Inscrições">
            <BellRing className="w-5 h-5" />
          </RippleButton>
          <RippleButton onClick={() => setShowDonate(true)} className="w-10 h-10 rounded-full hover:bg-error/10 text-error hover:text-error flex items-center justify-center transition-colors" title={t('btnDonate')}>
            <Heart className="w-5 h-5" />
          </RippleButton>
          
          <div className="w-px h-8 bg-outline-variant/50 mx-2"></div>
          
          <div className="relative">
            <RippleButton onClick={() => setShowSettings(true)} className="w-10 h-10 rounded-full hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors" title={t('btnConfigure')}>
              <Settings className="w-5 h-5" />
            </RippleButton>
            {isAuthenticated && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 border-2 border-surface-container-highest rounded-full pointer-events-none"></span>
            )}
          </div>

          <div className="w-px h-8 bg-outline-variant/50 mx-2"></div>
          <WindowControls />
        </div>
      </div>
    </div>
  );
};

export default TopAppBar;
