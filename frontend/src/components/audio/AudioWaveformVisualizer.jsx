import React, { useEffect, useRef } from 'react';

export default function AudioWaveformVisualizer({
  stream = null,
  isRecording = false,
  barColor = '#00d4ff',
  height = 100
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    if (isRecording && stream) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.75;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawLive = () => {
          animationFrameRef.current = requestAnimationFrame(drawLive);
          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, rect.width, height);

          // Render gradient bars
          const barWidth = (rect.width / bufferLength) * 1.8;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 255.0;
            const barHeight = Math.max(4, v * (height - 8));

            // Cyan to purple gradient
            const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(0.6, '#a855f7');
            gradient.addColorStop(1, '#07080f');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, height - barHeight, Math.max(2, barWidth - 2), barHeight, [3, 3, 0, 0]);
            ctx.fill();

            x += barWidth;
          }
        };

        drawLive();
      } catch (err) {
        console.error('Audio visualizer error:', err);
      }
    } else {
      // Idle animated pulsing sine wave
      let phase = 0;
      const drawIdle = () => {
        animationFrameRef.current = requestAnimationFrame(drawIdle);
        ctx.clearRect(0, 0, rect.width, height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.beginPath();

        const mid = height / 2;
        for (let x = 0; x < rect.width; x += 3) {
          const y = mid + Math.sin(x * 0.03 + phase) * 6 * Math.sin(x / rect.width * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        phase += 0.04;
      };

      drawIdle();
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [isRecording, stream, height]);

  return (
    <div className="w-full relative overflow-hidden rounded-xl bg-[#07080f]/90 border border-white/[0.08] p-3 flex flex-col justify-end shadow-inner">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="block"
      />
    </div>
  );
}
