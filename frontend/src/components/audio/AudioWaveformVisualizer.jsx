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

  const playbackProgressRef = useRef(playbackProgress);
  playbackProgressRef.current = playbackProgress;

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
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512; // 256 frequency bins for accurate voice spectrum resolution
        analyser.smoothingTimeConstant = 0.86; // Balanced spectral smoothing
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const freqArray = new Uint8Array(bufferLength);
        const timeArray = new Uint8Array(analyser.fftSize);

        // Persistent temporal smoothing buffers across animation frames
        let smoothedBars = null;
        let smoothedVoiceEnergy = 0;

        const renderRecording = () => {
          animFrameRef.current = requestAnimationFrame(renderRecording);
          const rect = canvas.getBoundingClientRect();
          const w = rect.width;
          const h = height;
          if (w <= 0 || h <= 0) return;

          const midY = h / 2;

          analyser.getByteFrequencyData(freqArray);
          analyser.getByteTimeDomainData(timeArray);

          // 1. Precise time-domain RMS calculation
          let sumSquares = 0;
          for (let j = 0; j < timeArray.length; j++) {
            const normSample = (timeArray[j] - 128) / 128.0;
            sumSquares += normSample * normSample;
          }
          const rms = Math.sqrt(sumSquares / timeArray.length);

          // 2. Continuous Voice Activity Gate (VAD)
          // Ambient room noise / mic hiss is typically RMS < 0.015.
          // Real human speech is RMS >= 0.025 to 0.30.
          const NOISE_FLOOR = 0.016;
          let rawVoice = 0;
          if (rms > NOISE_FLOOR) {
            // Cubic smoothstep from NOISE_FLOOR to (NOISE_FLOOR + 0.08)
            const norm = Math.min(1.0, (rms - NOISE_FLOOR) / 0.08);
            rawVoice = norm * norm * (3 - 2 * norm);
          }

          // Temporal envelope follower on voice activity:
          // Attack: 0.22 (smooth responsive bloom on speech onset)
          // Decay: 0.08 (graceful, musical glide down to baseline)
          if (rawVoice > smoothedVoiceEnergy) {
            smoothedVoiceEnergy += (rawVoice - smoothedVoiceEnergy) * 0.22;
          } else {
            smoothedVoiceEnergy += (rawVoice - smoothedVoiceEnergy) * 0.08;
          }

          // Clear background (dark oscilloscope screen)
          ctx.fillStyle = '#04090e';
          ctx.fillRect(0, 0, w, h);
          drawGrid(w, h);

          const numBars = Math.floor(w / 4);
          const barWidth = 2.2;
          const gap = (w - numBars * barWidth) / (numBars + 1);
          const centerIdx = (numBars - 1) / 2;

          // Initialize or resize persistent smoothed bars array
          if (!smoothedBars || smoothedBars.length !== numBars) {
            smoothedBars = new Float32Array(numBars);
            smoothedBars.fill(2.5);
          }

          const rawAmps = new Float32Array(numBars);

          // Calculate voice spectrum only when there is genuine voice activity
          if (smoothedVoiceEnergy > 0.005) {
            for (let i = 0; i < numBars; i++) {
              const normDist = centerIdx > 0 ? Math.abs(i - centerIdx) / centerIdx : 0;

              // Voice spectrum window mapping from center outward:
              // Center: Pitch fundamentals (100-350Hz)
              // Mid: Formants and vocal clarity (400-2500Hz)
              // Outer: Treble & sibilants (2500-6000Hz)
              const centerBin = 2 + Math.pow(normDist, 1.25) * 58;

              // 5-bin triangular window integration to eliminate single-bin FFT flutter
              let binSum = 0;
              let weightSum = 0;
              for (let delta = -2; delta <= 2; delta++) {
                const b = Math.max(1, Math.min(bufferLength - 1, Math.round(centerBin + delta)));
                const weight = 1 - Math.abs(delta) * 0.3;
                binSum += (freqArray[b] / 255.0) * weight;
                weightSum += weight;
              }
              const integratedFreq = binSum / weightSum;

              // Clean ambient frequency baseline
              const cleanFreq = Math.max(0, integratedFreq - 0.10) / 0.90;

              // Voice equalization curve: balances low warmth and high sibilants
              const eqGain = 1.0 + Math.pow(normDist, 0.65) * 0.85;
              const spectralEnergy = Math.min(1.0, cleanFreq * eqGain);

              // Organic acoustic taper towards screen edges
              const edgeEnvelope = Math.cos(normDist * Math.PI * 0.46);

              rawAmps[i] = spectralEnergy * smoothedVoiceEnergy * edgeEnvelope;
            }
          }

          // 3. Spatial Gaussian filter across adjacent bars
          // Guarantees smooth, continuous acoustic curves with ZERO single-pixel needle spikes
          const spatiallySmoothed = new Float32Array(numBars);
          for (let i = 0; i < numBars; i++) {
            const prev = i > 0 ? rawAmps[i - 1] : rawAmps[i];
            const curr = rawAmps[i];
            const next = i < numBars - 1 ? rawAmps[i + 1] : rawAmps[i];
            spatiallySmoothed[i] = 0.22 * prev + 0.56 * curr + 0.22 * next;
          }

          ctx.save();
          ctx.shadowColor = 'rgba(0, 245, 212, 0.75)';
          ctx.shadowBlur = 8;

          const maxHalfHeight = midY - 10;

          // 4. Render bars with temporal attack/decay lerp
          for (let i = 0; i < numBars; i++) {
            const targetHeight = Math.max(2.5, spatiallySmoothed[i] * maxHalfHeight);

            // Temporal ballistics (IEC PPM standard inspired):
            // Smooth attack on speech onset (~60ms)
            // Liquid analog release on speech decay (~300ms)
            if (targetHeight > smoothedBars[i]) {
              smoothedBars[i] += (targetHeight - smoothedBars[i]) * 0.24;
            } else {
              smoothedBars[i] += (targetHeight - smoothedBars[i]) * 0.09;
            }

            const barHeight = Math.max(2.5, smoothedBars[i]);
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
    else if (isPlaying && (audioRef?.current || playbackProgressRef.current !== undefined)) {
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
        const progress = (audio && audio.duration) ? audio.currentTime / audio.duration : (playbackProgressRef.current || 0);

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
      const progress = (audio && audio.duration) ? audio.currentTime / audio.duration : (playbackProgressRef.current || 0);

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
        const centerIdx = (numBars - 1) / 2;

        for (let i = 0; i < numBars; i++) {
          const x = gap + i * (barWidth + gap);
          const normDist = centerIdx > 0 ? Math.abs(i - centerIdx) / centerIdx : 0;
          const envelope = Math.cos(normDist * Math.PI * 0.45);
          // Ultra-subtle standby phosphor shimmer (rests on 2.5px baseline, max variation only 1.2px)
          const shimmer = Math.sin(i * 0.08 + phase) * Math.cos(i * 0.03 - phase * 0.5);
          const barHeight = Math.max(2.5, 2.5 + shimmer * 1.2 * envelope);

          const grad = ctx.createLinearGradient(0, midY - barHeight, 0, midY + barHeight);
          grad.addColorStop(0, 'rgba(0, 245, 212, 0.7)');
          grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.5)');
          grad.addColorStop(1, 'rgba(0, 245, 212, 0.7)');

          ctx.fillStyle = grad;
          ctx.fillRect(x, midY - barHeight, barWidth, barHeight * 2);
        }

        ctx.restore();
        phase += 0.03;
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
  }, [isRecording, stream, isPlaying, audioRef, audioBufferData, height, showGrid]);

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
