import React from 'react';
import { Play, X, Zap } from 'lucide-react';

export const QueueItem = ({ item, removeFromQueue, setCurrentSong, job }) => {
    const displayStatus = job?.status || item.status;
    const displayProgress = job?.progress !== undefined ? job?.progress : item.progress;
    const displayTitle = job?.title || item.title;
    const error = job?.error;
    const speed = job?.speed_str;
    const totalBytes = job?.total_bytes_str;
    const downloadedBytes = job?.downloaded_bytes_str;

    const getStatusText = () => {
        if (displayStatus === 'pending') return 'Aguardando Início';
        if (displayStatus === 'queued') return 'Na Fila';
        if (displayStatus === 'timeout') return '⏰ Tempo excedido';
        if (displayStatus === 'done' || displayStatus === 'completed') return 'Concluído ✅';
        if (displayStatus === 'processing') return 'Finalizando metadados...';
        if ((displayStatus === 'downloading' || displayStatus === 'running') && displayProgress >= 98) return 'Finalizando...';
        if (displayStatus === 'running' || displayStatus === 'downloading') return `Baixando ${displayProgress.toFixed(1)}%`;
        if (displayStatus === 'error') return 'Erro';
        return displayStatus;
    };

    const isDownloading = displayStatus === 'downloading' || displayStatus === 'running' || displayStatus === 'processing';
    const isCompleted = displayStatus === 'done' || displayStatus === 'completed';
    const isError = displayStatus === 'error';
    const showSpeedBar = isDownloading && displayProgress > 0 && displayProgress < 98;

    return (
        <div className="bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 rounded-2xl p-3 flex gap-4 relative overflow-hidden group transition-all duration-300">
            {/* Progress bar */}
            {displayProgress > 0 && isDownloading && (
                <div
                    className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
                    style={{ width: `${displayProgress}%` }}
                />
            )}

            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black/50 shadow-inner">
                <img src={item.thumbnail} className="w-full h-full object-cover" alt={displayTitle} />
                {/* Speed overlay on thumbnail */}
                {showSpeedBar && speed && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center">
                            <Zap size={12} className="text-yellow-400 mx-auto mb-0.5" />
                            <span className="text-white text-[9px] font-bold leading-none">{speed}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <h4 className="text-white font-medium truncate text-sm tracking-tight">{displayTitle}</h4>

                <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isDownloading ? 'text-white' :
                        isCompleted ? 'text-white/50' :
                            isError ? 'text-red-400' : 'text-gray-500'
                        }`}>
                        {getStatusText()}
                        {isError && error && ` - ${error}`}
                    </span>

                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentSong({ ...item, file: item.filename || item.file }); }}
                                className="p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-all"
                                title="Tocar Agora"
                            >
                                <Play size={14} fill="currentColor" />
                            </button>
                        )}

                        {!isCompleted && (
                            <button onClick={() => removeFromQueue(item.uniqueId)} className="text-gray-500 hover:text-red-400 transition-colors" title="Cancelar Download">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Speed + Size row */}
                {showSpeedBar && (downloadedBytes || totalBytes) && (
                    <div className="flex items-center gap-2 text-[10px] text-secondary/70">
                        {downloadedBytes && totalBytes && (
                            <span>{downloadedBytes} / {totalBytes}</span>
                        )}
                        {speed && (
                            <span className="text-yellow-400/80 flex items-center gap-0.5">
                                <Zap size={9} />
                                {speed}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
