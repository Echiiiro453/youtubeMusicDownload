import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Music, Loader2, FolderOpen, Minimize2 } from 'lucide-react';
import axios from 'axios';
import { t } from '../i18n';

export default function StudioModal({ isOpen, onClose, apiUrl }) {
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);
  
  const [studioJobs, setStudioJobs] = useState({});
  const [isPollingQueue, setIsPollingQueue] = useState(false);

  const [installJobId, setInstallJobId] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState("");
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isPythonMissing, setIsPythonMissing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLibrary();
      fetchJobs();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (isOpen) {
      interval = setInterval(fetchJobs, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/studio/jobs`);
      setStudioJobs(res.data);
    } catch (err) {
      console.error("Erro ao buscar fila do Studio:", err);
    }
  };

  useEffect(() => {
    let missingDemucs = false;
    let missingPython = false;
    Object.values(studioJobs).forEach(job => {
      if (job.status === 'error' && job.demucs_missing) {
        missingDemucs = true;
        missingPython = job.python_missing;
      }
    });
    if (missingDemucs) {
      setShowInstallButton(true);
      setIsPythonMissing(missingPython);
    }
  }, [studioJobs]);

  const fetchLibrary = async () => {
    setLoadingLib(true);
    try {
      const res = await axios.get(`${apiUrl}/api/library`);
      setLibrary(res.data.songs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLib(false);
    }
  };

  const handleBrowseFile = async () => {
    try {
      const res = await axios.post(`${apiUrl}/api/choose_file`);
      if (res.data.status === 'ok' && res.data.file) {
        setFilePath(res.data.file);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [quality, setQuality] = useState("fast");
  const [aiModel, setAiModel] = useState('htdemucs_ft');
  const [twoStems, setTwoStems] = useState(true);

  const handleAddToQueue = async () => {
    if (!filePath) return;
    setLoading(true);
    setShowInstallButton(false);
    setIsPythonMissing(false);
    
    try {
      await axios.post(`${apiUrl}/api/studio/split`, { 
        file_path: filePath,
        quality: quality,
        model: aiModel,
        two_stems: twoStems
      });
      setFilePath(""); // Limpa o campo após adicionar à fila
      fetchJobs(); // Atualiza a fila imediatamente
    } catch (err) {
      alert("Erro ao enviar para IA: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInstallDemucs = async (forcePython = false) => {
    setIsInstalling(true);
    setInstallMessage("Iniciando instalação...");
    setShowInstallButton(false);
    try {
      const endpoint = forcePython ? `${apiUrl}/api/studio/install_full` : `${apiUrl}/api/studio/install`;
      const res = await axios.post(endpoint);
      const currentJobId = res.data.job_id;
      setInstallJobId(currentJobId);

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${apiUrl}/api/studio/install/status/${currentJobId}`);
          const data = statusRes.data;
          
          setInstallMessage(data.message || "Instalando...");

          if (data.status === "success" || data.status === "error") {
            clearInterval(pollInterval);
            setIsInstalling(false);
            setInstallJobId(null);
            if (data.status === "error") {
               alert("Erro na instalação: " + data.message);
               setShowInstallButton(true);
            } else {
               alert("Sucesso: " + data.message);
            }
          }
        } catch (e) {
          console.error("Erro ao checar status da instalação:", e);
        }
      }, 1000);
    } catch (err) {
      alert("Erro ao iniciar instalação: " + (err.response?.data?.detail || err.message));
      setIsInstalling(false);
      setShowInstallButton(true);
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
        <div className="absolute top-4 right-4 flex gap-2">
          {(loading || isInstalling) && (
            <button onClick={onClose} className="text-secondary hover:text-white" title="Minimizar (O processo continuará em segundo plano)">
              <Minimize2 size={20} />
            </button>
          )}
          <button onClick={onClose} className="text-secondary hover:text-white" title={(loading || isInstalling) ? "Minimizar" : "Fechar"}>
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
            <Mic size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{t('studioTitle')}</h2>
            <p className="text-sm text-secondary">{t('studioSubtitle')}</p>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 w-0">
              <label className="text-xs font-semibold text-secondary uppercase">{t('studioSelectSong')}</label>
              <select 
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                disabled={loadingLib}
                className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none cursor-pointer truncate"
              >
                <option value="">{loadingLib ? t('studioLoadingSongs') : t('studioSelectPlaceholder')}</option>
                {filePath && !library.find(s => (s.file_path || s.title) === filePath) && (
                  <option value={filePath}>{filePath.split('\\').pop().split('/').pop()}</option>
                )}
                {library.map((song, i) => (
                  <option key={i} value={song.file_path || song.title}>
                    {song.title || song.file_path}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleBrowseFile}
              disabled={loadingLib || loading || isInstalling}
              className="h-[50px] px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/50 rounded-lg transition-colors flex items-center justify-center shrink-0"
              title="Procurar arquivo no PC"
            >
              <FolderOpen size={20} />
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase">Qualidade (Redução de Ruído)</label>
            <select 
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={loading || isInstalling}
              className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="fast">Rápida (Padrão)</option>
              <option value="balanced">Equilibrada (Recomendado)</option>
              <option value="studio">Studio (Lenta)</option>
              <option value="ultra">Ultra (Muito Lenta)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase">Modelo de IA</label>
            <select 
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              disabled={loading || isInstalling}
              className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none cursor-pointer"
            >
              <option value="htdemucs_ft">Voz Limpa (htdemucs_ft) - RECOMENDADO</option>
              <option value="htdemucs">Rápido (htdemucs) - BALANCEADO</option>
              <option value="htdemucs_6s">Separação Complexa (htdemucs_6s) - LENTO</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-white/10">
            <input 
              type="checkbox" 
              id="twoStemsCheck"
              checked={twoStems}
              onChange={(e) => setTwoStems(e.target.checked)}
              disabled={loading || isInstalling}
              className="w-4 h-4 rounded border-white/10 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-900 cursor-pointer"
            />
            <label htmlFor="twoStemsCheck" className="text-sm text-gray-300 cursor-pointer select-none">
              <span className="font-bold text-white block">Focar apenas na Voz e Instrumental</span>
              <span className="text-xs text-secondary">Desative se quiser bateria e baixo separados.</span>
            </label>
          </div>

          <button 
            onClick={handleAddToQueue}
            disabled={loading || !filePath || isInstalling}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Music size={20} />}
            Adicionar à Fila de Processamento
          </button>

          {/* Fila de Jobs */}
          {Object.keys(studioJobs).length > 0 && (
             <div className="mt-6 border-t border-white/10 pt-4 space-y-3">
               <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                 Fila do IA Studio
                 <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs">
                   {Object.keys(studioJobs).length}
                 </span>
               </h3>
               
               <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                 {Object.entries(studioJobs).reverse().map(([id, job]) => (
                   <div key={id} className={`p-4 rounded-lg border flex flex-col gap-2 ${
                     job.status === 'success' ? 'bg-green-500/10 border-green-500/30' :
                     job.status === 'error' ? 'bg-red-500/10 border-red-500/30' :
                     job.status === 'queued' ? 'bg-white/5 border-white/10' :
                     'bg-purple-500/10 border-purple-500/30'
                   }`}>
                     <div className="flex justify-between items-center">
                       <span className="text-xs font-bold text-white truncate max-w-[70%]" title={job.file_path}>
                         {job.file_path ? job.file_path.split('\\').pop().split('/').pop() : 'Música'}
                       </span>
                       <span className={`text-[10px] font-bold uppercase ${
                         job.status === 'success' ? 'text-green-400' :
                         job.status === 'error' ? 'text-red-400' :
                         job.status === 'queued' ? 'text-gray-400' :
                         'text-purple-400'
                       }`}>
                         {job.status === 'queued' ? 'Aguardando' : 
                          job.status === 'starting' ? 'Iniciando' : 
                          job.status === 'processing' ? 'Processando' : 
                          job.status === 'success' ? 'Concluído' : 'Erro'}
                       </span>
                     </div>
                     
                     <p className="text-xs text-secondary">{job.message}</p>
                     
                     {(job.status === 'starting' || job.status === 'processing') && (
                       <div className="space-y-2 mt-1">
                         <div className="w-full bg-black/40 rounded-full h-2 relative overflow-hidden border border-white/5">
                           <motion.div 
                             className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 h-full rounded-full" 
                             initial={{ width: 0 }}
                             animate={{ width: `${job.progress || 0}%` }}
                             transition={{ duration: 0.5 }}
                           />
                           <div 
                             className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[pulse_1.5s_infinite]" 
                             style={{ width: `${job.progress || 0}%` }} 
                           />
                         </div>
                         <div className="flex justify-between items-center text-[10px] text-secondary font-mono">
                           <span>Decorrido: {job.elapsed || '--:--'}</span>
                           {job.speed && <span className="opacity-85">Velocidade: {job.speed}</span>}
                           <span className="text-purple-400 font-bold">Restante: {job.eta || '--:--'}</span>
                         </div>
                       </div>
                     )}

                     {job.status === 'success' && job.output_dir && (
                       <p className="text-[10px] text-white/40 mt-1 font-mono break-all">
                         Salvo em: {job.output_dir}
                       </p>
                     )}
                   </div>
                 ))}
               </div>
             </div>
          )}          {showInstallButton && !isPythonMissing && (
            <div className="mt-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg flex flex-col gap-3">
               <h3 className="text-blue-400 font-bold">Motor de IA Ausente</h3>
               <p className="text-sm text-blue-200">Para separar vocais, você precisa baixar o motor de IA no seu computador. O processo baixa arquivos pesados.</p>
               <button 
                  onClick={() => handleInstallDemucs(false)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg"
               >
                  Baixar e Instalar Inteligência Artificial
               </button>
               <p className="text-[10px] text-blue-300 text-center uppercase tracking-wider font-bold mt-1">O Python foi detectado no sistema.</p>
            </div>
          )}

          {showInstallButton && isPythonMissing && (
            <div className="mt-4 p-4 border border-red-500/30 bg-red-500/10 rounded-lg flex flex-col gap-3">
               <h3 className="text-red-400 font-bold">Python e Motor de IA Ausentes</h3>
               <p className="text-sm text-red-200">O seu sistema não possui o ambiente Python, que é obrigatório para usar o Motor de IA.</p>
               
               <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-2">
                 <p className="text-xs text-white/80 font-bold">Opção Recomendada (Segura):</p>
                 <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer" className="w-full py-2 bg-green-600/80 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center">
                    1. Baixar Python (Site Oficial)
                 </a>
                 <p className="text-[10px] text-white/50 text-center leading-tight">Instale o Python no seu PC marcando a opção "Add to PATH". Em seguida, feche o app e tente novamente.</p>
               </div>

               <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-2">
                 <p className="text-xs text-red-300 font-bold">Opção Automatizada (Avançada):</p>
                 <button 
                    onClick={() => handleInstallDemucs(true)}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors flex justify-center items-center shadow-lg"
                 >
                    Forçar Instalação Automática Total
                 </button>
                 <p className="text-[10px] text-red-300/70 text-center leading-tight">O app baixará e instalará o Python de forma invisível. <b>O seu antivírus/Windows Defender pode emitir um aviso falso-positivo e bloquear o app.</b></p>
               </div>
            </div>
          )}

          {isInstalling && (
            <div className="mt-4 p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-blue-300 font-bold uppercase flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> INSTALANDO IA...</span>
              </div>
              <div className="w-full bg-black/60 rounded-lg h-28 p-3 overflow-y-auto font-mono text-[11px] text-green-400 border border-white/5 flex flex-col-reverse break-all">
                 {installMessage}
              </div>
              <p className="text-[10px] text-blue-200 mt-3 text-center">Isso pode demorar de 2 a 10 minutos dependendo da sua internet. Não feche o aplicativo.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
