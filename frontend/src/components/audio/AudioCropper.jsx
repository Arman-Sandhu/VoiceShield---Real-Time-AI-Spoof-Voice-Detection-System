import React, { useState, useEffect, useRef } from 'react';
import { Scissors, Play, Pause, RotateCcw, Check, AlertCircle, Clock } from 'lucide-react';
import Button from '../ui/Button';
import { cropAudioFile } from '../../utils/audioTrimmer';

export default function AudioCropper({
  audioFile,
  audioBlob = null,
  onCropComplete,
  onCancel
}) {
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const audioRef = useRef(null);
  const previewIntervalRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState(null);

  // Initialize duration and source URL
  useEffect(() => {
    if (!audioFile && !audioBlob) return;

    const targetBlob = audioBlob || audioFile;
    const url = URL.createObjectURL(targetBlob);
    setSourceUrl(url);

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const tempCtx = new AudioCtx();

    targetBlob.arrayBuffer().then((buf) => {
      tempCtx.decodeAudioData(buf).then((decoded) => {
        const dur = Math.round(decoded.duration * 100) / 100;
        setDuration(dur);
        setStartTime(0);
        setEndTime(dur);
        tempCtx.close();
      }).catch((e) => {
        console.warn('Decode error in cropper:', e);
        tempCtx.close();
      });
    }).catch((e) => {
      console.warn('ArrayBuffer error in cropper:', e);
      tempCtx.close();
    });

    return () => {
      URL.revokeObjectURL(url);
      clearInterval(previewIntervalRef.current);
    };
  }, [audioFile, audioBlob]);

  // Handle preview playback bounded to [startTime, endTime]
  const togglePreview = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlayingPreview) {
      audio.pause();
      setIsPlayingPreview(false);
      clearInterval(previewIntervalRef.current);
    } else {
      audio.currentTime = startTime;
      audio.play().then(() => {
        setIsPlayingPreview(true);
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = setInterval(() => {
          if (audio.currentTime >= endTime) {
            audio.pause();
            audio.currentTime = startTime;
            setIsPlayingPreview(false);
            clearInterval(previewIntervalRef.current);
          }
        }, 50);
      }).catch((e) => {
        console.warn('Preview play failed:', e);
      });
    }
  };

  const handleApplyCrop = async () => {
    const selectedLength = endTime - startTime;
    if (selectedLength < 1.0) {
      setErrorMessage('Selected segment is too short. Wav2Vec2 neural model requires at least 1.0 second of audio.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingPreview(false);
      clearInterval(previewIntervalRef.current);

      const targetInput = audioFile || audioBlob;
      const originalName = audioFile?.name || 'VoiceShield_Recording.wav';
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      const newName = `${baseName}_cropped_${startTime.toFixed(1)}s-${endTime.toFixed(1)}s.wav`;

      const result = await cropAudioFile(targetInput, startTime, endTime, newName);
      if (onCropComplete) {
        onCropComplete(result.file, result.blob, result.duration);
      }
    } catch (err) {
      console.error('Cropping failed:', err);
      setErrorMessage(`Failed to crop audio: ${err.message || 'Unknown processing error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedLength = Math.max(0, endTime - startTime);
  const isValidLength = selectedLength >= 1.0;

  return (
    <div className="w-full bg-[#0a0f18] border border-[#00f5d4]/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-[0_0_30px_rgba(0,245,212,0.08)]">
      {sourceUrl && <audio ref={audioRef} src={sourceUrl} preload="metadata" />}

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00f5d4]/15 border border-[#00f5d4]/30 flex items-center justify-center text-[#00f5d4]">
            <Scissors size={15} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Audio Waveform Trimmer</h4>
            <p className="text-[11px] text-slate-400 font-mono">
              Select and crop a clean segment of audible speech
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Total:</span>
          <span className="text-white font-semibold">{duration.toFixed(2)}s</span>
        </div>
      </div>

      {/* Visual Timeline Range Indicator */}
      <div className="flex flex-col gap-1.5">
        <div className="relative w-full h-8 bg-[#04080d] rounded-xl border border-white/10 overflow-hidden flex items-center px-1">
          {/* Unselected Left Zone */}
          <div
            className="h-full bg-slate-900/80 border-r border-rose-500/40 transition-all"
            style={{ width: `${duration ? (startTime / duration) * 100 : 0}%` }}
          />

          {/* Selected Active Crop Zone */}
          <div
            className="h-full bg-[#00f5d4]/20 border-y border-[#00f5d4] flex items-center justify-center relative shadow-[0_0_15px_rgba(0,245,212,0.25)] transition-all"
            style={{
              width: `${duration ? (selectedLength / duration) * 100 : 100}%`
            }}
          >
            <span className="text-[10px] font-mono text-[#00f5d4] font-bold px-1 truncate">
              {selectedLength.toFixed(2)}s
            </span>
          </div>

          {/* Unselected Right Zone */}
          <div
            className="h-full bg-slate-900/80 border-l border-rose-500/40 flex-1 transition-all"
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>0.00s</span>
          <span>{(duration / 2).toFixed(2)}s</span>
          <span>{duration.toFixed(2)}s</span>
        </div>
      </div>

      {/* Interactive Range Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#060b12] p-3.5 rounded-xl border border-white/[0.06]">
        {/* Start Time Control */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Start Time:</span>
            <span className="text-[#00f5d4] font-bold">{startTime.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(0, endTime - 0.5)}
            step="0.05"
            value={startTime}
            onChange={(e) => setStartTime(parseFloat(e.target.value))}
            className="w-full accent-[#00f5d4] cursor-pointer h-1.5 bg-[#162032] rounded-lg"
          />
        </div>

        {/* End Time Control */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">End Time:</span>
            <span className="text-[#00f5d4] font-bold">{endTime.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={startTime + 0.5}
            max={duration || 10}
            step="0.05"
            value={endTime}
            onChange={(e) => setEndTime(parseFloat(e.target.value))}
            className="w-full accent-[#00f5d4] cursor-pointer h-1.5 bg-[#162032] rounded-lg"
          />
        </div>
      </div>

      {/* Error or Notice Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isValidLength && !errorMessage && (
        <div className="text-[11px] text-amber-400/90 font-mono flex items-center gap-1.5">
          <Clock size={13} />
          <span>Minimum segment length is 1.0s (currently {selectedLength.toFixed(2)}s).</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={togglePreview}
            icon={isPlayingPreview ? Pause : Play}
            disabled={!isValidLength}
          >
            {isPlayingPreview ? 'Pause Selection' : 'Preview Selection'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStartTime(0);
              setEndTime(duration);
              setErrorMessage(null);
            }}
            icon={RotateCcw}
          >
            Reset Range
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={handleApplyCrop}
            disabled={!isValidLength || isProcessing}
            icon={Check}
            className="shadow-[0_0_15px_rgba(0,245,212,0.3)]"
          >
            {isProcessing ? 'Processing WAV...' : 'Apply Crop'}
          </Button>
        </div>
      </div>
    </div>
  );
}
