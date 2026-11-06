import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Volume1, VolumeX, Download, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';

export default function AudioPlayer({
  audioBlob = null,
  audioUrl = null,
  audioFile = null,
  title = 'Audio Preview',
  fileName = '',
  showWaveform = true,
  showDownload = true,
  onPlaybackChange = null,
  className = ''
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const audioRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    let url = audioUrl;
    if (audioBlob) {
      url = URL.createObjectURL(audioBlob);
      setSourceUrl(url);
    } else if (audioFile) {
      url = URL.createObjectURL(audioFile);
      setSourceUrl(url);
    } else {
      setSourceUrl(audioUrl);
    }

    return () => {
      if ((audioBlob || audioFile) && url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioBlob, audioUrl, audioFile]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
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

  // Synchronize playback status with parent acoustic monitor
  useEffect(() => {
    if (onPlaybackChange) {
      onPlaybackChange({
        isPlaying,
        currentTime,
        duration,
        progress: duration > 0 ? currentTime / duration : 0,
        audioRef
      });
    }
  }, [isPlaying, currentTime, duration, onPlaybackChange]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback prevented:', e);
      });
    }
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch((e) => {
      console.warn('Playback restart failed:', e);
    });
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e) => {
    if (!audioRef.current) return;
    const newVol = parseFloat(e.target.value);
    audioRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      audioRef.current.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleDownload = () => {
    if (!sourceUrl && !audioBlob && !audioFile) return;
    const downloadName = fileName || (audioFile ? audioFile.name : `VoiceShield_${Date.now()}.wav`);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = sourceUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    
    setDownloadSuccess(true);
    setTimeout(() => {
      document.body.removeChild(a);
      setDownloadSuccess(false);
    }, 2000);
  };

  if (!sourceUrl) return null;

  return (
    <div className={`w-full bg-[#070b12] border border-white/[0.08] rounded-2xl p-4 backdrop-blur-xl flex flex-col gap-3 shadow-xl ${className}`}>
      <audio ref={audioRef} src={sourceUrl} preload="metadata" />

      {/* Header bar: Title & Duration */}
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-pulse shrink-0" />
          <span
            className="text-xs font-mono text-slate-300 font-semibold truncate"
            title={fileName || title}
          >
            {fileName || title}
          </span>
        </div>
        <span className="text-xs font-mono text-[#00f5d4] font-bold shrink-0 whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Oscilloscope Waveform Visualizer */}
      {showWaveform && (
        <AudioWaveformVisualizer
          audioRef={audioRef}
          isPlaying={isPlaying}
          playbackProgress={duration > 0 ? currentTime / duration : 0}
          audioBlob={audioBlob || audioFile}
          height={115}
        />
      )}

      {/* Progress slider bar */}
      <div className="relative w-full h-2.5 bg-[#0f1724] rounded-full overflow-hidden cursor-pointer group">
        <input
          type="range"
          min="0"
          max="100"
          value={duration ? (currentTime / duration) * 100 : 0}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />
        <div
          className="h-full bg-gradient-to-r from-[#00f5d4] via-[#00d4ff] to-[#a855f7] rounded-full transition-all group-hover:brightness-125"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Controls: Play, Restart, Volume & Download */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={togglePlay}
            icon={isPlaying ? Pause : Play}
            className="shadow-[0_0_15px_rgba(0,245,212,0.3)]"
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

          {/* Volume Control Button & Slider */}
          <div className="flex items-center gap-1.5 bg-[#0f1724] border border-white/[0.06] rounded-xl px-2 py-1">
            <button
              type="button"
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={16} className="text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 size={16} className="text-[#00f5d4]" />
              ) : (
                <Volume2 size={16} className="text-[#00f5d4]" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-14 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00f5d4]"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
            <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>

        {/* Download Button */}
        {showDownload && (
          <Button
            size="sm"
            variant={downloadSuccess ? 'secondary' : 'outline'}
            onClick={handleDownload}
            icon={downloadSuccess ? CheckCircle2 : Download}
            className={downloadSuccess ? 'text-emerald-400 border-emerald-500/40' : ''}
            title="Download audio file to your device"
          >
            {downloadSuccess ? 'Saved' : 'Download Audio'}
          </Button>
        )}
      </div>
    </div>
  );
}
