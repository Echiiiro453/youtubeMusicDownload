import React, { useState } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, X } from 'lucide-react';
import { motion } from 'framer-motion';

export function PlayerBar({ currentSong, onClose, onFinish }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    if (!currentSong) return;

    if (audioRef.current) {
      if (!currentSong.file) {
        alert("Erro: Nome do arquivo não encontrado. Verifique o console.");
        return;
      }

      const encodedFile = encodeURIComponent(currentSong.file);
      const url = `http://localhost:8000/downloads/${encodedFile}`;

      audioRef.current.src = url;
      audioRef.current.volume = volume;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error("Playback error:", err);
        });
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

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-3 z-[150] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
    >
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} />

      <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-8">
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

        <div className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-center gap-6">
            <button className="text-gray-400 hover:text-white transition-colors" title="Anterior">
              <SkipBack size={20} />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button className="text-gray-400 hover:text-white transition-colors" title="Próxima">
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
          <button onClick={onClose} className="text-gray-400 hover:text-red-400 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
