import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Terminal } from 'lucide-react';
import axios from 'axios';

export function LogViewerModal({ isOpen, onClose, apiUrl }) {
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isOpen) {
      const fetchLogs = async () => {
        try {
          const res = await axios.get(`${apiUrl}/api/logs`);
          if (res.data && res.data.logs) {
            setLogs(res.data.logs);
          }
        } catch (e) {
          console.error("Failed to fetch logs", e);
        }
      };

      fetchLogs(); // initial fetch
      interval = setInterval(fetchLogs, 1500); // Poll every 1.5s
    }

    return () => clearInterval(interval);
  }, [isOpen, apiUrl]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-surface-container border border-outline-variant/30 rounded-xl p-0 w-full max-w-4xl h-[70vh] shadow-2xl relative flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-container-high border-b border-outline-variant/30">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Terminal className="w-4 h-4" />
            <span className="text-xs font-mono tracking-widest uppercase">System Console</span>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs sm:text-sm text-green-400 bg-transparent custom-scrollfoo leading-relaxed whitespace-pre-wrap">
          {logs.length === 0 ? (
            <span className="text-on-surface-variant/50 italic">Aguardando logs...</span>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 opacity-90 hover:opacity-100 hover:bg-on-surface/5 px-1 rounded">
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </motion.div>
    </motion.div>
  );
}
