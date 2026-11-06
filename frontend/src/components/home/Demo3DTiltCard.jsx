import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Cpu,
  AlertTriangle,
  ShieldAlert,
  Play,
  Pause,
  ArrowRight,
  Sparkles,
  RotateCw,
  CheckCircle2,
  FileAudio
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function Demo3DTiltCard({ user }) {
  const cardRef = useRef(null);

  // 3D Tilt Mouse tracking state (reduced angles for maximum text clarity)
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // Demo Walkthrough Step State
  const [activeStep, setActiveStep] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);

  // Auto-play demo step rotation
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev % 4) + 1);
    }, 3800);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const normX = (mouseX - centerX) / centerX;
    const normY = (mouseY - centerY) / centerY;

    // Controlled tilt angles (7 degrees) to preserve pixel-perfect text clarity
    const maxTilt = 7;
    setRotateX(-normY * maxTilt);
    setRotateY(normX * maxTilt);

    setGlarePos({
      x: (mouseX / rect.width) * 100,
      y: (mouseY / rect.height) * 100
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const steps = [
    {
      id: 1,
      title: '1. Ingestion',
      subtitle: 'Capture / Upload',
      icon: Mic,
      color: '#00d4ff'
    },
    {
      id: 2,
      title: '2. Call Context',
      subtitle: 'Extortion Flags',
      icon: AlertTriangle,
      color: '#f59e0b'
    },
    {
      id: 3,
      title: '3. Neural Scan',
      subtitle: 'VoiceShield Inference',
      icon: Cpu,
      color: '#a855f7'
    },
    {
      id: 4,
      title: '4. Defense Verdict',
      subtitle: 'Risk & Guidance',
      icon: ShieldAlert,
      color: '#f43f5e'
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 my-6 sm:my-8 [perspective:1200px]">
      {/* Outer 3D Tilt Card Container */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: isHovered
            ? 'transform 0.08s ease-out'
            : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
          WebkitFontSmoothing: 'antialiased',
          backfaceVisibility: 'hidden'
        }}
        className="relative rounded-2xl p-[1px] bg-gradient-to-br from-[#00d4ff]/40 via-white/10 to-[#a855f7]/40 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(0,212,255,0.15)] cursor-pointer group"
      >
        {/* Subtle Outer Border Glare */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-200"
          style={{
            opacity: isHovered ? 0.8 : 0,
            background: `radial-gradient(circle 260px at ${glarePos.x}% ${glarePos.y}%, rgba(0, 212, 255, 0.15), transparent 70%)`
          }}
        />

        {/* Card Body - Deep Solid Background for Razor-Sharp Text Contrast */}
        <div className="relative bg-[#0c101a] rounded-[15px] p-3.5 sm:p-5 border border-white/10 flex flex-col gap-3.5 overflow-hidden text-slate-100">
          {/* Top macOS-style Window Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              {/* 3 Mac Dots on Top Left */}
              <div className="flex items-center gap-1.5" aria-label="Window controls">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/60 shadow-sm inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/60 shadow-sm inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/60 shadow-sm inline-block" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 font-semibold tracking-wider uppercase">
                  VoiceShield Terminal
                </span>
                <Badge variant="cyan" size="sm" icon={Sparkles} className="py-0 px-2 text-[10px]">
                  Interactive Demo
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                  isAutoPlaying
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/40 shadow-[0_0_10px_rgba(0,212,255,0.25)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Toggle automated tour"
              >
                <RotateCw size={10} className={isAutoPlaying ? 'animate-spin' : ''} />
                <span>{isAutoPlaying ? 'Auto: ON' : 'Auto'}</span>
              </button>

              <Link to={user ? '/analyze' : '/login'}>
                <Button variant="primary" size="sm" icon={ArrowRight} className="py-1 px-2.5 text-xs h-7">
                  Try Live
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Step Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveStep(s.id);
                    setIsAutoPlaying(false);
                  }}
                  className={`flex flex-col items-start p-2 sm:p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00d4ff]/15 border-[#00d4ff]/70 text-white shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        isActive ? 'text-[#00f5d4]' : 'text-slate-400'
                      }`}
                    >
                      {s.title}
                    </span>
                    <Icon
                      size={13}
                      style={{ color: isActive ? s.color : '#94a3b8' }}
                      className={isActive ? 'scale-110 transition-transform' : ''}
                    />
                  </div>
                  <span className="text-[10px] text-slate-300 font-sans truncate w-full">
                    {s.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Interactive Demo Display Area */}
          <div className="bg-[#121724] rounded-xl p-3.5 sm:p-4 border border-white/[0.08] min-h-[210px] flex flex-col justify-between relative shadow-inner">
            <AnimatePresence mode="wait">
              {/* STEP 1: AUDIO CAPTURE / UPLOAD DEMO */}
              {activeStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#00d4ff]/10 text-[#00d4ff] flex items-center justify-center shrink-0">
                        <FileAudio size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Sample Audio Ingestion: Dual Recording & File Upload
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          16,000 Hz Mono Resampling &bull; Raw PCM Buffer Normalization
                        </span>
                      </div>
                    </div>
                    <Badge variant="cyan" size="sm" className="py-0 px-2 text-[10px] shrink-0">
                      16 kHz WAV
                    </Badge>
                  </div>

                  {/* Audio Card Simulation */}
                  <div className="p-3 rounded-lg bg-[#0a0e17] border border-white/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-white flex items-center gap-1.5 truncate">
                        <FileAudio size={13} className="text-[#00d4ff] shrink-0" />
                        <span className="truncate">ceo_emergency_fund_transfer.wav</span>
                      </span>
                      <span className="text-slate-400 shrink-0">00:06.40</span>
                    </div>

                    {/* Animated Equalizer Waveform */}
                    <div className="h-10 flex items-end justify-center gap-1 px-2 py-1 bg-[#121622] rounded border border-white/5">
                      {[
                        20, 45, 60, 30, 80, 95, 40, 70, 85, 30, 65, 90, 75, 40, 85, 100, 65, 35,
                        90, 50, 75, 85, 30, 60, 95, 45, 70, 40
                      ].map((bar, idx) => (
                        <div
                          key={idx}
                          style={{
                            height: isPlayingAudio ? `${bar}%` : '20%',
                            transition: 'height 0.2s ease'
                          }}
                          className="flex-1 rounded-t bg-gradient-to-t from-[#00d4ff] to-[#a855f7] opacity-85"
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        className="flex items-center gap-1.5 text-[11px] font-mono text-[#00f5d4] hover:text-white transition-colors"
                      >
                        {isPlayingAudio ? <Pause size={12} /> : <Play size={12} />}
                        <span>{isPlayingAudio ? 'Playback Active' : 'Paused'}</span>
                      </button>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Buffer Normalized
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    Record live calls directly via in-browser microphone encoding or upload audio (WAV, MP3, FLAC, OGG). The pipeline automatically normalizes energy and downsamples for model inference.
                  </p>
                </motion.div>
              )}

              {/* STEP 2: CALL CONTEXT & EXTORTION FLAGS DEMO */}
              {activeStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2.5 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                        <AlertTriangle size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Situational Call Context & Extortion Risk Assessment
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          Acoustics combined with psychological fraud factors
                        </span>
                      </div>
                    </div>
                    <Badge variant="purple" size="sm" className="py-0 px-2 text-[10px] shrink-0">
                      Threat Multipliers
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-lg bg-[#0a0e17] border border-amber-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono text-white font-semibold">Caller Identity</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300">
                          UNVERIFIED
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight">
                        Spoofed VoIP number or unverified caller claiming executive authority.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0a0e17] border border-rose-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono text-white font-semibold">Urgency & Pressure</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300">
                          EXTREME
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight">
                        Severe time limits imposed: "Must transfer immediately, deals on the line."
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0a0e17] border border-rose-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-mono text-white font-semibold">Sensitive Demands</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300">
                          WIRE FUNDS
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 leading-tight">
                        Demands emergency wire transfers, OTP authentication codes, or password resets.
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    Unlike naive acoustic-only tools, VoiceShield incorporates situational threat markers to escalate fraud alerts immediately when high-risk extortion patterns occur.
                  </p>
                </motion.div>
              )}

              {/* STEP 3: NEURAL ACOUSTIC SCAN DEMO */}
              {activeStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2.5 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#a855f7]/10 text-[#a855f7] flex items-center justify-center shrink-0">
                        <Cpu size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          VoiceShield v3 Deepfake Acoustic Inference
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          XLSR Transformer Embeddings &bull; Neural Vocoder Phase Scan
                        </span>
                      </div>
                    </div>
                    <Badge variant="cyan" size="sm" className="py-0 px-2 text-[10px] shrink-0">
                      Real ML Model
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-[#0a0e17] border border-white/10 space-y-2">
                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-slate-300">Vocoder Phase Artifacts:</span>
                        <span className="text-rose-400 font-bold">96.4% Anomalous</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 w-[96.4%]" />
                      </div>

                      <div className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-slate-300">Phoneme Transition Jitter:</span>
                        <span className="text-rose-400 font-bold">94.1% Synthetic</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 w-[94.1%]" />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0a0e17] border border-white/10 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                          Acoustic Spectrogram Inspection
                        </span>
                        <p className="text-[11px] text-slate-300 leading-tight">
                          Synthetic neural voices leave spectral phase inconsistencies during phoneme transitions. VoiceShield detects these artifacts in fractions of a second.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-[#a855f7]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-ping" />
                        Forward Tensor Execution Complete
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    VoiceShield executes true forward-pass PyTorch inference against pretrained sequence classification weights for deterministic authenticity metrics.
                  </p>
                </motion.div>
              )}

              {/* STEP 4: VERDICT & DEFENSE GUIDANCE DEMO */}
              {activeStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2.5 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                        <ShieldAlert size={14} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Synthesized Threat Verdict & Tactical Advisory
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          Automated Actionable Security Guidance
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      CRITICAL RISK ALERT
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-to-r from-rose-950/30 via-[#0a0e17] to-[#0a0e17] border border-rose-500/30 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/[0.08] pb-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">CLASSIFICATION VERDICT</span>
                        <span className="text-sm sm:text-base font-display font-extrabold text-rose-400">
                          AI GENERATED VOICE CLONE (97.8%)
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-mono text-slate-400 block">AUTHENTIC SPEECH</span>
                        <span className="text-xs font-mono text-slate-300 font-bold">2.2% Genuine</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1 font-sans leading-tight">
                      <span className="font-mono text-rose-400 font-bold block uppercase text-[10px]">
                        DEFENSE ACTION PLAN:
                      </span>
                      <p>
                        1. <strong>Cease Communication:</strong> Do not wire funds or provide one-time passcodes (OTP).
                      </p>
                      <p>
                        2. <strong>Out-of-Band Callback:</strong> Reach out via pre-established internal corporate channels.
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    Results are logged with audit metadata, tagged with file name and user ID for forensic traceability.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-2.5 mt-1">
              <span className="text-[11px] font-mono text-slate-400">
                Step {activeStep} of 4: <span className="text-white font-semibold">{steps[activeStep - 1].subtitle}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="py-1 px-2.5 text-xs h-7"
                  onClick={() => {
                    setActiveStep((prev) => (prev === 1 ? 4 : prev - 1));
                    setIsAutoPlaying(false);
                  }}
                >
                  Previous
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  className="py-1 px-2.5 text-xs h-7"
                  onClick={() => {
                    setActiveStep((prev) => (prev % 4) + 1);
                    setIsAutoPlaying(false);
                  }}
                  icon={ArrowRight}
                >
                  {activeStep === 4 ? 'Restart' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
