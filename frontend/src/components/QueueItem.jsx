import React from 'react';
import { Play, X } from 'lucide-react';

export const QueueItem = ({ item, removeFromQueue, setCurrentSong, job }) => {
    // 💡 Estado Global: job vem das props (App.jsx)
    // Se não tiver job (ainda não existe no backend), usa dados locais do item

    // Decidir o que mostrar: dados do Global WS (prioridade) ou do item local
    const displayStatus = job?.status || item.status;
    const displayProgress = job?.progress !== undefined ? job?.progress : item.progress;
    const displayTitle = job?.title || item.title;
    const error = job?.error;

    const getStatusText = () => {
        if (displayStatus === 'pending') return 'Aguardando Início';
        if (displayStatus === 'queued') return 'Na Fila';

        if (displayStatus === 'timeout') return '⏰ Tempo excedido';

        // Se já concluiu (100% progress e done)
        if (displayStatus === 'done' || displayStatus === 'completed') return 'Concluído ✅';

        // Se está processando metadados final (backend avisa 'processing')
        if (displayStatus === 'processing') return `Finalizando...`;

        // Se o download terminou (progress > 98) mas status ainda não virou 'done'
        if ((displayStatus === 'downloading' || displayStatus === 'running') && displayProgress >= 98) {
            return 'Finalizando...';
        }

        // Estado normal de download
        if (displayStatus === 'running' || displayStatus === 'downloading') return `Baixando ${displayProgress.toFixed(1)}%`;

        if (displayStatus === 'error') return 'Erro';
        return displayStatus;
    };

    const isDownloading = displayStatus === 'downloading' || displayStatus === 'running' || displayStatus === 'processing';
    const isCompleted = displayStatus === 'done' || displayStatus === 'completed';
    const isError = displayStatus === 'error';

    return (
        <div className="bg-surface/50 border border-white/5 rounded-xl p-3 flex gap-3 relative overflow-hidden group">
            {displayProgress > 0 && isDownloading && (
                <div
                    className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300"
                    style={{ width: `${displayProgress}%` }}
                />
            )}

            <img src={item.thumbnail} className="w-16 h-16 rounded-lg object-cover bg-black/50" alt={displayTitle} />

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-white font-medium truncate text-sm">{displayTitle}</h4>
                <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs font-bold ${isDownloading ? 'text-primary' :
                        isCompleted ? 'text-green-400' :
                            isError ? 'text-red-400' : 'text-gray-500'
                        }`}>
                        {getStatusText()}
                        {isError && error && ` - ${error}`}
                    </span>

                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentSong({ ...item, file: item.filename || item.file }); }}
                                className="p-1.5 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-lg transition-colors"
                                title="Tocar Agora"
                            >
                                <Play size={14} fill="currentColor" />
                            </button>
                        )}

                        {(displayStatus === 'pending' || isError) && (
                            <button onClick={() => removeFromQueue(item.uniqueId)} className="text-gray-500 hover:text-red-400 transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
