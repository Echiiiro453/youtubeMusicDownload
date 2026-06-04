import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Music, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function StudioModal({ isOpen, onClose, apiUrl }) {
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLibrary();
    }
  }, [isOpen]);

  const fetchLibrary = async () => {
    setLoadingLib(true);
    try {
      const res = await axios.get(`${apiUrl}/api/library`);
      setLibrary(res.data.library);
    } catch (e) {
      console.error("Failed to load library:", e);
    } finally {
      setLoadingLib(false);
    }
  };

  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSplit = async () => {
    if (!filePath) return;
    setLoading(true);
    setResult(null);
    setProgress(0);
    setStatusMessage("Iniciando IA...");
    try {
      const res = await axios.post(`${apiUrl}/api/studio/split`, { file_path: filePath });
      const currentJobId = res.data.job_id;
      setJobId(currentJobId);

      // Começa a fazer polling
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${apiUrl}/api/studio/status/${currentJobId}`);
          const data = statusRes.data;
          
          setProgress(data.progress || 0);
          setStatusMessage(data.message || "Processando...");

          if (data.status === "success") {
            clearInterval(pollInterval);
            setLoading(false);
            setJobId(null);
            setResult({ message: data.message, output_dir: data.output_dir });
          } else if (data.status === "error") {
            clearInterval(pollInterval);
            setLoading(false);
            setJobId(null);
            alert("Erro na IA: " + data.message);
          }
        } catch (e) {
          console.error("Erro ao checar status:", e);
        }
      }, 1000);

    } catch (err) {
      alert("Erro ao enviar para IA: " + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative"
      >
        
        {/* Cabeçalho */}
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-white">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
            <Mic size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AppMusica Studio</h2>
            <p className="text-sm text-secondary">Inteligência Artificial (Vocais e Instrumental)</p>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-secondary uppercase">Selecione a Música da Biblioteca</label>
            <select 
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              disabled={loadingLib}
              className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="">{loadingLib ? "Carregando músicas..." : "-- Selecione uma música --"}</option>
              {library.map((song, i) => (
                <option key={i} value={song.file_path || song.title}>
                  {song.title || song.file_path}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSplit}
            disabled={loading || !filePath}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Music size={20} />}
            {loading ? statusMessage : "Separar Áudio Agora"}
          </button>

          {loading && (
            <div className="mt-4 p-4 border border-purple-500/30 bg-purple-500/10 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-purple-300 font-bold uppercase">{statusMessage}</span>
                <span className="text-xs text-purple-300 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-black/40 rounded-full h-2">
                <motion.div 
                  className="bg-purple-500 h-2 rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-[10px] text-secondary mt-2 text-center">Isso pode levar alguns minutos dependendo da sua CPU.</p>
            </div>
          )}

          {result && !loading && (
            <div className="mt-4 p-4 border border-green-500/30 bg-green-500/10 rounded-lg">
              <h3 className="text-green-400 font-bold mb-1">Sucesso!</h3>
              <p className="text-sm text-secondary">{result.message}</p>
              <p className="text-xs text-white/50 mt-2 font-mono break-all">{result.output_dir}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
