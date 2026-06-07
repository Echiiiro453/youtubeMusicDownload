import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
const appWindow = isTauri ? getCurrentWindow() : null;

export function WindowControls() {
    if (!isTauri) return null;

    const onMinimize = () => appWindow?.minimize();
    const onMaximize = async () => {
        if (!appWindow) return;
        const isMaximized = await appWindow.isMaximized();
        if (isMaximized) {
            appWindow.unmaximize();
        } else {
            appWindow.maximize();
        }
    };
    const onClose = () => appWindow?.close();

    return (
        <div className="flex items-center gap-1">
            <button
                onClick={onMinimize}
                className="p-2 hover:bg-on-surface/10 rounded-md transition-colors text-on-surface-variant hover:text-on-surface"
                title="Minimizar"
            >
                <Minus size={14} />
            </button>
            <button
                onClick={onMaximize}
                className="p-2 hover:bg-on-surface/10 rounded-md transition-colors text-on-surface-variant hover:text-on-surface"
                title="Maximizar"
            >
                <Square size={12} />
            </button>
            <button
                onClick={onClose}
                className="p-2 hover:bg-error rounded-md transition-colors text-on-surface-variant hover:text-on-error"
                title="Fechar"
            >
                <X size={14} />
            </button>
        </div>
    );
}
