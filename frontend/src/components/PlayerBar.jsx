import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Maximize2, Minimize2, ExternalLink, Repeat, Shuffle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PlayerBar({ currentSong, onClose, onFinish, onNext, onPrev }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [isLooping, setIsLooping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const audioRef = useRef(null);

  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    if (!currentSong) return;

    // Reset state for new song
    setMetadata(null);
    setHasVideoTrack(false);

    if (currentSong.file) {
      const encodedFile = encodeURIComponent(currentSong.file);
      const url = `http://localhost:8000/downloads/${encodedFile}`;
      
      // Fetch embedded lyrics & cover from backend
      fetch(`http://localhost:8000/api/track_metadata?file_path=${encodedFile}`)
        .then(res => res.json())
        .then(data => {
            if (data.cover_b64) {
               data.coverUrl = `data:${data.mime_type};base64,${data.cover_b64}`;
            }
            setMetadata(data);
        })
        .catch(err => console.error("Error fetching metadata", err));

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.volume = volume;
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.error("Playback error:", err);
          });
      }
    }
  }, [currentSong]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      setProgress(curr);
      setDuration(dur || 0);

      if (curr >= dur && dur > 0) {
        if (isLooping) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        } else {
          setIsPlaying(false);
          if (onFinish) onFinish();
        }
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
      setVolume(1);
      if (audioRef.current) audioRef.current.volume = 1;
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

  const coverSrc = metadata?.coverUrl || currentSong.thumbnail || "https://github.com/shadcn.png";
  const parsedLyrics = React.useMemo(() => {
    if (!metadata?.lyrics) return [];
    const lines = metadata.lyrics.split('\n');
    const parsed = [];
    const timeRegex = /^\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\](.*)/;
    
    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();
        if (text) {
          parsed.push({ time: minutes * 60 + seconds, text });
        }
      } else if (line.trim() && !line.startsWith('[')) {
        parsed.push({ time: -1, text: line.trim() });
      }
    }
    return parsed;
  }, [metadata?.lyrics]);

  const activeLineIndex = React.useMemo(() => {
    if (parsedLyrics.length === 0 || parsedLyrics[0].time === -1) return -1;
    let idx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (progress >= parsedLyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [progress, parsedLyrics]);

  const lyricsContainerRef = useRef(null);

  useEffect(() => {
    if (activeLineIndex !== -1 && lyricsContainerRef.current && isExpanded) {
      const container = lyricsContainerRef.current;
      const activeElement = container.children[activeLineIndex];
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex, isExpanded]);

  const openExternal = async () => {
    if (!currentSong?.file) return;
    try {
      await fetch('http://localhost:8000/api/open_external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: currentSong.file })
      });
    } catch (e) {
      console.error("Failed to open external player", e);
    }
  };

  return (
    <>
      <style>
        {`
        @keyframes wave-move {
          0% { background-position: 0 center; }
          100% { background-position: -20px center; }
        }
        .wave-bg {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='10'%3E%3Cpath d='M0,5 Q5,0 10,5 T20,5' fill='none' stroke='rgba(255,255,255,0.7)' stroke-width='2'/%3E%3C/svg%3E");
          background-repeat: repeat-x;
          background-position: 0 center;
          animation: wave-move 1s linear infinite;
        }
        `}
      </style>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && metadata && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-white tracking-tight">Detalhes da Faixa</h3>
                <button onClick={() => setShowInfo(false)} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar text-sm text-gray-300 pr-2 max-h-[60vh]">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Título</span>
                  <span className="text-white font-medium">{metadata.title || currentSong.title}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Artista</span>
                    <span className="text-white font-medium truncate block" title={metadata.artist || "Desconhecido"}>{metadata.artist || "Desconhecido"}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Álbum</span>
                    <span className="text-white font-medium truncate block" title={metadata.album || "Desconhecido"}>{metadata.album || "Desconhecido"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Duração</span>
                    <span className="text-white font-mono">{formatTime(duration)}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Ano</span>
                    <span className="text-white">{metadata.year || "N/A"}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Gênero</span>
                    <span className="text-white truncate block">{metadata.genre || "N/A"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Qualidade</span>
                    <span className="text-white tracking-widest font-mono text-xs">{currentSong.quality || "Local"}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Tamanho</span>
                    <span className="text-white font-mono text-xs">
                      {metadata.file_size ? `${(metadata.file_size / 1024 / 1024).toFixed(2)} MB` : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl mt-2">
                  <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Caminho do Arquivo</span>
                  <span className="text-xs break-all text-white/60 font-mono">{currentSong.file}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persistent Media Element */}
      <video 
        ref={audioRef}
        onLoadedMetadata={(e) => setHasVideoTrack(e.target.videoWidth > 0)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onClick={togglePlay}
        className={
          isExpanded && hasVideoTrack 
            ? "fixed inset-0 m-auto z-[205] w-full max-w-5xl max-h-[50vh] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black object-contain cursor-pointer" 
            : "hidden"
        }
      />

      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[200] flex flex-col bg-slate-900"
          >
            {/* Blurred Background */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-70 blur-[80px] scale-125 saturate-150 transition-all duration-1000"
              style={{ backgroundImage: `url(${coverSrc})` }}
            />
            <div className="absolute inset-0 bg-black/60" />
            
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6">
              <button onClick={() => setIsExpanded(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <Minimize2 size={24} />
              </button>
              <h2 className="text-sm font-bold tracking-widest uppercase text-white/50">Reproduzindo Agora</h2>
              <button onClick={onClose} className="p-2 text-white/70 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-12 overflow-hidden">
              {!hasVideoTrack && (
                <>
                  {/* Cover Art (Minimalist Vinyl) */}
                  <div className={`w-64 h-64 md:w-96 md:h-96 flex-shrink-0 relative group rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.6)] ${isPlaying && !hasVideoTrack ? 'animate-[spin_20s_linear_infinite]' : ''}`}>
                    <img 
                      src={coverSrc} 
                      className="w-full h-full object-cover rounded-full"
                      alt="Cover"
                    />
                    {/* Minimalist Vinyl Lines */}
                    <div className="absolute inset-0 rounded-full border-[15px] border-black/10 pointer-events-none" />
                    <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 md:w-6 md:h-6 bg-black rounded-full shadow-inner z-10" />
                  </div>

                  {/* Lyrics Area - Minimalist */}
                  <div 
                    className="flex-1 w-full max-w-lg h-64 md:h-96 flex flex-col relative"
                    style={{ 
                      maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)', 
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' 
                    }}
                  >
                    <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar text-center md:text-left relative z-0 pb-[30vh] pt-[15vh]">
                      {parsedLyrics.length > 0 ? (
                        parsedLyrics.map((line, i) => {
                          const isActive = i === activeLineIndex;
                          const isPlain = line.time === -1;
                          
                          let className = "transition-all duration-500 text-lg md:text-2xl font-medium leading-relaxed text-white/50 hover:text-white hover:scale-[1.02] origin-left";
                          if (!isPlain && isActive) {
                            className = "transition-all duration-500 text-2xl md:text-3xl font-bold leading-relaxed text-white scale-[1.05] origin-left drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]";
                          } else if (!isPlain && activeLineIndex !== -1 && i < activeLineIndex) {
                            className = "transition-all duration-500 text-lg md:text-xl font-medium leading-relaxed text-white/30";
                          }

                          return (
                            <p key={i} className={className}>
                              {line.text}
                            </p>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                          <motion.div animate={isPlaying ? { scale: [1, 1.1, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
                            <Music size={64} className="opacity-30 drop-shadow-2xl" />
                          </motion.div>
                          <p className="text-sm uppercase tracking-widest font-medium">Faixa Instrumental</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Controls Container */}
            <div className="relative z-10 p-6 md:p-10 flex flex-col items-center w-full max-w-4xl mx-auto space-y-8">
              <div className="text-center relative w-full flex justify-center items-center">
                <div>
                  <h1 className="text-3xl md:text-4xl font-medium text-white mb-2 tracking-tight">{currentSong.title}</h1>
                  <p className="text-white/50 font-light text-sm tracking-widest uppercase">{currentSong.quality || "Local Audio"}</p>
                </div>
                
                {hasVideoTrack && (
                  <button 
                    onClick={openExternal}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm border border-white/20 backdrop-blur-md"
                    title="Abrir no VLC / Player do Sistema"
                  >
                    <ExternalLink size={16} />
                    <span className="hidden md:inline">Player Externo</span>
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full flex items-center gap-4 text-xs md:text-sm text-gray-400 font-mono">
                <span>{formatTime(progress)}</span>
                <div className="relative flex-1 h-1.5 hover:h-3 transition-all duration-300 bg-white/20 rounded-full group cursor-pointer flex items-center overflow-hidden">
                  <div 
                    className={`absolute left-0 h-full bg-white rounded-full transition-colors ${isPlaying ? 'wave-bg' : ''}`}
                    style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-6 md:gap-10">
                <button 
                  onClick={() => setIsLooping(!isLooping)} 
                  className={`transition-colors ${isLooping ? 'text-primary' : 'text-white/30 hover:text-white/60'}`} 
                  title="Repetir Faixa"
                >
                  <Repeat size={24} />
                </button>
                <button onClick={onPrev} className="text-white/50 hover:text-white transition-colors" title="Anterior">
                  <SkipBack size={32} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105 shadow-xl"
                >
                  {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
                </button>
                <button onClick={onNext} className="text-white/50 hover:text-white transition-colors" title="Próxima">
                  <SkipForward size={32} />
                </button>
                <button 
                  onClick={() => setShowInfo(true)} 
                  className="text-white/30 hover:text-white/60 transition-colors" 
                  title="Informações da Faixa"
                >
                  <Info size={24} />
                </button>
              </div>
              
              {/* Volume */}
              <div className="absolute bottom-10 right-10 flex items-center gap-3">
                <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="relative w-24 h-1.5 bg-white/10 rounded-full group cursor-pointer flex items-center">
                  <div 
                    className="absolute left-0 h-full bg-white rounded-full group-hover:bg-primary transition-colors"
                    style={{ width: `${volume * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolume}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="minimized"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 w-full bg-black/40 backdrop-blur-3xl border-t border-white/5 p-3 z-[150] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsExpanded(true)}
          >
            <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-8 relative" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-4 w-1/4 min-w-[200px] cursor-pointer" onClick={() => setIsExpanded(true)}>
                <div className="w-12 h-12 rounded-lg overflow-hidden relative group">
                  <img src={coverSrc} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={20} className="text-white" />
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-white font-medium text-sm truncate tracking-tight">{currentSong.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/50 border border-white/10 px-1.5 py-0.5 rounded-md uppercase font-medium tracking-widest">
                      {currentSong.quality || "Local Audio"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center gap-6">
                  <button onClick={(e) => { e.stopPropagation(); if(onPrev) onPrev(); }} className="text-gray-400 hover:text-white transition-colors" title="Anterior">
                    <SkipBack size={20} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-md"
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if(onNext) onNext(); }} className="text-gray-400 hover:text-white transition-colors" title="Próxima">
                    <SkipForward size={20} />
                  </button>
                </div>

                <div className="w-full flex items-center gap-3 text-xs text-gray-400 font-mono">
                  <span>{formatTime(progress)}</span>
                  <div className="relative flex-1 h-1.5 hover:h-2 transition-all duration-300 bg-white/10 rounded-full group cursor-pointer flex items-center overflow-hidden">
                    <div 
                      className={`absolute left-0 h-full bg-white rounded-full transition-colors ${isPlaying ? 'wave-bg' : ''}`}
                      style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={progress}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="w-1/4 flex items-center justify-end gap-3 md:gap-6">
                <button onClick={() => setIsExpanded(true)} className="text-gray-400 hover:text-white transition-colors mr-2">
                   <Maximize2 size={18} />
                </button>
                <div className="flex items-center gap-2 group">
                  <button onClick={toggleMute} className="text-gray-400 group-hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <div className="relative w-20 h-1.5 bg-white/10 rounded-full group cursor-pointer flex items-center">
                    <div 
                      className="absolute left-0 h-full bg-white transition-colors rounded-full"
                      style={{ width: `${volume * 100}%` }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={handleVolume}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10 mx-2"></div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-400 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
