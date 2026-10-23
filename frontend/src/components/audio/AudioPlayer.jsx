import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import Button from '../ui/Button';

export default function AudioPlayer({ audioBlob = null, audioUrl = null, title = 'Audio Preview' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState(null);

  useEffect(() => {
    let url = audioUrl;
    if (audioBlob) {
      url = URL.createObjectURL(audioBlob);
      setSourceUrl(url);
    } else {
      setSourceUrl(audioUrl);
    }

    return () => {
      if (audioBlob && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioBlob, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [sourceUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!sourceUrl) return null;

  return (
    <div className="w-full bg-[#0f1117]/90 border border-white/[0.08] rounded-2xl p-4 backdrop-blur-xl">
      <audio ref={audioRef} src={sourceUrl} preload="metadata" />

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-slate-400 truncate max-w-[200px]">{title}</span>
        <span className="text-xs font-mono text-[#00d4ff]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress slider */}
      <div className="relative w-full h-2 bg-[#161b27] rounded-full overflow-hidden mb-4 cursor-pointer">
        <input
          type="range"
          min="0"
          max="100"
          value={duration ? (currentTime / duration) * 100 : 0}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="h-full bg-gradient-to-r from-[#00d4ff] to-[#a855f7] rounded-full transition-all"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={togglePlay}
            icon={isPlaying ? Pause : Play}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={restartAudio}
            icon={RotateCcw}
          >
            Restart
          </Button>
        </div>

        <button
          onClick={toggleMute}
          className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </div>
  );
}
