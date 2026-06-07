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
        <div className="bg-transparent hover:bg-on-surface/5 border border-transparent hover:border-outline-variant/30 rounded-2xl p-3 flex gap-4 relative overflow-hidden group transition-all duration-300">
            {/* Progress bar */}
            {displayProgress > 0 && isDownloading && (
                <div
                    className="absolute bottom-0 left-0 h-[3px] bg-primary transition-all duration-500"
                    style={{ width: `${displayProgress}%` }}
                />
            )}

            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-highest shadow-inner">
                <img src={item.thumbnail} className="w-full h-full object-cover" alt={displayTitle} />
                {/* Speed overlay on thumbnail */}
                {showSpeedBar && speed && (
                    <div className="absolute inset-0 bg-surface-container/80 flex items-center justify-center">
                        <div className="text-center">
                            <Zap size={12} className="text-tertiary mx-auto mb-0.5" />
                            <span className="text-on-surface text-[9px] font-bold leading-none">{speed}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <h4 className="text-on-surface font-medium truncate text-sm tracking-tight">{displayTitle}</h4>

                <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isDownloading ? 'text-on-surface' :
                        isCompleted ? 'text-on-surface-variant/50' :
                            isError ? 'text-error' : 'text-on-surface-variant'
                        }`}>
                        {getStatusText()}
                        {isError && error && ` - ${error}`}
                    </span>

                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentSong({ ...item, file: item.filename || item.file }); }}
                                className="p-2 bg-on-surface/10 hover:bg-on-surface text-on-surface hover:text-surface rounded-full transition-all"
                                title="Tocar Agora"
                            >
                                <Play size={14} fill="currentColor" />
                            </button>
                        )}

                        {!isCompleted && (
                            <button onClick={() => removeFromQueue(item.uniqueId)} className="text-on-surface-variant hover:text-error transition-colors" title="Cancelar Download">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Speed + Size row */}
                {showSpeedBar && (downloadedBytes || totalBytes) && (
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/70">
                        {downloadedBytes && totalBytes && (
                            <span>{downloadedBytes} / {totalBytes}</span>
                        )}
                        {speed && (
                            <span className="text-tertiary/80 flex items-center gap-0.5">
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
