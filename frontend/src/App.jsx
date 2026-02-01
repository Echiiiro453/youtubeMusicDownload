import React, { useState, useEffect } from 'react';
import { Search, Download, Music, AlertCircle, CheckCircle, ArrowRight, Settings, Upload, FileText, Check, Scissors, Sliders, X, List, Trash2, Plus, PlayCircle, Minimize2, Save, FolderOpen, AlertTriangle, Info, Power, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Heart, Copy, Github } from 'lucide-react';
import { QueueItem } from './components/QueueItem';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import qrcodeImg from './assets/qrcode_custom.jpg';
// import { useGlobalDownloads } from './hooks/useGlobalDownloads'; // REMOVED (Polling)

// Helper para detectar modo automaticamente (Music vs Video)
const detectMode = (url) => {
  if (!url) return 'video';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('music.youtube.com') ||
    lowerUrl.includes('shorts')) {
    return 'audio';
  }
  return 'video';
};

function App() {
  // Step: 'search' | 'confirm' | 'downloading' | 'result'
  const [step, setStep] = useState('search');
  const [url, setUrl] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [quality, setQuality] = useState('320'); // Default: Ultra MP3
  const [mode, setMode] = useState('audio'); // 'audio' | 'video'
  const [playlist, setPlaylist] = useState(false); // Baixar playlist inteira?
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error'
  const [message, setMessage] = useState('');
  const [downloadInfo, setDownloadInfo] = useState(null);

  // Auto-detect mode when URL changes
  useEffect(() => {
    if (url) {
      const detected = detectMode(url);
      if (detected === 'audio') {
        setMode('audio');
      }
    }
  }, [url]);

  // Advanced Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (title, type = 'info', action = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, type, action }]);
    setTimeout(() => removeToast(id), 5000);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const openDownloadsFolder = async () => {
    try {
      await axios.post(getApiUrl('/open_folder'));
    } catch (e) { console.error(e); }
  };

  // Trim State
  const [trim, setTrim] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Audio Features
  const [pitch, setPitch] = useState(0); // -12 to +12

  // Auth & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [organizeByArtist, setOrganizeByArtist] = useState(() => {
    const saved = localStorage.getItem('organizeByArtist');
    return saved === 'true';
  });

  // Playlist Manager
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistVideos, setPlaylistVideos] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState(new Set());
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState('');

  // Integrated Search
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Queue System (Batch Download)
  const [queue, setQueue] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Auto-start Queue Processor
  React.useEffect(() => {
    if (queue.length > 0 && !isProcessingQueue) setIsProcessingQueue(true);
  }, [queue.length, isProcessingQueue]);

  const [searchLimit, setSearchLimit] = useState(30);
  const [playlistLimit, setPlaylistLimit] = useState(50);

  // Presets & Speed
  const [speed, setSpeed] = useState(1.0);
  const [presets, setPresets] = useState({ defaults: [], custom: [] });
  const [selectedPresetVal, setSelectedPresetVal] = useState(''); // nome do preset selecionado

  // Player
  const [currentSong, setCurrentSong] = useState(null);

  // ===== API CONFIG =====
  // Single Port 8000 (Backend handles concurrency via Task Queue)
  const API_URL = "http://localhost:8000";
  const getApiUrl = (endpoint = '') => `${API_URL}${endpoint}`;

  // GLOBAL DOWNLOADS STATE (Polling Strategy)
  const [globalJobs, setGlobalJobs] = useState({});

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(getApiUrl('/download/jobs'));
        setGlobalJobs(res.data);
      } catch (e) {
        // Silent error to avoid spam
      }
    }, 2000); // 2s polling to prevent freeze
    return () => clearInterval(interval);
  }, []);



  React.useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get(getApiUrl('/auth_status'));
      setIsAuthenticated(res.data.authenticated);
    } catch (e) {
      console.error("Auth check failed", e);
    }
  };

  // Carregar Presets ao iniciar
  React.useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await axios.get(getApiUrl('/presets'));
      setPresets(res.data);
    } catch (e) { console.error("Falha ao carregar presets", e); }
  };

  const applyPreset = (presetName) => {
    setSelectedPresetVal(presetName);
    if (!presetName) return;

    // Buscar nos defaults e custom
    const all = [...presets.defaults, ...presets.custom];
    const p = all.find(x => x.name === presetName);

    if (p) {
      setPitch(p.pitch);
      setSpeed(p.speed);
    }
  };

  const handleSavePreset = async () => {
    const name = prompt("Nome para salvar este preset:");
    if (!name) return;

    try {
      await axios.post(getApiUrl('/presets'), {
        name,
        pitch,
        speed,
        eq: 'normal'
      });
      alert('Preset salvo!');
      fetchPresets();
    } catch (e) {
      alert('Erro ao salvar: ' + (e.response?.data?.detail || e.message));
    }
  };

  // ===== PLAYLIST MANAGER FUNCTIONS =====

  const fetchPlaylistDetails = async () => {
    if (!metadata?.is_playlist) return;

    setPlaylistLoading(true);
    console.log('🔍 Buscando detalhes da playlist...', resolvedUrl || url);

    try {
      const res = await axios.post(getApiUrl('/playlist/details'), {
        url: resolvedUrl || url,
        limit: playlistLimit
      }, {
        timeout: 60000 // 60 segundos
      });

      console.log('✅ Playlist carregada:', res.data);
      setPlaylistVideos(res.data.videos);
      setShowPlaylistModal(true);

      // Selecionar apenas os PENDENTES por padrão
      const pendingIndices = new Set(
        res.data.videos
          .filter(v => v.status !== 'downloaded')
          .map(v => v.index)
      );
      setSelectedVideos(pendingIndices);

    } catch (error) {
      console.error('❌ Erro ao buscar playlist:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Erro ao carregar playlist';
      setMessage(errorMsg);
      setStatus('error');
    } finally {
      setPlaylistLoading(false);
    }
  };

  const toggleVideoSelection = (index) => {
    // Safety check
    const video = playlistVideos.find(v => v.index === index);
    if (video && video.status === 'downloaded') return;

    const newSelected = new Set(selectedVideos);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVideos(newSelected);
  };

  const selectAllVideos = () => {
    // Select ONLY pending
    const pendingIndices = new Set(
      playlistVideos
        .filter(v => v.status !== 'downloaded')
        .map(v => v.index)
    );
    setSelectedVideos(pendingIndices);
  };

  const deselectAllVideos = () => {
    setSelectedVideos(new Set());
  };

  const downloadSelectedVideos = () => {

    if (selectedVideos.size === 0) {
      alert('Selecione pelo menos um vídeo');
      return;
    }

    // --- COOKIE ENFORCEMENT ---
    // Se for baixar mais de 20 vídeos e não estiver autenticado
    if (selectedVideos.size > 20 && !isAuthenticated) {
      // Mostrar alerta e bloquear
      const confirmUpload = window.confirm(
        `⚠️ ATENÇÃO: Baixar ${selectedVideos.size} músicas de uma vez sem login pode bloquear seu IP no YouTube.\n\n` +
        `Para continuar, você precisa enviar o arquivo 'cookies.txt'.\n\n` +
        `Clique em OK para abrir as Configurações e enviar o arquivo, ou CANCELAR para reduzir a seleção.`
      );

      if (confirmUpload) {
        setShowSettings(true);
      }
      return;
    }
    // ---------------------------


    // Filtrar vídeos selecionados
    const videosToAdd = playlistVideos.filter(v => selectedVideos.has(v.index));

    console.log(`📥 Adicionando ${videosToAdd.length} vídeos à fila...`);

    // Criar itens da fila
    const queueItems = videosToAdd.map((video, idx) => ({
      id: video.id,
      title: video.title,
      thumbnail: video.thumbnail,
      uploader: video.uploader,
      duration_string: video.duration_string,
      url: video.url,
      uniqueId: Date.now() + Math.random() + idx,
      pitch: mode === 'audio' ? pitch : 0,
      speed: mode === 'audio' ? speed : 1.0,
      speed: mode === 'audio' ? speed : 1.0,
      playlist_id: video.playlistIdRef, // Pass ref from backend
      status: 'pending',
      progress: 0,
      addedAt: Date.now()
    }));

    // Adicionar à fila e abrir Drawer
    setQueue(prev => [...prev, ...queueItems]);
    setShowPlaylistModal(false);
    setShowQueue(true);

    setShowQueue(true);

    addToast(`${queueItems.length} vídeos adicionados à fila!`, 'success');

    // Tentar iniciar automaticamente após render
    setTimeout(() => {
      const startBtn = document.getElementById('start-downloads-btn');
      if (startBtn) startBtn.click();
    }, 500);
  };

  // ===== REDOWNLOAD LOGIC =====
  const executeRetry = async (video, playlistId) => {
    try {
      if (!playlistId) {
        addToast('Playlist ID desconhecido.', 'error');
        return;
      }
      addToast(`Reiniciando download: ${video.title}`, 'info');
      const res = await axios.post(getApiUrl('/download/retry'), {
        playlist_id: playlistId,
        video_id: video.id
      });

      // Optimistic update
      setPlaylistVideos(prev => prev.map(v =>
        v.id === video.id ? { ...v, status: 'pending' } : v
      ));

      // Select it
      toggleVideoSelection(video.index);

    } catch (e) {
      console.error(e);
      addToast('Erro ao rebaixar.', 'error');
    }
  };



  // Reset quality when mode changes
  React.useEffect(() => {
    if (mode === 'audio') {
      setQuality('320');
    } else {
      // Default to highest available if metadata exists
      if (metadata?.resolutions?.length > 0) {
        setQuality(`${metadata.resolutions[0]}p`);
      } else {
        setQuality('720p');
      }
    }
  }, [mode, metadata]);

  // ===== QUEUE LOGIC =====
  const addToQueue = (video) => {
    const newItem = {
      ...video,
      uniqueId: Date.now() + Math.random(),
      pitch: mode === 'audio' ? pitch : 0,
      speed: mode === 'audio' ? speed : 1.0,
      status: 'pending',
      progress: 0,
      addedAt: Date.now()
    };
    setQueue(prev => [...prev, newItem]);
    setQueue(prev => [...prev, newItem]);
    addToast('Adicionado à fila!', 'success');
    setTimeout(() => setStatus(null), 1500);
  };

  const removeFromQueue = (uniqueId) => {
    setQueue(prev => prev.filter(i => i.uniqueId !== uniqueId));
  };

  const updateQueueItem = (uniqueId, updates) => {
    setQueue(prev => prev.map(item =>
      item.uniqueId === uniqueId ? { ...item, ...updates } : item
    ));
  };

  // ===== QUEUE LOGIC (PARALLEL) =====
  const CONCURRENCY_LIMIT = 4;

  const processQueue = () => {
    setIsProcessingQueue(true);
    setShowQueue(true);
  };

  // Independent Downloader Function
  const downloadItem = async (item) => {
    updateQueueItem(item.uniqueId, { status: 'downloading', progress: 0 });

    try {
      const downloadUrl = item.url || `https://www.youtube.com/watch?v=${item.id}`;

      // Enqueue
      const response = await axios.post(getApiUrl('/download'), {
        url: downloadUrl,
        quality: quality,
        mode: mode,
        pitch: item.pitch !== undefined ? item.pitch : pitch,
        speed: item.speed !== undefined ? item.speed : speed,
        organize: organizeByArtist
      });

      const { job_id } = response.data;

      // Poll
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(getApiUrl(`/download/status/${job_id}`));
          const statusData = statusRes.data;

          if (statusData.status === 'downloading') {
            updateQueueItem(item.uniqueId, {
              status: 'downloading',
              progress: statusData.progress || 1
            });
          } else if (statusData.status === 'processing') {
            updateQueueItem(item.uniqueId, { status: 'processing', progress: 99 });
          } else if (statusData.status === 'done') {
            clearInterval(pollInterval);
            updateQueueItem(item.uniqueId, { status: 'completed', progress: 100 });
          } else if (statusData.status === 'error') {
            clearInterval(pollInterval);
            updateQueueItem(item.uniqueId, { status: 'error', error: statusData.error });
          }
        } catch (e) {
          console.error(e);
          clearInterval(pollInterval);
          updateQueueItem(item.uniqueId, { status: 'error', error: 'Poll failed' });
        }
      }, 1000);

    } catch (error) {
      console.error(error);
      updateQueueItem(item.uniqueId, { status: 'error', progress: 0 });
    }
  };

  // Queue Monitor Effect
  React.useEffect(() => {
    if (!isProcessingQueue) return;

    // We use a functional update approach to avoid stale closures if possible, due to async nature
    // But effect relies on 'queue'.

    const downloading = queue.filter(i => i.status === 'downloading');
    const pending = queue.filter(i => i.status === 'pending');

    // Calculate slots
    const slotsFree = CONCURRENCY_LIMIT - downloading.length;

    if (slotsFree > 0 && pending.length > 0) {
      console.log(`🚀 Starting batch of ${slotsFree} downloads...`);
      const toStart = pending.slice(0, slotsFree);

      // Optimistic Update: Mark them ALL as downloading immediately
      const idsToStart = new Set(toStart.map(i => i.uniqueId));

      setQueue(prev => prev.map(item =>
        idsToStart.has(item.uniqueId)
          ? { ...item, status: 'queued', progress: 0 }
          : item
      ));

      // Trigger requests
      toStart.forEach(item => performDownload(item));
    }
  }, [queue, isProcessingQueue]);


  const performDownload = async (item) => {
    try {
      const downloadUrl = item.url || `https://www.youtube.com/watch?v=${item.id}`;

      // 1. Enqueue Task
      const startRes = await axios.post(getApiUrl('/download/enqueue'), {
        url: downloadUrl,
        quality: quality,
        mode: mode,
        pitch: item.pitch !== undefined ? item.pitch : pitch,
        speed: item.speed !== undefined ? item.speed : speed,
        organize: organizeByArtist,
        title: item.title,
        artist: item.uploader,
        cover_path: item.thumbnail,
        playlist_id: item.playlist_id, // For DB persistence
        video_id: item.id              // For DB persistence
      });

      const { job_id } = startRes.data;
      console.log(`🚀 Queued Job ID: ${job_id}`);

      // 2. Assign Job ID (WebSocket will take over)
      updateQueueItem(item.uniqueId, {
        jobId: job_id,
        status: 'queued',
        progress: 0
      });

    } catch (e) {
      console.error("Enqueue Error:", e);
      updateQueueItem(item.uniqueId, { status: 'error', error: 'Falha ao enfileirar' });
    }
  };



  // ===== SEARCH FUNCTIONS =====
  const handleSearch = async (queryInput) => {
    if (!queryInput) return;

    setIsSearching(true);
    setSearchResults([]); // Limpar anteriores
    console.log('🔍 Pesquisando:', queryInput);

    try {
      const res = await axios.post(getApiUrl('/search'), {
        query: queryInput,
        limit: searchLimit
      });

      console.log('✅ Resultados:', res.data.results);
      setSearchResults(res.data.results);

      if (res.data.results.length === 0) {
        setMessage('Nenhum vídeo encontrado.');
        setStatus('error');
      }
    } catch (error) {
      console.error('❌ Erro na busca:', error);
      addToast(error.response?.data?.detail || 'Erro ao buscar vídeos.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVideo = (videoUrl) => {
    console.log("👉 Video Selected from UI:", videoUrl);
    if (!videoUrl) {
      console.error("❌ Selected blank video URL!");
      return;
    }
    setUrl(videoUrl);
    setSearchResults([]);
    loadVideoDetails(videoUrl);
  };

  const loadVideoDetails = async (videoUrl) => {
    setLoading(true);
    setMetadata(null); // Force clear previous data
    setMessage('');
    console.log("📥 Loading Info for:", videoUrl);
    try {
      const response = await axios.post(getApiUrl('/info'), { url: videoUrl });
      setMetadata(response.data);
      setStep('confirm');
    } catch (error) {
      console.error(error);
      setStatus('error');
      const errorMsg = error.response?.data?.detail || 'Erro ao carregar vídeo.';
      setMessage(errorMsg);
      setTimeout(() => setStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const fetchInfo = async (e) => {
    e?.preventDefault();
    if (!url) return;

    // Detectar Busca vs URL (Suporte Universal: Twitch, Kick, etc.)
    const isUrl = /^(http|https):\/\/[^ "]+$/i.test(url);

    if (!isUrl) {
      handleSearch(url);
      return;
    }

    // Se for URL, fluxo normal
    loadVideoDetails(url);
  };

  const handleDownload = async () => {
    setStep('downloading');
    setStatus(null);
    setMessage('');

    try {
      // 1. Enqueue Task (agora /download também retorna job_id imediatamente)
      const response = await axios.post(getApiUrl('/download'), {
        url: metadata.url,
        quality,
        mode,
        playlist: false,
        start_time: trim ? startTime : null,
        end_time: trim ? endTime : null,
        pitch: mode === 'audio' ? pitch : 0,
        speed: mode === 'audio' ? speed : 1.0
      });

      const { job_id } = response.data;
      console.log(`🚀 Queued Job ID via Legacy Endpoint: ${job_id}`);

      // 2. Poll Status (Manual Polling para UI Principal)
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(getApiUrl(`/download/status/${job_id}`));
          const statusData = statusRes.data;

          // Updating Progress for UI
          if (statusData.progress) {
            setProgress({
              percent: statusData.progress,
              status: statusData.status
            });
          }

          if (statusData.status === 'done') {
            clearInterval(pollInterval);
            // Construct fake info object from job result for the result screen
            setDownloadInfo({
              status: 'success',
              title: statusData.title || statusData.filename,
              quality: quality,
              file: statusData.filename
            });
            addToast('Download concluído!', 'success', { label: 'Abrir Pasta', onClick: openDownloadsFolder });
            setStep('result');

          } else if (statusData.status === 'error') {
            clearInterval(pollInterval);
            console.error(statusData.error);
            addToast('Falha no download.', 'error');
            setMessage(statusData.error || 'Erro desconhecido');
            setStatus('error');
            setStep('confirm'); // Volta para tentar de novo
          }
        } catch (err) {
          console.error("Poll Error:", err);
          if (err.response && err.response.status === 404) {
            clearInterval(pollInterval);
            addToast('Erro: Job perdido.', 'error');
            setStep('confirm');
          }
        }
      }, 1000);

    } catch (error) {
      console.error(error);
      addToast('Falha ao iniciar download.', 'error');
      setStep('confirm');
    }
  };

  // Polling de Progresso
  React.useEffect(() => {
    let interval;
    if (step === 'downloading') {
      const poll = async () => {
        try {
          const res = await axios.get('http://localhost:8000/progress');
          setProgress(res.data);
        } catch (e) {
          console.error(e);
        }
      };

      interval = setInterval(poll, 500); // Checa a cada meio segundo
    }
    return () => clearInterval(interval);
  }, [step]);

  const [progress, setProgress] = useState({ percent: 0, status: 'idle' });

  // ... (reset function needs to clear progress too)
  const reset = () => {
    setStep('search');
    setUrl('');
    setMetadata(null);
    setStatus(null);
    setMessage('');
    setProgress({ percent: 0, status: 'idle' }); // Reset
    setMode('audio');
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-primary selection:text-white relative">
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setShowDonate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-lg backdrop-blur-md transition-all bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30"
        >
          <Heart className="w-4 h-4" />
          Apoiar
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-lg backdrop-blur-md transition-all ${isAuthenticated ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-surface/50 text-secondary border border-white/10 hover:bg-surface'}`}
        >
          {isAuthenticated ? <CheckCircle className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          {isAuthenticated ? 'Conectado' : 'Configurar'}
        </button>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        isAuthenticated={isAuthenticated}
        organizeByArtist={organizeByArtist}
        setOrganizeByArtist={setOrganizeByArtist}
        onUploadSuccess={() => {
          checkAuth();
          alert("Cookies atualizados com sucesso!");
          setShowSettings(false);
        }}
      />

      {/* Donation Modal */}
      <AnimatePresence>
        {showDonate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDonate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowDonate(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-pink-400" />
                </div>

                <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Apoie o Projeto
                </h3>

                <p className="text-gray-400 text-sm">
                  Se este app te ajudou, considere fazer uma doação via PIX para manter o desenvolvimento ativo! 🚀
                </p>

                <div className="bg-white p-4 rounded-xl inline-block mx-auto">
                  <img src={qrcodeImg} alt="QR Code Pix" className="w-48 h-48 object-contain" />
                </div>

                <div className="bg-white/5 p-3 rounded-xl flex items-center justify-center gap-2 border border-white/10 relative group">
                  {/* Hidden Text for reference but removed from UI */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("00020126580014br.gov.bcb.pix0136bd1b2d5e-e160-4f50-b3a8-1f75fe2c721c5204000053039865802BR5925ANDREY WARLLEY DUARTE DA 6015SANTA ISABEL DO62070503***6304D541");
                      addToast("Código PIX copiado!", "success");
                    }}
                    className="w-full py-3 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium border border-pink-500/30"
                    title="Copiar Código"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Copiar Código PIX (Copia e Cola)</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-white/10 mt-4">
                  <a
                    href="https://github.com/Echiiiro453"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Github className="w-5 h-5" />
                    <span>github.com/Echiiiro453</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
      </div>

      <div className="z-10 w-full max-w-xl space-y-8">

        {/* Header */}
        <motion.div
          layout
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-surface border border-white/10 mb-4 shadow-xl">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-secondary bg-clip-text text-transparent">
            Music Downloader
          </h1>
          <p className="text-secondary text-lg">
            {step === 'search' ? 'Cole seu link para começar.' : 'Configure seu download.'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* STEP 1: BUSCA */}
          {step === 'search' && (
            <motion.form
              key="search-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={fetchInfo}
              className="relative group space-y-4"
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-secondary group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Cole um link do YouTube ou digite para pesquisar..."
                  className="w-full h-14 pl-12 pr-4 bg-surface/50 backdrop-blur-md border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-lg placeholder:text-secondary/50 shadow-lg"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoFocus
                />

                {/* Progresso visual imediato */}
                {(loading || isSearching) && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 overflow-hidden rounded-b-2xl">
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-1/2 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSearch(url)}
                  disabled={loading || !url}
                  className={`flex-1 h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${!/^(http|https):\/\/[^ "]+$/i.test(url)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
                    : 'bg-surface hover:bg-white/10 text-secondary border border-white/5'
                    }`}
                >
                  <Search size={18} />
                  <span>Pesquisar</span>
                </button>

                <button
                  type="button"
                  onClick={() => loadVideoDetails(url)}
                  disabled={loading || !url}
                  className={`flex-1 h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${/^(http|https):\/\/[^ "]+$/i.test(url)
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700'
                    : 'bg-surface hover:bg-white/10 text-secondary border border-white/5'
                    }`}
                >
                  <ArrowRight size={18} />
                  <span>Abrir Link</span>
                </button>
              </div>
            </motion.form>
          )}

          {/* SEARCH RESULTS */}
          {step === 'search' && (isSearching || searchResults.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-4"
            >
              {isSearching && (
                <div className="grid grid-cols-1 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-secondary px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Qtd:</span>
                      <select
                        value={searchLimit}
                        onChange={(e) => setSearchLimit(Number(e.target.value))}
                        className="bg-black/20 border border-white/10 rounded px-2 py-0.5 text-xs text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer hover:bg-white/5"
                      >
                        <option value={10} className="bg-slate-800 text-white">10</option>
                        <option value={30} className="bg-slate-800 text-white">30</option>
                        <option value={50} className="bg-slate-800 text-white">50</option>
                        <option value={100} className="bg-slate-800 text-white">Max (100)</option>
                      </select>
                    </div>
                    <button
                      onClick={() => setSearchResults([])}
                      className="text-xs hover:text-white transition-colors"
                    >
                      Limpar
                    </button>
                  </div>

                  <div className="grid gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollfoo">
                    {searchResults.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => handleSelectVideo(video.url)}
                        className="bg-surface/30 hover:bg-surface/80 border border-white/5 hover:border-white/20 p-3 rounded-xl flex gap-4 cursor-pointer transition-all group"
                      >
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/50">
                          <img
                            src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium font-mono">
                            {video.duration_string || '0:00'}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h3 className="text-white font-medium line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors text-[15px]">
                            {video.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-secondary">
                            <span className="font-medium truncate">{video.uploader}</span>
                            {video.view_count && (
                              <span className="opacity-60">• {(video.view_count / 1000).toFixed(0)}k views</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); addToQueue(video); }}
                            className="w-10 h-10 rounded-full bg-surface border border-white/20 hover:bg-primary hover:border-primary text-white flex items-center justify-center transition-all shadow-lg"
                            title="Adicionar à fila"
                          >
                            <Plus size={18} />
                          </button>
                          <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                            <ArrowRight size={18} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}



          {/* STEP 2: CONFIRMAÇÃO / RESULTADO */}
          {(step === 'confirm' || step === 'downloading' || step === 'result') && metadata && (
            <motion.div
              key="confirm-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              {/* Media Info */}
              <div className="flex gap-4 items-center">
                {metadata.thumbnail ? (
                  <img src={metadata.thumbnail} alt="Cover" className="w-20 h-20 rounded-xl object-cover shadow-lg" />
                ) : (
                  <div className="w-20 h-20 bg-black/40 rounded-xl flex items-center justify-center">
                    <Music className="w-8 h-8 text-secondary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg leading-tight line-clamp-2 text-white">{metadata.title}</h3>
                  <p className="text-secondary text-sm mt-1">Pronto para baixar</p>
                </div>
              </div>

              {step === 'confirm' && (
                <div className="space-y-4">
                  {/* Playlist Manager Button */}
                  {metadata.is_playlist && (
                    <div className="mb-4 space-y-2">
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white">Playlist Detectada</h4>
                          <p className="text-xs text-secondary">Use o botão abaixo para selecionar músicas.</p>
                        </div>
                      </div>

                      <button
                        onClick={fetchPlaylistDetails}
                        disabled={playlistLoading}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        {playlistLoading ? (
                          <>⏳ Carregando playlist...</>
                        ) : (
                          <>
                            <FileText size={20} />
                            Ver e Selecionar Músicas
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Trim Toggle */}
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 mb-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-blue-400" />
                        <span className="font-bold text-white">Recortar Trecho</span>
                      </div>
                      <button
                        onClick={() => {
                          const newTrim = !trim;
                          setTrim(newTrim);
                          if (newTrim) {
                            if (!startTime) setStartTime("00:00");
                            if (!endTime && metadata.duration_string) setEndTime(metadata.duration_string);
                          }
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative ${trim ? 'bg-blue-500' : 'bg-surface border border-white/10'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${trim ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    <AnimatePresence>
                      {trim && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-4 pt-2">
                            <div className="flex-1">
                              <label className="text-xs text-secondary mb-1 block">Início (MM:SS ou S)</label>
                              <input
                                type="text"
                                placeholder="00:00"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-center font-mono focus:border-blue-500 outline-none"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-secondary mb-1 block">Fim (MM:SS ou S)</label>
                              <input
                                type="text"
                                placeholder="00:00"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-center font-mono focus:border-blue-500 outline-none"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex bg-surface/50 p-1 rounded-xl">
                    <button
                      onClick={() => setMode('audio')}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'audio' ? 'bg-primary text-white shadow-lg' : 'text-secondary hover:text-white'
                        }`}
                    >
                      🎵 Áudio
                    </button>
                    <button
                      onClick={() => setMode('video')}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'video' ? 'bg-primary text-white shadow-lg' : 'text-secondary hover:text-white'
                        }`}
                    >
                      🎬 Vídeo
                    </button>
                  </div>

                  {/* Audio Features (Pitch & Speed) - Only for Audio */}
                  {mode === 'audio' && (
                    <div className="bg-surface/30 border border-white/5 rounded-xl p-4 space-y-4">

                      {/* Presets Dropdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-secondary uppercase tracking-wider">Presets</label>
                          <button onClick={handleSavePreset} className="text-xs text-primary hover:text-blue-300 flex items-center gap-1 transition-colors">
                            <Save size={12} /> Salvar Atual
                          </button>
                        </div>
                        <select
                          value={selectedPresetVal}
                          onChange={(e) => applyPreset(e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary cursor-pointer"
                        >
                          <option value="" className="bg-slate-900 text-gray-400">Selecione um efeito...</option>
                          <optgroup label="Padrões" className="bg-slate-900 text-white">
                            {presets.defaults.map(p => (
                              <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                          </optgroup>
                          {presets.custom.length > 0 && (
                            <optgroup label="Meus Presets" className="bg-slate-900 text-white">
                              {presets.custom.map(p => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Pitch Control */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-white">Tom (Pitch)</span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${pitch === 0 ? 'text-secondary' : 'text-purple-400'}`}>
                            {pitch > 0 ? `+${pitch}` : pitch} semi
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          value={pitch}
                          onChange={(e) => { setPitch(parseInt(e.target.value)); setSelectedPresetVal(''); }}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between text-[10px] text-secondary/50 font-mono px-1">
                          <span>-12</span>
                          <span>0</span>
                          <span>+12</span>
                        </div>
                      </div>

                      {/* Speed Control */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">Velocidade</span>
                          </div>
                          <span className={`text-xs font-mono font-bold ${speed === 1.0 ? 'text-secondary' : 'text-blue-400'}`}>
                            {speed}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={speed}
                          onChange={(e) => { setSpeed(parseFloat(e.target.value)); setSelectedPresetVal(''); }}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-secondary/50 font-mono px-1">
                          <span>0.5x</span>
                          <span>1.0x</span>
                          <span>2.0x</span>
                        </div>
                      </div>

                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 block">
                      Qualidade ({mode === 'audio' ? 'Áudio' : 'Vídeo'})
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {mode === 'audio' ? (
                        <>
                          <QualityOption
                            id="320"
                            label="🔥 Ultra MP3"
                            sub="320kbps • Estúdio"
                            selected={quality}
                            set={setQuality}
                          />
                          <QualityOption
                            id="high"
                            label="🎵 Alta Qualidade"
                            sub="192kbps • Padrão Spotify"
                            selected={quality}
                            set={setQuality}
                          />
                          <QualityOption
                            id="medium"
                            label="📉 Economia de Dados"
                            sub="128kbps • Leve"
                            selected={quality}
                            set={setQuality}
                          />
                          <QualityOption
                            id="flac"
                            label="🎧 Lossless FLAC"
                            sub="Sem compressão"
                            selected={quality}
                            set={setQuality}
                          />
                          <QualityOption
                            id="best"
                            label="💎 Original"
                            sub="M4A/Opus sem conversão"
                            selected={quality}
                            set={setQuality}
                          />
                        </>
                      ) : (
                        <>
                          {metadata.resolutions && metadata.resolutions.length > 0 ? (
                            metadata.resolutions.map((res) => {
                              let label = `🎥 ${res}p`;
                              let sub = "Qualidade Padrão";
                              if (res >= 2160) { label = "💎 4K Ultra HD"; sub = "Definição Máxima (WebM/MKV)"; }
                              else if (res >= 1440) { label = "✨ 2K Quad HD"; sub = "Alta Definição Superior"; }
                              else if (res >= 1080) { label = "🎬 Full HD 1080p"; sub = "Padrão MP4"; }
                              else if (res >= 720) { label = "📱 HD 720p"; sub = "Leve e Rápido (MP4)"; }
                              else if (res >= 480) { label = "📺 480p"; sub = "Qualidade DVD"; }
                              else { label = `📺 ${res}p`; sub = "Economia de Dados"; }

                              return (
                                <QualityOption
                                  key={res}
                                  id={`${res}p`}
                                  label={label}
                                  sub={sub}
                                  selected={quality}
                                  set={setQuality}
                                />
                              );
                            })
                          ) : (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                              <p className="text-red-300 text-sm font-medium">Nenhuma qualidade de vídeo encontrada.</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={reset}
                      className="px-4 py-3 rounded-xl hover:bg-white/5 text-secondary font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 bg-primary hover:bg-blue-600 rounded-xl font-boldshadow-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Baixar Agora
                    </button>
                  </div>
                </div>
              )}

              {step === 'downloading' && (
                <div className="py-6 text-center space-y-4">
                  <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percent}%` }}
                      transition={{ ease: "linear" }}
                      className="absolute h-full bg-primary"
                    />
                  </div>

                  <div className="flex justify-between text-sm text-secondary px-1">
                    <span>
                      {progress.percent < 99
                        ? 'Baixando...'
                        : 'Processando (Mixagem/Capa)...'}
                    </span>
                    <span className="font-mono">{Math.round(progress.percent)}%</span>
                  </div>

                  <p className="text-xs text-secondary/50">
                    {progress.percent === 100 ? 'Quase lá, finalizando o arquivo...' : 'Aguarde um momento'}
                  </p>
                </div>
              )}

              {step === 'result' && (
                <div className="py-4 text-center space-y-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400">Sucesso!</h3>
                    <p className="text-green-200/80 text-sm px-4 break-all">{downloadInfo?.file}</p>
                    <p className="text-xs text-green-200/50 mt-1">Salvo na pasta downloads</p>
                  </div>
                  <div className="flex gap-2 justify-center mt-4">
                    <button
                      onClick={() => setCurrentSong({ ...downloadInfo, thumbnail: metadata?.thumbnail })}
                      className="px-6 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                    >
                      <Play size={16} fill="currentColor" /> Tocar
                    </button>
                    <button
                      onClick={reset}
                      className="px-6 py-2 bg-surface hover:bg-white/10 rounded-xl text-sm font-medium transition-colors"
                    >
                      Baixar Outra
                    </button>
                    <button
                      onClick={() => axios.post('http://localhost:8000/open_folder')}
                      className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      📂 Abrir Pasta
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>

        {/* Global Error Toast */}
        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-900/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl border border-red-500/30 flex items-center gap-3 z-50"
            >
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="font-medium">{message}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>


      {/* Floating Queue Button */}
      {queue.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowQueue(true)}
          className="fixed bottom-6 right-6 z-[90] bg-primary text-white p-4 rounded-full shadow-2xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 group"
        >
          <div className="relative">
            <List size={24} />
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
              {queue.filter(i => i.status !== 'completed').length}
            </div>
          </div>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-medium whitespace-nowrap">
            Ver Fila
          </span>
        </motion.button>
      )}

      {/* Queue Drawer */}
      <AnimatePresence>
        {showQueue && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQueue(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-white/10 z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 bg-gradient-to-l from-blue-900/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <List className="text-primary" />
                    Fila de Downloads
                  </h3>
                  <button onClick={() => setShowQueue(false)} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="text-gray-400" />
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm text-secondary">
                  <span>{queue.length} itens</span>
                  <button
                    onClick={() => setQueue([])}
                    disabled={isProcessingQueue}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Limpar tudo
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {queue.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-secondary opacity-50">
                    <List size={48} className="mb-4" />
                    <p>Sua fila está vazia</p>
                  </div>
                ) : (
                  queue.map((item) => (
                    <QueueItem
                      key={item.uniqueId}
                      item={item}
                      getApiUrl={getApiUrl}
                      removeFromQueue={removeFromQueue}
                      setCurrentSong={setCurrentSong}
                      updateQueueItem={updateQueueItem}
                      job={globalJobs[item.jobId]} // Pass Global Job State
                    />
                  ))
                )}
              </div>

              <div className="p-6 border-t border-white/10 bg-slate-900">
                <button
                  id="start-downloads-btn"
                  onClick={processQueue}
                  disabled={isProcessingQueue || queue.filter(i => i.status === 'pending').length === 0}
                  className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isProcessingQueue ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processando...</>
                  ) : (
                    <><PlayCircle size={20} /> Iniciar Downloads</>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Playlist Manager Modal */}
      <AnimatePresence>
        {showPlaylistModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            onClick={() => setShowPlaylistModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-purple-500/20"
            >
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">📋 Selecionar Músicas</h3>
                    <p className="text-gray-300 text-sm">{metadata?.title}</p>
                    <div className="flex items-center gap-2 mt-2 bg-black/20 p-1.5 rounded-lg w-fit">
                      <span className="text-gray-400 text-xs font-medium">Carregar:</span>
                      <select
                        value={playlistLimit}
                        onChange={(e) => setPlaylistLimit(Number(e.target.value))}
                        className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value={50} className="bg-slate-900 text-white">50 itens</option>
                        <option value={100} className="bg-slate-900 text-white">100 itens</option>
                        <option value={200} className="bg-slate-900 text-white">200 itens</option>
                        <option value={500} className="bg-slate-900 text-white">500 itens</option>
                        <option value={0} className="bg-slate-900 text-white">Todos (Pode demorar)</option>
                      </select>
                      <button
                        onClick={fetchPlaylistDetails}
                        className="text-xs bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 px-2 py-1 rounded transition-colors flex items-center gap-1 ml-1 border border-purple-500/30"
                        title="Recarregar playlist com novo limite"
                      >
                        🔄 Atualizar
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPlaylistModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="text-gray-300" size={24} />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <span className="text-lg font-semibold text-purple-300">
                    {selectedVideos.size} de {playlistVideos.length} selecionadas
                  </span>
                  <button
                    onClick={() => {
                      const pendingIndices = new Set(
                        playlistVideos
                          .filter(v => v.status !== 'downloaded')
                          .map(v => v.index)
                      );
                      setSelectedVideos(pendingIndices);
                    }}
                    className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Selecionar Novos
                  </button>
                  <button
                    onClick={deselectAllVideos}
                    className="px-4 py-2 bg-gray-600/30 hover:bg-gray-600/50 text-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Limpar Seleção
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
                {playlistLoading ? (
                  // Show skeleton loaders while loading
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonPlaylistItem key={i} />
                  ))
                ) : (
                  playlistVideos.map((video) => (
                    <div
                      key={video.index}
                      onClick={() => {
                        if (video.status === 'downloaded') return;
                        toggleVideoSelection(video.index);
                      }}
                      className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${video.status === 'downloaded' ? 'opacity-50 cursor-default' : ''
                        } ${selectedVideos.has(video.index)
                          ? 'bg-purple-600/30 border-2 border-purple-500'
                          : video.status === 'downloaded'
                            ? 'bg-white/5 border-2 border-transparent'
                            : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedVideos.has(video.index)
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-400'
                        }`}>
                        {selectedVideos.has(video.index) && <Check size={14} className="text-white" />}
                      </div>
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium truncate">{video.title}</h4>
                          {video.status === 'downloaded' && (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded border border-green-500/30">
                                Já Baixado
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // We need playlist ID here. 
                                  // Since we didn't store it in state yet, let's look at how we can get it.
                                  // We can attach it to the video object in fetchPlaylistDetails
                                  executeRetry(video, video.playlistIdRef);
                                }}
                                className="text-xs text-purple-400 hover:text-purple-300 underline"
                              >
                                Rebaixar
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm flex items-center gap-2">
                          <span>{video.uploader}</span>
                          {video.duration_string && video.duration_string !== '0:00' && (
                            <>
                              <span>•</span>
                              <span>{video.duration_string}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-500 text-sm font-mono flex-shrink-0">
                        #{video.index + 1}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 border-t border-white/10 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
                <button
                  onClick={downloadSelectedVideos}
                  disabled={selectedVideos.size === 0}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Download size={20} />
                    <span>Baixar {selectedVideos.size} Música{selectedVideos.size !== 1 ? 's' : ''}</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-4 text-xs text-secondary/30">
        Premium Local App &copy; 2026
      </div>

      {/* Player Bar */}
      <AnimatePresence>
        {currentSong && (
          <PlayerBar
            currentSong={currentSong}
            onClose={() => setCurrentSong(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== SKELETON COMPONENTS ====================

function SkeletonCard() {
  return (
    <div className="bg-surface/30 backdrop-blur-md border border-white/10 rounded-xl p-4 overflow-hidden relative">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />

      <div className="relative space-y-3">
        {/* Thumbnail skeleton */}
        <div className="w-full aspect-video bg-white/10 rounded-lg animate-pulse" />

        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-white/10 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse" />
        </div>

        {/* Button skeleton */}
        <div className="h-9 bg-white/10 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonPlaylistItem() {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface/20 rounded-lg border border-white/5">
      <div className="w-4 h-4 bg-white/10 rounded animate-pulse" />
      <div className="w-16 h-16 bg-white/10 rounded animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-2/3 animate-pulse" />
        <div className="h-3 bg-white/10 rounded w-1/3 animate-pulse" />
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose, isAuthenticated, organizeByArtist, setOrganizeByArtist, onUploadSuccess }) {
  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name !== 'cookies.txt') {
      alert("O arquivo deve se chamar exatamente 'cookies.txt'");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post('http://localhost:8000/upload_cookies', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploadSuccess();
    } catch (error) {
      alert("Erro ao enviar arquivo. Verifique o console.");
      console.error(error);
    }
  };

  const handleShutdown = async () => {
    if (!confirm("⚠️ Tem certeza que deseja encerrar o servidor?\nIsso fechará o aplicativo e interromperá todos os downloads.")) return;

    try {
      // Tentar fechar a janela primeiro (se possível)
      try { window.close(); } catch (e) { }

      await axios.post('http://localhost:8000/shutdown');

      // Feedback visual se a janela não fechar
      document.body.innerHTML = `
        <div style="height: 100vh; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ef4444; font-family: sans-serif;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
          <h1 style="margin-top: 20px; font-size: 24px;">Servidor Encerrado</h1>
          <p style="opacity: 0.5; margin-top: 10px;">Pode fechar esta guia.</p>
        </div>
      `;
    } catch (e) {
      alert("Erro ao comunicar com o servidor: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-white">X</button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-surface rounded-xl">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white">Configuração</h2>
        </div>

        <div className="space-y-4">
          {/* Status Card */}
          <div className={`p-4 rounded-xl border ${isAuthenticated ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-3">
              {isAuthenticated ? <CheckCircle className="text-green-400" /> : <AlertCircle className="text-red-400" />}
              <div>
                <h3 className={`font-bold ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                  {isAuthenticated ? 'Sistema Autenticado' : 'Não Autenticado'}
                </h3>
                <p className="text-sm text-secondary/80">
                  {isAuthenticated ? 'Você pode baixar vídeos em alta qualidade.' : 'Downloads podem falhar (Erro 403).'}
                </p>
              </div>
            </div>
          </div>

          {/* Tutorial Clean */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-white">Como autenticar:</p>
            <ol className="space-y-2 text-sm text-secondary list-decimal pl-4">
              <li>Instale a extensão <b>Get cookies.txt LOCALLY</b>.</li>
              <li>Vá no YouTube e exporte os cookies.</li>
              <li>Renomeie o arquivo para <b>cookies.txt</b>.</li>
              <li>Envie o arquivo abaixo:</li>
            </ol>
          </div>

          {/* Upload Area */}
          <div className="relative group">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-white/10 group-hover:border-primary/50 group-hover:bg-primary/5 rounded-xl p-6 flex flex-col items-center justify-center transition-all text-center gap-2">
              <Upload className="w-8 h-8 text-secondary group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium text-white">Clique para enviar cookies.txt</p>
              <p className="text-xs text-secondary">Apenas arquivos .txt</p>
            </div>
          </div>

          {/* Organization Toggle */}
          <div className="pt-4 border-t border-white/10 mt-4">
            <div className="flex items-center justify-between p-4 bg-surface/30 rounded-xl border border-white/5">
              <div>
                <h4 className="font-bold text-white">Organizar por Artista</h4>
                <p className="text-xs text-secondary mt-0.5">Criar pastas automáticas com nome do artista</p>
              </div>
              <button
                onClick={() => {
                  const newValue = !organizeByArtist;
                  setOrganizeByArtist(newValue);
                  localStorage.setItem('organizeByArtist', newValue.toString());
                }}
                className={`relative w-14 h-7 rounded-full transition-colors ${organizeByArtist ? 'bg-primary' : 'bg-gray-600'}`}
              >
                <motion.div
                  animate={{ x: organizeByArtist ? 28 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg"
                />
              </button>
            </div>
          </div>

          {/* Shutdown Area */}
          <div className="pt-4 border-t border-white/10 mt-4">
            <button
              onClick={handleShutdown}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-300 rounded-xl transition-all flex items-center justify-center gap-2 group"
            >
              <Power className="w-5 h-5 group-hover:text-red-200 transition-colors" />
              <span className="font-bold text-sm">Encerrar Aplicativo</span>
            </button>
          </div>

        </div>

      </motion.div>
    </div>
  )
}

function QualityOption({ id, label, sub, selected, set }) {
  const isSelected = selected === id;
  return (
    <button
      onClick={() => set(id)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between group ${isSelected
        ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(59,130,246,0.2)]'
        : 'bg-surface/50 border-white/5 hover:border-white/10 hover:bg-surface'
        }`}
    >
      <div>
        <p className={`font-semibold ${isSelected ? 'text-primary' : 'text-white'}`}>{label}</p>
        <p className="text-xs text-secondary">{sub}</p>
      </div>
      {isSelected && (
        <motion.div layoutId="check">
          <CheckCircle className="w-5 h-5 text-primary" />
        </motion.div>
      )}
    </button>
  )
}

// Toast Component
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="pointer-events-auto w-[320px] bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl flex items-start gap-3"
          >
            <div className={`mt-1 ${toast.type === 'success' ? 'text-green-400' : toast.type === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
              {toast.type === 'success' ? <CheckCircle size={18} /> :
                toast.type === 'error' ? <AlertTriangle size={18} /> :
                  <Info size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-sm ${toast.type === 'success' ? 'text-green-400' : toast.type === 'error' ? 'text-red-400' : 'text-white'}`}>
                {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Erro' : 'Info'}
              </h4>
              <p className="text-sm text-gray-300 break-words leading-tight mt-1">{toast.title}</p>
              {toast.action && (
                <button onClick={toast.action.onClick} className="text-xs text-primary font-bold hover:underline mt-2 flex items-center gap-1">
                  <FolderOpen size={12} /> {toast.action.label}
                </button>
              )}
            </div>
            <button onClick={() => removeToast(toast.id)}><X size={14} className="text-gray-500 hover:text-white" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Player Component
function PlayerBar({ currentSong, onClose, onFinish }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    if (!currentSong) return;

    if (audioRef.current) {
      // Debug: Log what we received
      console.log("🎵 Current Song Data:", currentSong);

      // Ensure we have a file property
      if (!currentSong.file) {
        console.error("❌ No 'file' property in currentSong:", currentSong);
        alert("Erro: Nome do arquivo não encontrado. Verifique o console.");
        return;
      }

      // Construct URL (Assuming backend on localhost:8000)
      const encodedFile = encodeURIComponent(currentSong.file);
      const url = `http://localhost:8000/downloads/${encodedFile}`;

      console.log("🔊 Attempting to play:", url);

      audioRef.current.src = url;
      audioRef.current.volume = volume;
      audioRef.current.play()
        .then(() => {
          console.log("✅ Playback started successfully");
          setIsPlaying(true);
        })
        .catch(err => {
          console.error("❌ Playback error:", err);
          alert(`Erro ao tocar: ${err.message}\n\nVerifique:\n1. Se o backend foi reiniciado após adicionar o player.\n2. Se o arquivo existe em downloads/`);
        });
    }
  }, [currentSong]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setProgress(curr);
      setDuration(dur || 0);

      if (curr >= dur && dur > 0) {
        setIsPlaying(false);
        if (onFinish) onFinish();
      }
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleVolume = (e) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      const newVol = 1;
      setVolume(newVol);
      if (audioRef.current) audioRef.current.volume = newVol;
      setIsMuted(false);
    } else {
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (t) => {
    if (!t) return "0:00";
    const min = Math.floor(t / 60);
    const sec = Math.floor(t % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (!currentSong) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-3 z-[150] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-8">
        {/* Info */}
        <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
          <div className="w-12 h-12 rounded-lg overflow-hidden relative group">
            <img src={currentSong.thumbnail || "https://github.com/shadcn.png"} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Music size={20} className="text-white" />
            </div>
          </div>
          <div className="overflow-hidden">
            <h4 className="text-white font-bold text-sm truncate">{currentSong.title}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                {currentSong.quality}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-white transition-colors" title="Anterior (Indisponível)">
              <SkipBack size={20} />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button className="text-gray-400 hover:text-white transition-colors" title="Próxima (Indisponível)">
              <SkipForward size={20} />
            </button>
          </div>

          <div className="w-full flex items-center gap-3 text-xs text-gray-400 font-mono">
            <span>{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Close */}
        <div className="w-1/4 flex items-center justify-end gap-3 md:gap-6">
          <div className="flex items-center gap-2 group">
            <button onClick={toggleMute} className="text-gray-400 group-hover:text-white">
              {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
              className="w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white hover:[&::-webkit-slider-thumb]:bg-primary"
            />
          </div>
          <div className="h-8 w-px bg-white/10 mx-2"></div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default App;
