import { useEffect, useState, useCallback } from 'react';

export const useDownloadStatus = (jobId, apiUrl) => {
    const [status, setStatus] = useState(null);
    const [progress, setProgress] = useState(0);
    const [title, setTitle] = useState('');
    const [error, setError] = useState(null);

    const connect = useCallback(() => {
        if (!jobId || !apiUrl) return;

        // Convert http/https to ws/wss
        const wsUrl = `${apiUrl.replace('http', 'ws')}/ws/download/${jobId}`;
        console.log(`Conectando WS: ${wsUrl}`);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log(`WebSocket conectado: ${jobId}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.status) setStatus(data.status);
                if (data.progress !== undefined) setProgress(data.progress);
                if (data.title) setTitle(data.title);
                if (data.error) setError(data.error);
            } catch (e) {
                console.error("Erro ao processar mensagem WS:", e);
            }
        };

        ws.onclose = () => console.log(`WebSocket fechado: ${jobId}`);
        ws.onerror = (error) => console.error('WebSocket error:', error);

        return () => {
            if (ws.readyState === 1) { // OPEN
                ws.close();
            }
        };
    }, [jobId, apiUrl]);

    useEffect(() => {
        if (jobId) {
            const cleanup = connect();
            return cleanup;
        }
    }, [jobId, connect]);

    return { status, progress, title, error };
};
