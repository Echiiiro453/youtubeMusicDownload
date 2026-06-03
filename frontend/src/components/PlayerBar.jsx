import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PlayerBar({ currentSong, onClose, onFinish, onNext, onPrev }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [metadata, setMetadata] = useState(null);
  
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
  const lyricsText = metadata?.lyrics ? metadata.lyrics.split('\n') : [];

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
              className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-110"
              style={{ backgroundImage: `url(${coverSrc})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-slate-900/80 to-slate-900" />
            
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
                  {/* Cover Art (Vinyl Style) */}
                  <div className={`w-64 h-64 md:w-96 md:h-96 flex-shrink-0 relative group rounded-full p-2 bg-gradient-to-tr from-white/5 to-white/20 shadow-[0_0_50px_rgba(255,255,255,0.05)] ${isPlaying && !hasVideoTrack ? 'animate-[spin_20s_linear_infinite]' : ''}`}>
                    <img 
                      src={coverSrc} 
                      className="w-full h-full object-cover rounded-full border border-white/10 shadow-2xl"
                      alt="Cover"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/40 to-transparent pointer-events-none" />
                    {/* Vinyl Center Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-slate-900 rounded-full border border-white/20 shadow-inner z-10" />
                  </div>

                  {/* Lyrics Area */}
                  <div className="flex-1 w-full max-w-lg h-64 md:h-96 flex flex-col bg-white/5 rounded-3xl p-8 border border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />
                    
                    <h3 className="text-white/40 font-bold mb-6 uppercase tracking-[0.2em] text-xs flex items-center gap-2 relative z-20">
                      <Music size={14} /> Letras da Música
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar text-center md:text-left relative z-0 pb-12 pt-4">
                      {lyricsText.length > 0 ? (
                        lyricsText.map((line, i) => (
                          <p key={i} className="transition-all duration-500 text-lg md:text-2xl font-medium leading-relaxed text-white/50 hover:text-white hover:scale-[1.02] origin-left">
                            {line}
                          </p>
                        ))
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
                  <h1 className="text-3xl font-bold text-white mb-2">{currentSong.title}</h1>
                  <p className="text-primary font-medium">{currentSong.quality || "Local Audio"}</p>
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
              <div className="w-full flex items-center gap-4 text-sm text-gray-400 font-mono">
                <span>{formatTime(progress)}</span>
                <div className="relative flex-1 h-2 bg-white/10 rounded-full group cursor-pointer flex items-center">
                  <div 
                    className="absolute left-0 h-full bg-primary rounded-full group-hover:bg-green-400 transition-colors"
                    style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                  />
                  <div 
                    className="absolute w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity -ml-2"
                    style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }}
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
              <div className="flex items-center gap-8 md:gap-12">
                <button onClick={onPrev} className="text-white/50 hover:text-white transition-colors" title="Anterior">
                  <SkipBack size={32} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 bg-primary text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(29,185,84,0.3)]"
                >
                  {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
                </button>
                <button onClick={onNext} className="text-white/50 hover:text-white transition-colors" title="Próxima">
                  <SkipForward size={32} />
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
            className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-3 z-[150] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-slate-800/90 transition-colors"
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
                  <h4 className="text-white font-bold text-sm truncate">{currentSong.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
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
                    className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20"
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if(onNext) onNext(); }} className="text-gray-400 hover:text-white transition-colors" title="Próxima">
                    <SkipForward size={20} />
                  </button>
                </div>

                <div className="w-full flex items-center gap-3 text-xs text-gray-400 font-mono">
                  <span>{formatTime(progress)}</span>
                  <div className="relative flex-1 h-1.5 bg-white/10 rounded-full group cursor-pointer flex items-center">
                    <div 
                      className="absolute left-0 h-full bg-primary rounded-full"
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
                      className="absolute left-0 h-full bg-white group-hover:bg-primary transition-colors rounded-full"
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
