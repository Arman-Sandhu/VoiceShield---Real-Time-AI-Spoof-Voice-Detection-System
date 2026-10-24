import React, { useEffect, useRef, useState } from 'react';

/**
 * Cyber Oscilloscope Audio Waveform Visualizer.
 * Matches the glowing cyan-green phosphor oscilloscope grid aesthetic from Image 1.
 * Supports:
 * - Real-time microphone audio stream visualization
 * - Real-time audio playback visualization (via audioRef or Web Audio API)
 * - Static waveform envelope visualization
 * - Idle scanning mode with subtle phosphor pulse
 */
export default function AudioWaveformVisualizer({
  stream = null,
  isRecording = false,
  audioRef = null,
  isPlaying = false,
  playbackProgress = 0,
  audioBlob = null,
  height = 140,
  showGrid = true,
  className = ''
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const [audioBufferData, setAudioBufferData] = useState(null);

  // If audioBlob changes, decode audio buffer for static envelope mapping
  useEffect(() => {
    if (!audioBlob) {
      setAudioBufferData(null);
      return;
    }

    let isCancelled = false;
    const decodeBlob = async () => {
      try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const tempCtx = new AudioCtx();
        const decoded = await tempCtx.decodeAudioData(arrayBuffer);
        await tempCtx.close();

        if (isCancelled) return;

        // Downsample to ~200 normalized peaks for high-speed rendering
        const rawData = decoded.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize between 0.05 and 0.95
        const maxVal = Math.max(...filteredData, 0.001);
        const normalized = filteredData.map((n) => Math.max(0.04, n / maxVal));
        setAudioBufferData(normalized);
      } catch (err) {
        console.warn('Could not decode audio buffer for static visualization:', err);
      }
    };

    decodeBlob();
    return () => {
      isCancelled = true;
    };
  }, [audioBlob]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle high DPI display
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Grid Renderer function
    const drawGrid = (width, h) => {
      if (!showGrid) return;
      ctx.save();
      
      // Grid line colors (phosphor teal-green matrix overlay)
      ctx.strokeStyle = 'rgba(0, 212, 170, 0.09)';
      ctx.lineWidth = 1;

      // Vertical grid lines
      const stepX = 28;
      for (let x = 0; x < width; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }

      // Horizontal grid lines
      const stepY = 20;
      for (let y = 0; y < h; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }

      // Central baseline axis
      const midY = h / 2;
      ctx.strokeStyle = 'rgba(0, 245, 212, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      ctx.restore();
    };

    // 1. Mode: Live Microphone Recording
    if (isRecording && stream) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512; // 256 frequency bins for accurate voice spectrum resolution
        analyser.smoothingTimeConstant = 0.65; // Snappy speech onset and rapid decay to baseline
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const freqArray = new Uint8Array(bufferLength);
        const timeArray = new Uint8Array(analyser.fftSize);

        const renderRecording = () => {
          animFrameRef.current = requestAnimationFrame(renderRecording);
          const rect = canvas.getBoundingClientRect();
          const w = rect.width;
          const h = height;
          if (w <= 0 || h <= 0) return;

          const midY = h / 2;

          analyser.getByteFrequencyData(freqArray);
          analyser.getByteTimeDomainData(timeArray);

          // 1. Calculate instant RMS loudness from time-domain
          let sumSquares = 0;
          for (let j = 0; j < timeArray.length; j++) {
            const normSample = (timeArray[j] - 128) / 128.0;
            sumSquares += normSample * normSample;
          }
          const rms = Math.sqrt(sumSquares / timeArray.length);

          // 2. Strict Speech Activity Gate (VAD)
          // Ambient room noise and mic self-noise typically have RMS < 0.016.
          // Real human speech is RMS > 0.02 (whispering is ~0.03, normal speaking is ~0.08 - 0.25).
          const NOISE_FLOOR_RMS = 0.016;
          const speechFactor = Math.min(1.0, Math.max(0, (rms - NOISE_FLOOR_RMS) / 0.12));

          // 3. Clear background (dark oscilloscope screen)
          ctx.fillStyle = '#04090e';
          ctx.fillRect(0, 0, w, h);
          drawGrid(w, h);

          // Center-focused symmetric speech monitor
          const numBars = Math.floor(w / 4);
          const barWidth = 2.2;
          const gap = (w - numBars * barWidth) / (numBars + 1);
          const centerIdx = (numBars - 1) / 2;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 245, 212, 0.75)';
          ctx.shadowBlur = 8;

          // When there is NO sound (speech below noise gate), render completely flat baseline:
          // No artificial bumps, no inflated peaks, zero fake curvature.
          if (speechFactor <= 0) {
            const baselineHeight = 2.5;
            ctx.fillStyle = 'rgba(0, 245, 212, 0.55)';
            for (let i = 0; i < numBars; i++) {
              const x = gap + i * (barWidth + gap);
              ctx.fillRect(x, midY - baselineHeight, barWidth, baselineHeight * 2);
            }
            ctx.restore();
            return;
          }

          // When real sound is detected, compute real acoustic peaks centered in monitor
          const maxHalfHeight = midY - 12;

          for (let i = 0; i < numBars; i++) {
            const normDist = centerIdx > 0 ? Math.abs(i - centerIdx) / centerIdx : 0;

            // Map distance from center outward to human voice frequency bins:
            // Center (normDist = 0): Fundamental pitch & deep chest voice (~90Hz - 350Hz)
            // Mid (normDist = 0.2 - 0.6): Vowel formants & speech presence (~400Hz - 2500Hz)
            // Outer (normDist = 0.6 - 1.0): High speech clarity, treble & sibilants (~2500Hz - 6500Hz)
            const targetBin = 1 + Math.pow(normDist, 1.25) * 65;
            const b0 = Math.floor(targetBin);
            const b1 = Math.min(bufferLength - 1, b0 + 1);
            const frac = targetBin - b0;
            const rawFreq = (freqArray[b0] * (1 - frac) + freqArray[b1] * frac) / 255.0;

            // Frequency noise floor: ambient room hiss is typically ~0.10
            const FREQ_NOISE_FLOOR = 0.10;
            const cleanFreq = Math.max(0, rawFreq - FREQ_NOISE_FLOOR) / (1 - FREQ_NOISE_FLOOR);

            // Equalized acoustic pre-emphasis for treble/sibilants
            const trebleGain = 1.0 + Math.pow(normDist, 0.7) * 1.4;
            const spectralAmp = Math.min(1.0, cleanFreq * trebleGain);

            // Natural power expansion (produces sharp, authentic acoustic peaks instead of an inflated loaf)
            const perceivedEnergy = Math.pow(spectralAmp, 1.35);

            // Gentle taper at outer screen borders
            const envelope = Math.cos(normDist * Math.PI * 0.46);

            // Combined dynamic amplitude strictly modulated by real speech presence
            const barAmp = perceivedEnergy * speechFactor * envelope;

            // Bar height: minimum 2.5px baseline, scaling with genuine voice energy
            const barHeight = Math.max(2.5, barAmp * maxHalfHeight);

            const x = gap + i * (barWidth + gap);

            // Glowing phosphor gradient
            const grad = ctx.createLinearGradient(0, midY - barHeight, 0, midY + barHeight);
            grad.addColorStop(0, '#00f5d4');
            grad.addColorStop(0.25, '#00d4ff');
            grad.addColorStop(0.5, '#10b981');
            grad.addColorStop(0.75, '#00d4ff');
            grad.addColorStop(1, '#00f5d4');

            ctx.fillStyle = grad;
            ctx.fillRect(x, midY - barHeight, barWidth, barHeight * 2);
          }

          ctx.restore();
        };

        renderRecording();
      } catch (err) {
        console.error('Audio recorder visualizer initialization failed:', err);
      }
    }
    // 2. Mode: Playing Audio / Audio preview
    else if (isPlaying && (audioRef?.current || playbackProgress !== undefined)) {
      let phase = 0;
      const renderPlayback = () => {
        animFrameRef.current = requestAnimationFrame(renderPlayback);
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = height;
        const midY = h / 2;

        ctx.fillStyle = '#04090e';
        ctx.fillRect(0, 0, w, h);
        drawGrid(w, h);

        const audio = audioRef?.current;
        const progress = (audio && audio.duration) ? audio.currentTime / audio.duration : (playbackProgress || 0);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 245, 212, 0.8)';
        ctx.shadowBlur = 9;

        const numBars = Math.floor(w / 4);
        const barWidth = 2.2;
        const gap = (w - numBars * barWidth) / (numBars + 1);

        for (let i = 0; i < numBars; i++) {
          const ratio = i / numBars;
          let amp = 0.2;

          // If we have decoded audio peaks, read from buffer
          if (audioBufferData && audioBufferData.length > 0) {
            const sampleIdx = Math.floor(ratio * audioBufferData.length);
            amp = audioBufferData[sampleIdx] || 0.1;
          }

          // Active playback wave pulse
          const distanceToCursor = Math.abs(ratio - progress);
          const cursorBoost = Math.max(0, 1 - distanceToCursor * 8);
          const dynamicMod = Math.sin(i * 0.2 + phase * 2) * 0.2 + Math.cos(i * 0.1 - phase) * 0.15;
          const barHeight = Math.max(3, (amp * 0.8 + cursorBoost * 0.5 + dynamicMod * 0.2) * (midY - 10));

          const x = gap + i * (barWidth + gap);

          const grad = ctx.createLinearGradient(0, midY - barHeight, 0, midY + barHeight);
          if (ratio <= progress) {
            grad.addColorStop(0, '#00f5d4');
            grad.addColorStop(0.5, '#00d4ff');
            grad.addColorStop(1, '#00f5d4');
          } else {
            grad.addColorStop(0, 'rgba(0, 212, 170, 0.45)');
            grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.35)');
            grad.addColorStop(1, 'rgba(0, 212, 170, 0.45)');
          }

          ctx.fillStyle = grad;
          ctx.fillRect(x, midY - barHeight, barWidth, barHeight * 2);
        }

        // Draw prominent glowing vertical playhead line |
        const cursorX = Math.max(0, Math.min(w, progress * w));
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, h);
        ctx.stroke();

        // Top pointer head
        ctx.fillStyle = '#00f5d4';
        ctx.beginPath();
        ctx.moveTo(cursorX - 4.5, 0);
        ctx.lineTo(cursorX + 4.5, 0);
        ctx.lineTo(cursorX, 8);
        ctx.closePath();
        ctx.fill();

        // Bottom pointer head
        ctx.beginPath();
        ctx.moveTo(cursorX - 4.5, h);
        ctx.lineTo(cursorX + 4.5, h);
        ctx.lineTo(cursorX, h - 8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        phase += 0.08;
      };

      renderPlayback();
    }
    // 3. Mode: Static Audio Buffer Loaded (Not currently playing)
    else if (audioBufferData && audioBufferData.length > 0) {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = height;
      const midY = h / 2;

      ctx.fillStyle = '#04090e';
      ctx.fillRect(0, 0, w, h);
      drawGrid(w, h);

      const audio = audioRef?.current;
      const progress = (audio && audio.duration) ? audio.currentTime / audio.duration : (playbackProgress || 0);

      const numBars = Math.floor(w / 4);
      const barWidth = 2.2;
      const gap = (w - numBars * barWidth) / (numBars + 1);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 212, 170, 0.4)';
      ctx.shadowBlur = 6;

      for (let i = 0; i < numBars; i++) {
        const ratio = i / numBars;
        const sampleIdx = Math.floor(ratio * audioBufferData.length);
        const amp = audioBufferData[sampleIdx] || 0.05;
        const barHeight = Math.max(3, amp * (midY - 12));
        const x = gap + i * (barWidth + gap);

        const grad = ctx.createLinearGradient(0, midY - barHeight, 0, midY + barHeight);
        if (progress > 0 && ratio <= progress) {
          grad.addColorStop(0, '#00f5d4');
          grad.addColorStop(0.5, '#00d4ff');
          grad.addColorStop(1, '#00f5d4');
        } else {
          grad.addColorStop(0, 'rgba(0, 245, 212, 0.7)');
          grad.addColorStop(0.5, 'rgba(0, 212, 255, 0.55)');
          grad.addColorStop(1, 'rgba(0, 245, 212, 0.7)');
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x, midY - barHeight, barWidth, barHeight * 2);
      }

      // Draw vertical playhead line | if progress > 0
      if (progress > 0) {
        const cursorX = Math.max(0, Math.min(w, progress * w));
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, h);
        ctx.stroke();

        ctx.fillStyle = '#00f5d4';
        ctx.beginPath();
        ctx.moveTo(cursorX - 4.5, 0);
        ctx.lineTo(cursorX + 4.5, 0);
        ctx.lineTo(cursorX, 8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cursorX - 4.5, h);
        ctx.lineTo(cursorX + 4.5, h);
        ctx.lineTo(cursorX, h - 8);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
    // 4. Mode: Idle Standby (Pulsing cyber acoustic monitor scan)
    else {
      let phase = 0;
      const renderIdle = () => {
        animFrameRef.current = requestAnimationFrame(renderIdle);
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = height;
        const midY = h / 2;

        ctx.fillStyle = '#04090e';
        ctx.fillRect(0, 0, w, h);
        drawGrid(w, h);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 245, 212, 0.6)';
        ctx.shadowBlur = 7;

        // Draw delicate baseline raster spikes with subtle undulation
        const numBars = Math.floor(w / 4);
        const barWidth = 2.0;
        const gap = (w - numBars * barWidth) / (numBars + 1);

        const ampScale = Math.max(1, height / 125);
        for (let i = 0; i < numBars; i++) {
          const x = gap + i * (barWidth + gap);
          const envelope = Math.sin((i / numBars) * Math.PI);
          const wave = Math.sin(i * 0.12 + phase) * Math.cos(i * 0.05 - phase * 0.5);
          const barHeight = Math.max(2.5, (4 + wave * 11 * envelope) * ampScale);

          const grad = ctx.createLinearGradient(0, midY - barHeight, 0, midY + barHeight);
          grad.addColorStop(0, 'rgba(0, 245, 212, 0.7)');
          grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.5)');
          grad.addColorStop(1, 'rgba(0, 245, 212, 0.7)');

          ctx.fillStyle = grad;
          ctx.fillRect(x, midY - barHeight, barWidth, barHeight * 2);
        }

        ctx.restore();
        phase += 0.04;
      };

      renderIdle();
    }

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
      }
    };
  }, [isRecording, stream, isPlaying, audioRef, playbackProgress, audioBufferData, height, showGrid]);

  return (
    <div
      ref={containerRef}
      className={`w-full relative overflow-hidden rounded-2xl bg-[#04090e] border border-[#00f5d4]/20 p-2.5 shadow-[inset_0_0_30px_rgba(0,245,212,0.06),0_0_20px_rgba(0,0,0,0.6)] ${className}`}
    >
      {/* Corner Cyber HUD Accents */}
      <div className="absolute top-2 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00f5d4] animate-ping" />
        <span className="text-[10px] font-mono tracking-wider text-[#00f5d4]/80 uppercase">
          {isRecording ? 'LIVE INPUT 16K' : isPlaying ? 'PLAYBACK ACTIVE' : 'ACOUSTIC MONITOR'}
        </span>
      </div>

      <div className="absolute top-2 right-2.5 text-[9px] font-mono text-emerald-400/60 pointer-events-none uppercase">
        OSCILLOSCOPE &bull; SPECTRUM MATRIX
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="block"
      />
    </div>
  );
}
