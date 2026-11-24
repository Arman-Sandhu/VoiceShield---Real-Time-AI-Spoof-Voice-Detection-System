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
  Download,
  FileAudio,
  FileText,
  X,
  CheckCircle2,
  Globe
} from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';
import api from '../../services/api';
import { encodeWAV } from '../../utils/wavEncoder';

function downsampleTo16k(inputBuffer, inputSampleRate) {
  if (inputSampleRate === 16000) return inputBuffer;
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;
  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < inputBuffer.length; i++) {
      accum += inputBuffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return result;
}

export default function LiveCallShield({ user, username }) {
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
  const [detectedLanguage, setDetectedLanguage] = useState('English');
  const [guidanceMessage, setGuidanceMessage] = useState(
    'Live Call Shield is ready. Activate to start real-time call protection.'
  );

  const [sessionCompleted, setSessionCompleted] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const pcmBuffer16kRef = useRef([]);
  const fullSessionPcmRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const chunkIntervalRef = useRef(null);
  const alertAudioCtxRef = useRef(null);
  const vibrationIntervalRef = useRef(null);

  const consecutiveAiRef = useRef(0);
  const consecutiveHumanRef = useRef(0);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (typeof window !== 'undefined') {
      if (window.Capacitor?.Plugins?.ContinuousVibrator?.stopContinuousVibration) {
        window.Capacitor.Plugins.ContinuousVibrator.stopContinuousVibration().catch(() => {});
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    }
  }, []);

  const startContinuousVibration = useCallback(() => {
    if (!vibrateEnabled) return;
    stopVibration();

    if (typeof window !== 'undefined') {
      if (window.Capacitor?.Plugins?.ContinuousVibrator?.startContinuousVibration) {
        window.Capacitor.Plugins.ContinuousVibrator.startContinuousVibration().catch(() => {});
      }
      if ('vibrate' in navigator) {
        navigator.vibrate([250, 150]);
        vibrationIntervalRef.current = setInterval(() => {
          navigator.vibrate([250, 150]);
        }, 400);
      }
    }
  }, [vibrateEnabled, stopVibration]);

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
      console.warn('Audio warning sound error:', e);
    }
  }, [soundEnabled]);

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

  const processCurrentChunk = async () => {
    if (pcmBuffer16kRef.current.length < 16000) return;

    const samples = pcmBuffer16kRef.current.slice(-48000);
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

      if (data.detected_language) {
        setDetectedLanguage(data.detected_language);
      }

      if (data.fake_score >= 0.65) {
        consecutiveAiRef.current += 1;
        consecutiveHumanRef.current = 0;
      } else if (data.fake_score < 0.50) {
        consecutiveHumanRef.current += 1;
        consecutiveAiRef.current = 0;
      }

      const shouldTriggerAlert = (consecutiveAiRef.current >= 2) || (data.fake_score >= 0.85);
      const shouldClearAlert = (consecutiveHumanRef.current >= 2);

      if (shouldTriggerAlert) {
        setActiveAlert({
          level: data.fake_score >= 0.75 ? 'CRITICAL' : 'CAUTION',
          score: data.fake_score,
          recommendation: data.recommendation,
          time: new Date().toLocaleTimeString()
        });
        playAlertBeep(data.fake_score >= 0.75);
        startContinuousVibration();
        setGuidanceMessage(data.recommendation);
      } else if (shouldClearAlert) {
        setActiveAlert(null);
        stopVibration();
        setGuidanceMessage(
          `Authentic human speech confirmed (${(data.fake_score * 100).toFixed(1)}% spoof score). Normal conversation.`
        );
      } else if (data.prediction === 'INCONCLUSIVE') {
        setGuidanceMessage(data.recommendation);
      }
    } catch (err) {
      console.error('Live chunk inference error:', err);
    } finally {
      setIsProcessingChunk(false);
    }
  };

  const startLiveShield = async () => {
    try {
      setSessionCompleted(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      mediaStreamRef.current = stream;
      setAudioStream(stream);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      pcmBuffer16kRef.current = [];
      fullSessionPcmRef.current = [];
      consecutiveAiRef.current = 0;
      consecutiveHumanRef.current = 0;

      const nativeSampleRate = audioCtx.sampleRate;

      processor.onaudioprocess = (e) => {
        const rawInput = e.inputBuffer.getChannelData(0);
        const resampled16k = downsampleTo16k(rawInput, nativeSampleRate);

        for (let i = 0; i < resampled16k.length; i++) {
          pcmBuffer16kRef.current.push(resampled16k[i]);
          fullSessionPcmRef.current.push(resampled16k[i]);
        }
        if (pcmBuffer16kRef.current.length > 96000) {
          pcmBuffer16kRef.current = pcmBuffer16kRef.current.slice(-96000);
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
      setGuidanceMessage('Listening to live call audio at calibrated 16kHz sample rate...');

      chunkIntervalRef.current = setInterval(() => {
        processCurrentChunk();
      }, 2500);
    } catch (err) {
      setGuidanceMessage('Microphone access denied. Please grant microphone permission to enable Live Call Shield.');
    }
  };

  const stopLiveShield = async () => {
    setIsActive(false);
    stopVibration();
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

    const totalSamples = fullSessionPcmRef.current.length;
    if (totalSamples >= 16000) {
      const fullWavBlob = encodeWAV(fullSessionPcmRef.current, 16000);
      const sessionFile = new File(
        [fullWavBlob],
        `VoiceShield_LiveCall_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`,
        { type: 'audio/wav' }
      );

      const peakScore = rollingScores.length > 0 ? Math.max(...rollingScores) : 0.05;
      const avgScore = rollingScores.length > 0 ? rollingScores.reduce((a, b) => a + b, 0) / rollingScores.length : 0.05;
      const finalVerdict = peakScore >= 0.65 ? 'AI_GENERATED' : 'HUMAN_SPEECH';

      const sessionSummary = {
        duration: callDuration,
        chunks: chunksAnalyzed,
        peakFakeScore: peakScore,
        avgFakeScore: avgScore,
        prediction: finalVerdict,
        detectedLanguage,
        wavBlob: fullWavBlob,
        fileName: sessionFile.name,
        timestamp: new Date().toISOString()
      };
      setSessionCompleted(sessionSummary);

      try {
        const formData = new FormData();
        formData.append('file', sessionFile);
        formData.append('custom_file_name', sessionFile.name);
        formData.append('mode', 'live_call');
        formData.append('is_caller_unknown', 'false');
        formData.append('is_sensitive_request', 'false');
        formData.append('urgency_flag', 'false');
        const effectiveName = username || user?.displayName || '';
        if (effectiveName) formData.append('username', effectiveName);

        await api.post('/analyze-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (err) {
        console.warn('Live call history auto-save notice:', err);
      }
    }

    pcmBuffer16kRef.current = [];
    setGuidanceMessage('Live Call Shield session concluded. Audit record stored in history.');
  };

  useEffect(() => {
    return () => {
      stopVibration();
      stopLiveShield();
    };
  }, []);

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const handleDownloadCallAudio = () => {
    if (!sessionCompleted?.wavBlob) return;
    const url = URL.createObjectURL(sessionCompleted.wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sessionCompleted.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCallReport = () => {
    if (!sessionCompleted) return;
    const reportData = {
      service: 'VoiceShield Live Call Forensics',
      sessionTimestamp: sessionCompleted.timestamp,
      durationSeconds: sessionCompleted.duration,
      scannedWindowsCount: sessionCompleted.chunks,
      overallVerdict: sessionCompleted.prediction,
      peakSpoofProbability: `${(sessionCompleted.peakFakeScore * 100).toFixed(2)}%`,
      averageSpoofProbability: `${(sessionCompleted.avgFakeScore * 100).toFixed(2)}%`,
      primaryLanguage: sessionCompleted.detectedLanguage,
      fileName: sessionCompleted.fileName,
      rollingScoreHistory: rollingScores
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VoiceShield_Report_${sessionCompleted.fileName.replace('.wav', '.json')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDismissAlert = () => {
    setActiveAlert(null);
    stopVibration();
    consecutiveAiRef.current = 0;
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 shadow-2xl relative overflow-hidden ${
              activeAlert.level === 'CRITICAL'
                ? 'bg-gradient-to-r from-rose-950 via-rose-900/90 to-red-950 border-rose-500 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.45)]'
                : 'bg-gradient-to-r from-amber-950 via-amber-900/90 to-yellow-950 border-amber-500 text-amber-100 shadow-[0_0_35px_rgba(245,158,11,0.4)]'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  activeAlert.level === 'CRITICAL' ? 'bg-rose-500/30 text-rose-300' : 'bg-amber-500/30 text-amber-300'
                }`}
              >
                <ShieldAlert size={28} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded bg-black/50 font-bold border border-white/20">
                    {activeAlert.level} SPOOF ALERT
                  </span>
                  <span className="text-xs font-mono opacity-80">{activeAlert.time}</span>
                </div>
                <h4 className="text-base font-display font-extrabold text-white mb-0.5">
                  Synthetic AI Voice Impersonation Detected!
                </h4>
                <p className="text-xs leading-relaxed opacity-95">{activeAlert.recommendation}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissAlert}
              className="px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 text-xs font-mono font-semibold text-white shrink-0 transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card variant="elevated" className="p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00d4ff]/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#00f5d4]/15 border-[#00f5d4]/50 text-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.35)]'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Radio size={22} className={isActive ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-display font-bold text-white">
                    Live Call Shield
                  </h3>
                  <Badge variant={isActive ? 'cyan' : 'ghost'} size="sm">
                    {isActive ? 'MONITORING CALL' : 'STANDBY'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Calibrated 16kHz DSP &bull; Continuous Repeating Haptics &bull; In-Call Anti-Spoof
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Globe size={13} className="text-[#00d4ff]" />
                <span>{detectedLanguage}</span>
              </span>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                  soundEnabled
                    ? 'bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
                title="Toggle Alert Beep"
              >
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span className="hidden sm:inline">Sound</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextState = !vibrateEnabled;
                  setVibrateEnabled(nextState);
                  if (!nextState) stopVibration();
                }}
                className={`p-2 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                  vibrateEnabled
                    ? 'bg-[#a855f7]/15 border-[#a855f7]/40 text-[#a855f7]'
                    : 'bg-white/5 border-white/10 text-slate-500'
                }`}
                title="Toggle Continuous Android Vibration"
              >
                <Vibrate size={15} />
                <span className="hidden sm:inline">Haptics</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Call Elapsed Time</span>
              <span className="text-base font-mono font-bold text-white tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00f5d4] animate-ping' : 'bg-slate-600'}`} />
                {formatSeconds(callDuration)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Windows Processed</span>
              <span className="text-base font-mono font-bold text-[#00d4ff]">
                {chunksAnalyzed} <span className="text-xs font-normal text-slate-400">scans</span>
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Current Threat Verdict</span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                  activeAlert
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : currentScore?.fake_score > 0.5
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.25)]'
                }`}
              >
                {activeAlert ? '🚨 AI SPOOF DETECTED' : isActive ? '🛡️ HUMAN SPEECH' : 'STANDBY'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#04080d] p-3 overflow-hidden shadow-inner relative">
            <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-white/5 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00f5d4] animate-pulse' : 'bg-slate-600'}`} />
                {isActive ? 'Acoustic Signal Stream (16,000 Hz Monitored)' : 'Audio Hardware Offline'}
              </span>
              <span>{isActive ? `${detectedLanguage} Active` : 'Waiting for Call'}</span>
            </div>

            <AudioWaveformVisualizer
              stream={audioStream}
              isRecording={isActive}
              height={110}
              showGrid={true}
            />

            {isProcessingChunk && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/80 border border-[#00d4ff]/40 text-[10px] font-mono text-[#00d4ff] shadow-lg animate-pulse">
                <Activity size={12} className="animate-spin" />
                Analyzing 3s Audio Window...
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-5 p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-slate-400">Live AI Spoof Score</span>
                <span
                  className={`text-sm font-mono font-bold ${
                    currentScore?.fake_score >= 0.65
                      ? 'text-rose-400'
                      : currentScore?.fake_score >= 0.50
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {currentScore ? `${(currentScore.fake_score * 100).toFixed(1)}%` : '--%'}
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden border border-white/10 flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentScore?.fake_score >= 0.65
                      ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                      : currentScore?.fake_score >= 0.50
                      ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                  }`}
                  style={{ width: `${currentScore ? currentScore.fake_score * 100 : 0}%` }}
                />
              </div>

              {rollingScores.length > 0 && (
                <div className="mt-3 flex items-end gap-1 h-6">
                  {rollingScores.map((score, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 rounded-sm transition-all ${
                        score >= 0.65 ? 'bg-rose-500' : score >= 0.50 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ height: `${Math.max(15, score * 100)}%` }}
                      title={`Window ${idx + 1}: ${(score * 100).toFixed(0)}%`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-7 p-4 rounded-xl bg-[#0f1117] border border-white/[0.08] flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/5 text-[#00d4ff] shrink-0 mt-0.5">
                <Activity size={16} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono uppercase text-[#00d4ff] tracking-wider block mb-0.5">
                  Real-Time Call Telemetry Guidance
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{guidanceMessage}</p>
              </div>
            </div>
          </div>

          {sessionCompleted && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#00d4ff]/10 via-[#0f1117] to-[#a855f7]/10 border border-[#00d4ff]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-wider block mb-1">
                  LAST SESSION COMPLETE & SAVED TO HISTORY
                </span>
                <h4 className="text-sm font-display font-bold text-white">
                  Call Record: {sessionCompleted.duration}s &bull; Peak AI Score: {(sessionCompleted.peakFakeScore * 100).toFixed(1)}% ({sessionCompleted.prediction})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FileAudio}
                  onClick={handleDownloadCallAudio}
                >
                  Download Audio
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={handleDownloadCallReport}
                >
                  Download Report
                </Button>
              </div>
            </div>
          )}

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
