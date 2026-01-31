import React, { useEffect } from 'react';
import { Play, X } from 'lucide-react';
import { useDownloadStatus } from '../hooks/useDownloadStatus';

export const QueueItem = ({ item, getApiUrl, removeFromQueue, setCurrentSong, updateQueueItem }) => {
    // Se o item já tem jobId (foi enfileirado), usa o hook. 
    // Se ainda estiver 'pending' (não enviado ao backend), jobId será undefined e hook não conecta.
    const { status: wsStatus, progress: wsProgress, title: wsTitle, error } = useDownloadStatus(item.jobId, getApiUrl());

    // Sincronizar estado do WS com o pai (App.jsx)
    useEffect(() => {
        if (wsStatus && wsStatus !== item.status) {
            updateQueueItem(item.uniqueId, {
                status: wsStatus,
                progress: wsProgress,
                // Só atualiza título se vier do WS
                ...(wsTitle ? { title: wsTitle } : {}),
                ...(error ? { error } : {})
            });
        } else if (wsProgress !== item.progress && wsStatus === item.status) {
            // Otimização: atualizar apenas progresso se status for o mesmo
            updateQueueItem(item.uniqueId, { progress: wsProgress });
        }
    }, [wsStatus, wsProgress, wsTitle, error, item.uniqueId, updateQueueItem, item.status, item.progress]);

    // Decidir o que mostrar: dados do WS (prioridade) ou do item local
    const displayStatus = wsStatus || item.status;
    const displayProgress = wsProgress !== undefined ? wsProgress : item.progress;
    const displayTitle = wsTitle || item.title;

    const getStatusText = () => {
        if (displayStatus === 'pending') return 'Aguardando Início';
        if (displayStatus === 'queued') return 'Na Fila';
        if (displayStatus === 'running' || displayStatus === 'downloading') return `Baixando ${displayProgress.toFixed(1)}%`;
        if (displayStatus === 'processing') return 'Processando...';
        if (displayStatus === 'done' || displayStatus === 'completed') return 'Concluído';
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
