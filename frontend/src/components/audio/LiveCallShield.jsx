import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  Vibrate,
  Activity,
  Radio,
  Sparkles,
  Info,
  Smartphone
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';
import api from '../../services/api';
import { encodeWAV } from '../../utils/wavEncoder';

/**
 * LiveCallShield: Real-Time Mobile & Desktop Call Protection Engine.
 * Slices 3-second rolling audio chunks, performs real-time acoustic inference,
 * triggers audible beeps, device vibration, and floating contextual risk banners.
 */
export default function LiveCallShield() {
  const [isActive, setIsActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [chunksAnalyzed, setChunksAnalyzed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [currentScore, setCurrentScore] = useState(null);
  const [rollingScores, setRollingScores] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [isProcessingChunk, setIsProcessingChunk] = useState(false);
  const [guidanceMessage, setGuidanceMessage] = useState(
    'Live Call Shield is ready. Activate to start real-time 3-second streaming protection.'
  );

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const pcmBufferRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const chunkIntervalRef = useRef(null);
  const alertAudioCtxRef = useRef(null);

  // Play synthetic cyber alert warble tone
  const playAlertBeep = useCallback((isCritical = true) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!alertAudioCtxRef.current) {
        alertAudioCtxRef.current = new AudioCtx();
      }
      const ctx = alertAudioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isCritical ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isCritical ? 880 : 520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isCritical ? 1760 : 660, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(isCritical ? 880 : 520, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Web Audio warning sound failed:', e);
    }
  }, [soundEnabled]);

  // Trigger mobile haptic vibration
  const triggerVibrate = useCallback((pattern = [200, 100, 200, 100, 300]) => {
    if (!vibrateEnabled) return;
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        console.warn('Vibration API not permitted:', err);
      }
    }
  }, [vibrateEnabled]);

  // Duration timer
  useEffect(() => {
    if (isActive) {
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isActive]);

  // Analyze the latest 3-second PCM audio buffer
  const processCurrentChunk = async () => {
    if (pcmBufferRef.current.length < 16000) return; // Need at least 1 second

    // Grab the most recent 3 seconds (up to 48,000 samples at 16kHz)
    const samples = pcmBufferRef.current.slice(-48000);
    const wavBlob = encodeWAV(samples, 16000);
    const chunkFile = new File([wavBlob], `call_chunk_${Date.now()}.wav`, { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('file', chunkFile);

    setIsProcessingChunk(true);
    try {
      const response = await api.post('/analysis/live-chunk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data;

      setCurrentScore(data);
      setChunksAnalyzed((prev) => prev + 1);
      setRollingScores((prev) => [...prev.slice(-14), data.fake_score]);

      if (data.is_alert) {
        setActiveAlert({
          level: data.alert_level,
          score: data.fake_score,
          recommendation: data.recommendation,
          time: new Date().toLocaleTimeString()
        });
        playAlertBeep(data.alert_level === 'CRITICAL');
        triggerVibrate(data.vibrate_pattern);
        setGuidanceMessage(data.recommendation);
      } else if (data.prediction === 'INCONCLUSIVE') {
        setGuidanceMessage(data.recommendation);
      } else {
        setActiveAlert(null);
        setGuidanceMessage(
          `Authentic human caller verified (${(data.fake_score * 100).toFixed(1)}% spoof score). Safe to proceed.`
        );
      }
    } catch (err) {
      console.error('Error analyzing live audio chunk:', err);
    } finally {
      setIsProcessingChunk(false);
    }
  };

  // Start live monitoring
  const startLiveShield = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      mediaStreamRef.current = stream;
      setAudioStream(stream);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      let audioCtx;
      try {
        audioCtx = new AudioCtx({ sampleRate: 16000 });
      } catch (e) {
        audioCtx = new AudioCtx();
      }
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessor captures raw 16kHz PCM stream
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      pcmBufferRef.current = [];

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Retain rolling 6 seconds maximum in memory
        for (let i = 0; i < inputData.length; i++) {
          pcmBufferRef.current.push(inputData[i]);
        }
        if (pcmBufferRef.current.length > 96000) {
          pcmBufferRef.current = pcmBufferRef.current.slice(-96000);
        }
      };

      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      source.connect(processor);
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);

      setIsActive(true);
      setCallDuration(0);
      setChunksAnalyzed(0);
      setRollingScores([]);
      setActiveAlert(null);
      setGuidanceMessage('Listening to live call... Slicing 3-second audio windows.');

      // Process a 3-second chunk every 2.5 seconds (sliding window)
      chunkIntervalRef.current = setInterval(() => {
        processCurrentChunk();
      }, 2500);
    } catch (err) {
      console.error('Microphone access failed for live call shield:', err);
      setGuidanceMessage('Microphone permission denied. Please allow microphone access to monitor calls.');
    }
  };

  // Stop live monitoring
  const stopLiveShield = () => {
    setIsActive(false);
    clearInterval(chunkIntervalRef.current);
    clearInterval(timerIntervalRef.current);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioStream(null);
    pcmBufferRef.current = [];
    setGuidanceMessage('Live Call Shield paused. Session telemetry archived.');
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopLiveShield();
    };
  }, []);

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner Alert (Push Notification style on Mobile) */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-2xl relative overflow-hidden ${
              activeAlert.level === 'CRITICAL'
                ? 'bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-red-950/80 border-rose-500/60 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                : 'bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-yellow-950/80 border-amber-500/60 text-amber-200 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
            }`}
          >
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                activeAlert.level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <ShieldAlert size={24} className="animate-pulse" />
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 font-bold">
                  {activeAlert.level} ALERT
                </span>
                <span className="text-xs font-mono opacity-80">{activeAlert.time}</span>
              </div>
              <h4 className="text-sm font-display font-bold text-white mb-0.5">
                {activeAlert.level === 'CRITICAL' ? 'Synthetic AI Clone Detected!' : 'Suspicious Caller Audio'}
              </h4>
              <p className="text-xs leading-relaxed opacity-90">{activeAlert.recommendation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Live Shield Control Card */}
      <Card variant="elevated" className="p-5 sm:p-7 relative overflow-hidden">
        {/* Glowing Background Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00d4ff]/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#00f5d4]/15 border-[#00f5d4]/50 text-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.35)]'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Radio size={20} className={isActive ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-display font-bold text-white">
                    Live Call Shield
                  </h3>
                  <Badge variant={isActive ? 'cyan' : 'ghost'} size="sm">
                    {isActive ? 'MONITORING CALL' : 'IDLE'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Real-time 3s sliding window &bull; Android Haptics &bull; In-Call Alerts
                </p>
              </div>
            </div>

            {/* Quick Mobile Feature Toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
                title="Toggle Warning Beep"
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span className="hidden sm:inline">Beep</span>
              </button>

              <button
                type="button"
                onClick={() => setVibrateEnabled(!vibrateEnabled)}
                className={`p-2 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                  vibrateEnabled
                    ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#a855f7]'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
                title="Toggle Android Haptic Vibration"
              >
                <Vibrate size={14} />
                <span className="hidden sm:inline">Vibrate</span>
              </button>
            </div>
          </div>

          {/* Oscilloscope Waveform Display */}
          <div className="rounded-2xl border border-white/10 bg-[#04080d] p-3 overflow-hidden shadow-inner relative">
            <AudioWaveformVisualizer
              stream={audioStream}
              isRecording={isActive}
              height={120}
              showGrid={true}
            />

            {/* In-waveform Call Telemetry Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-[#00f5d4] animate-ping' : 'bg-slate-600'
                  }`}
                />
                {isActive ? `CALL: ${formatSeconds(callDuration)}` : 'CALL DISCONNECTED'}
              </span>
              {isActive && (
                <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-400">
                  {chunksAnalyzed} Chunks Scanned
                </span>
              )}
            </div>

            {isProcessingChunk && (
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[10px] font-mono text-[#00d4ff] animate-pulse">
                <Activity size={12} className="animate-spin" />
                Analyzing 3s Chunk...
              </div>
            )}
          </div>

          {/* Real-time Verdict Bar & Guidance */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Spoof Probability Meter */}
            <div className="sm:col-span-5 p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-slate-400">Live AI Spoof Score</span>
                <span
                  className={`text-sm font-mono font-bold ${
                    currentScore?.fake_score > 0.75
                      ? 'text-rose-400'
                      : currentScore?.fake_score > 0.5
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {currentScore ? `${(currentScore.fake_score * 100).toFixed(1)}%` : '--%'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden border border-white/10 flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentScore?.fake_score > 0.75
                      ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                      : currentScore?.fake_score > 0.5
                      ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                  }`}
                  style={{ width: `${currentScore ? currentScore.fake_score * 100 : 0}%` }}
                />
              </div>

              {/* Mini Sparkline of rolling chunks */}
              {rollingScores.length > 0 && (
                <div className="mt-3 flex items-end gap-1 h-6">
                  {rollingScores.map((score, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm transition-all ${
                        score > 0.75 ? 'bg-rose-500' : score > 0.5 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ height: `${Math.max(15, score * 100)}%` }}
                      title={`Chunk ${idx + 1}: ${(score * 100).toFixed(0)}%`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Guidance & Conclusion narrative */}
            <div className="sm:col-span-7 p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/5 text-[#00d4ff] shrink-0 mt-0.5">
                <Info size={16} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono uppercase text-[#00d4ff] tracking-wider block mb-0.5">
                  Real-Time Call Guidance
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{guidanceMessage}</p>
              </div>
            </div>
          </div>

          {/* Big Action Button (Optimized for Android Touch) */}
          <div className="pt-2">
            {!isActive ? (
              <Button
                variant="primary"
                size="lg"
                icon={PhoneCall}
                onClick={startLiveShield}
                className="w-full py-4 text-base font-bold shadow-[0_0_25px_rgba(0,212,255,0.3)] bg-gradient-to-r from-[#00d4ff] to-[#00f5d4] text-slate-950 hover:brightness-110"
              >
                Activate Live Call Shield
              </Button>
            ) : (
              <Button
                variant="danger"
                size="lg"
                icon={PhoneOff}
                onClick={stopLiveShield}
                className="w-full py-4 text-base font-bold shadow-[0_0_25px_rgba(244,63,94,0.3)]"
              >
                Deactivate & End Call Monitoring
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
