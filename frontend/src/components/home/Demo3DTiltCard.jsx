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
  Layers,
  RotateCw,
  CheckCircle2,
  FileAudio
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function Demo3DTiltCard({ user }) {
  const cardRef = useRef(null);

  // 3D Tilt Mouse tracking state
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // Demo Walkthrough Step State
  const [activeStep, setActiveStep] = useState(1);
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);

  // Auto-play demo step rotation when user is not actively clicking
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

    // Normalizing between -1 and 1
    const normX = (mouseX - centerX) / centerX;
    const normY = (mouseY - centerY) / centerY;

    // Maximum tilt angles in degrees
    const maxTilt = 12;
    setRotateX(-normY * maxTilt);
    setRotateY(normX * maxTilt);

    // Glare coordinates (in percent)
    setGlarePos({
      x: (mouseX / rect.width) * 100,
      y: (mouseY / rect.height) * 100
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

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
      subtitle: 'Wav2Vec2 Inference',
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
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 my-10 sm:my-16 [perspective:1400px] overflow-hidden">
      {/* Outer 3D Tilt Card Container */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${
            isHovered ? 'scale3d(1.015, 1.015, 1.015)' : 'scale3d(1, 1, 1)'
          }`,
          transformStyle: 'preserve-3d',
          transition: isHovered
            ? 'transform 0.12s cubic-bezier(0.2, 0, 0.2, 1)'
            : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        className="relative rounded-3xl p-1 bg-gradient-to-br from-[#00d4ff]/35 via-[#00d4ff]/10 to-[#a855f7]/35 shadow-[0_25px_60px_-15px_rgba(0,212,255,0.2)] cursor-pointer group"
      >
        {/* Dynamic Specular Holographic Glare Overlay (Subtle Cyber Sheen, No Harsh White Wash) */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300 z-10"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(circle 380px at ${glarePos.x}% ${glarePos.y}%, rgba(0, 212, 255, 0.08), rgba(168, 85, 247, 0.04) 45%, transparent 70%)`
          }}
        />

        {/* Card Body */}
        <div className="relative bg-[#0b0d14]/95 backdrop-blur-2xl rounded-[22px] p-4 sm:p-10 border border-white/[0.08] overflow-hidden flex flex-col gap-6 [transform-style:preserve-3d]">
          {/* Top Header Layer [Depth +30px] */}
          <div
            style={{ transform: 'translateZ(30px)' }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="cyan" size="sm" icon={Sparkles}>
                  Interactive 3D Walkthrough
                </Badge>
                <span className="hidden sm:inline text-xs font-mono text-slate-500">
                  | Hover cursor anywhere to tilt 3D perspective
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
                How VoiceShield Works in Real Action
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Experience the 4-step pipeline: from live acoustic sampling to Wav2Vec2 neural
                phoneme analysis and situational threat categorization.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
                  isAutoPlaying
                    ? 'bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/40 shadow-[0_0_15px_rgba(0,212,255,0.3)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
                title="Toggle automated progression"
              >
                <RotateCw size={12} className={isAutoPlaying ? 'animate-spin' : ''} />
                <span>{isAutoPlaying ? 'Auto Tour: ON' : 'Auto Tour: OFF'}</span>
              </button>

              <Link to={user ? '/analyze' : '/login'}>
                <Button variant="primary" size="sm" icon={ArrowRight}>
                  Try It Live
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Step Navigator Tabs [Depth +45px] */}
          <div
            style={{ transform: 'translateZ(45px)' }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"
          >
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
                  className={`flex flex-col items-start p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00d4ff]/10 border-[#00d4ff]/60 shadow-[0_0_20px_rgba(0,212,255,0.2)] scale-[1.02]'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-cyan-500/5 hover:border-cyan-500/20 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isActive ? 'text-[#00d4ff]' : 'text-slate-400'
                      }`}
                    >
                      {s.title}
                    </span>
                    <Icon
                      size={15}
                      style={{ color: isActive ? s.color : '#94a3b8' }}
                      className={isActive ? 'scale-110 transition-transform' : ''}
                    />
                  </div>
                  <span className="text-[11px] text-slate-300 font-sans truncate w-full">
                    {s.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Interactive Demo Display Area [Depth +60px] */}
          <div
            style={{ transform: 'translateZ(60px)' }}
            className="bg-[#121622] rounded-2xl p-5 sm:p-7 border border-white/[0.08] min-h-[300px] flex flex-col justify-between relative shadow-inner"
          >
            <AnimatePresence mode="wait">
              {/* STEP 1: AUDIO CAPTURE / UPLOAD DEMO */}
              {activeStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-5 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] flex items-center justify-center">
                        <FileAudio size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          Sample Audio Ingestion: Dual Recording & File Support
                        </h4>
                        <span className="text-xs font-mono text-slate-400">
                          Raw PCM Buffer Normalization | 16,000 Hz Mono Resampling
                        </span>
                      </div>
                    </div>
                    <Badge variant="cyan" size="sm">
                      16.0 kHz WAV
                    </Badge>
                  </div>

                  {/* Audio Card Simulation */}
                  <div className="p-4 rounded-xl bg-[#0a0d16] border border-white/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white flex items-center gap-2 truncate">
                        <FileAudio size={14} className="text-[#00d4ff] shrink-0" />
                        <span className="truncate">ceo_urgent_fund_transfer_call.wav</span>
                      </span>
                      <span className="text-slate-400 shrink-0">00:06.40</span>
                    </div>

                    {/* Animated Equalizer Waveform */}
                    <div className="h-14 flex items-end justify-center gap-1.5 px-2 py-1 bg-[#121622] rounded-lg border border-white/5">
                      {[
                        20, 45, 60, 30, 80, 95, 40, 70, 85, 30, 65, 90, 75, 40, 85, 100, 65, 35,
                        90, 50, 75, 85, 30, 60, 95, 45, 70, 40
                      ].map((bar, idx) => (
                        <div
                          key={idx}
                          style={{
                            height: isPlayingAudio ? `${bar}%` : '20%',
                            transition: 'height 0.25s ease'
                          }}
                          className="flex-1 rounded-t bg-gradient-to-t from-[#00d4ff] to-[#a855f7] opacity-80"
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        className="flex items-center gap-2 text-xs font-mono text-[#00d4ff] hover:text-white transition-colors"
                      >
                        {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
                        <span>{isPlayingAudio ? 'Simulated Playback Active' : 'Paused Preview'}</span>
                      </button>
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Buffer Normalized & Silence Trimmed
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Users can either record live calls directly via high-fidelity in-browser microphone
                    encoding or upload any suspicious audio file (WAV, MP3, FLAC, OGG). The pipeline
                    automatically normalizes energy and downsamples to 16kHz for ML compatibility.
                  </p>
                </motion.div>
              )}

              {/* STEP 2: CALL CONTEXT & EXTORTION FLAGS DEMO */}
              {activeStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          Situational Call Context & Social Engineering Assessment
                        </h4>
                        <span className="text-xs font-mono text-slate-400">
                          Acoustics + Human Psychology Fraud Factors
                        </span>
                      </div>
                    </div>
                    <Badge variant="purple" size="sm">
                      Context Multipliers
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#0a0d16] border border-amber-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-white font-semibold">
                          Caller Identity
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                          UNVERIFIED
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Incoming call from spoofed VoIP number or unverified caller claiming executive
                        authority.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0a0d16] border border-rose-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-white font-semibold">
                          Urgency & Pressure
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300">
                          EXTREME
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Severe time limits imposed: "Must transfer immediately, lives or deals are on
                        the line."
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0a0d16] border border-rose-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-white font-semibold">
                          Sensitive Demands
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300">
                          WIRE $50,000
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Demands wire transfers, OTP authentication codes, or password credential resets.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Unlike naive acoustic-only tools, VoiceShield incorporates situational threat markers.
                    An AI voice that demands emergency fund transfers is immediately escalated into high or
                    critical alert states.
                  </p>
                </motion.div>
              )}

              {/* STEP 3: NEURAL ACOUSTIC SCAN DEMO */}
              {activeStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#a855f7]/10 text-[#a855f7] flex items-center justify-center">
                        <Cpu size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          Pretrained Wav2Vec2 Deepfake Acoustic Inference
                        </h4>
                        <span className="text-xs font-mono text-slate-400">
                          XLSR Transformer Embeddings | Neural Vocoder Phase Scan
                        </span>
                      </div>
                    </div>
                    <Badge variant="cyan" size="sm">
                      Real ML Model
                    </Badge>
                  </div>

                  {/* Neural Scan Radar / Diagnostic Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-[#0a0d16] border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-300">Vocoder Phase Artifacts:</span>
                        <span className="text-rose-400 font-bold">96.4% Anomalous</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 w-[96.4%]" />
                      </div>

                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-300">Phoneme Transition Jitter:</span>
                        <span className="text-rose-400 font-bold">94.1% Synthetic</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-rose-500 w-[94.1%]" />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#0a0d16] border border-white/10 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                          Acoustic Spectrogram Inspection
                        </span>
                        <p className="text-xs text-slate-300 leading-normal">
                          Synthetic neural voices leave microscopic spectral inconsistencies during
                          vowel-to-consonant formant transitions. Wav2Vec2 detects these artifacts in
                          fractions of a second.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-[#a855f7]">
                        <span className="w-2 h-2 rounded-full bg-[#a855f7] animate-ping" />
                        Forward Tensor Execution Complete
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    VoiceShield executes true forward-pass PyTorch inference against pretrained sequence
                    classification weights, ensuring real deterministic output rather than random simulation.
                  </p>
                </motion.div>
              )}

              {/* STEP 4: VERDICT & DEFENSE GUIDANCE DEMO */}
              {activeStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4 w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                        <ShieldAlert size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          Synthesized Threat Verdict & Tactical Defense Advisory
                        </h4>
                        <span className="text-xs font-mono text-slate-400">
                          Automated Actionable Security Guidance
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                      CRITICAL RISK ALERT
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/30 via-[#0a0d16] to-[#0a0d16] border border-rose-500/30 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                      <div>
                        <span className="text-xs font-mono text-slate-400 block">CLASSIFICATION VERDICT</span>
                        <span className="text-lg font-display font-extrabold text-rose-400">
                          AI GENERATED VOICE CLONE DETECTED (97.8%)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-slate-400 block">AUTHENTIC SPEECH PROBABILITY</span>
                        <span className="text-sm font-mono text-slate-300 font-bold">2.2% Genuine Human</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1.5 font-sans leading-relaxed">
                      <span className="font-mono text-rose-400 font-bold block uppercase text-[11px]">
                        DEFENSE ACTION PLAN:
                      </span>
                      <p>
                        1. <strong>Cease Communication:</strong> Do not wire funds, approve invoices, or
                        provide one-time passcodes (OTP).
                      </p>
                      <p>
                        2. <strong>Out-of-Band Callback:</strong> Reach out to the purported caller via a
                        pre-established, internal corporate channel or known personal phone number.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Results are automatically recorded in the encrypted Supabase database vault, tagged with
                    the file name, user email, and user ID, providing an immutable enterprise audit trail.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Controls / Next-Prev buttons [Depth +50px] */}
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 mt-2">
              <span className="text-xs font-mono text-slate-400">
                Step {activeStep} of 4: <span className="text-white">{steps[activeStep - 1].subtitle}</span>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
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
                  onClick={() => {
                    setActiveStep((prev) => (prev % 4) + 1);
                    setIsAutoPlaying(false);
                  }}
                  icon={ArrowRight}
                >
                  {activeStep === 4 ? 'Loop to Start' : 'Next Step'}
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Hint Pill [Depth +35px] */}
          <div
            style={{ transform: 'translateZ(35px)' }}
            className="flex items-center justify-center gap-2 text-xs font-mono text-slate-500 pt-1"
          >
            <Layers size={13} className="text-[#00d4ff]" />
            <span>Multi-layered 3D holographic tilt card &bull; Move mouse across surface</span>
          </div>
        </div>
      </div>
    </div>
  );
}
