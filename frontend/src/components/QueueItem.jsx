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
        <div className="bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 rounded-2xl p-3 flex gap-4 relative overflow-hidden group transition-all duration-300">
            {displayProgress > 0 && isDownloading && (
                <div
                    className="absolute bottom-0 left-0 h-1 bg-white transition-all duration-300"
                    style={{ width: `${displayProgress}%` }}
                />
            )}

            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black/50 shadow-inner">
                <img src={item.thumbnail} className="w-full h-full object-cover" alt={displayTitle} />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="text-white font-medium truncate text-sm tracking-tight">{displayTitle}</h4>
                <div className="flex items-center justify-between mt-1">
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
            </div>
        </div>
    );
};
