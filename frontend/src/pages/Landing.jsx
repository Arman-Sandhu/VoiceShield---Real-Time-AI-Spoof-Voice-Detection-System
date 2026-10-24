import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Mic,
  Cpu,
  Lock,
  ArrowRight,
  AlertTriangle,
  Database,
  Radio,
  Server
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Demo3DTiltCard from '../components/home/Demo3DTiltCard';

export default function Landing({ user }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 flex flex-col items-center text-center">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#00d4ff]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <Badge variant="cyan" size="lg" icon={ShieldCheck}>
              Next-Gen Voice Biometric Security
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-white leading-[1.15] mb-4"
          >
            VoiceShield{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4ff] via-[#38bdf8] to-[#a855f7]">
              — AI Spoof Voice Detection System
            </span>
          </motion.h1>

          <motion.h2
            variants={itemVariants}
            className="text-lg sm:text-2xl font-display font-semibold text-slate-200 tracking-wide mb-6"
          >
            Detect the Voice.{' '}
            <span className="text-[#00d4ff]">Defend the Truth.</span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mb-10"
          >
            AI-powered voice authenticity analysis designed to identify potentially synthetic speech
            and assess suspicious call scenarios in near-real-time.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
            <Link to={user ? '/analyze' : '/login'}>
              <Button size="lg" variant="primary" icon={ArrowRight}>
                {user ? 'Launch Analysis Workspace' : 'Get Started Now'}
              </Button>
            </Link>

            <a href="#technology">
              <Button size="lg" variant="secondary" icon={Cpu}>
                Explore Technology
              </Button>
            </a>
          </motion.div>

          {/* Abstract Waveform Preview Card */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-3xl mt-16 p-1 rounded-3xl bg-gradient-to-r from-[#00d4ff]/30 via-white/10 to-[#a855f7]/30 shadow-2xl"
          >
            <div className="bg-[#0f1117] rounded-[22px] p-6 sm:p-8 border border-white/[0.08] backdrop-blur-2xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  SPECTRAL ACOUSTIC SENSING ACTIVE
                </span>
                <span className="text-[#00d4ff]">16,000 Hz / Wav2Vec2-XLSR</span>
              </div>

              {/* Decorative Audio Frequency Bars */}
              <div className="w-full h-24 flex items-end justify-center gap-1.5 sm:gap-2 px-4 py-2">
                {[
                  15, 30, 45, 20, 65, 85, 40, 95, 70, 35, 60, 80, 100, 75, 50, 90, 65, 30,
                  85, 45, 95, 60, 40, 75, 90, 50, 30, 70, 85, 40, 60, 25, 45, 20
                ].map((val, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ height: 10 }}
                    animate={{
                      height: [`${val}%`, `${Math.max(15, (val * 1.3) % 100)}%`, `${val}%`]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.6 + (idx % 5) * 0.2,
                      ease: 'easeInOut'
                    }}
                    className="w-2 rounded-t bg-gradient-to-t from-[#00d4ff] to-[#a855f7] opacity-85"
                  />
                ))}
              </div>

              <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/[0.08] text-left text-xs font-mono text-slate-300">
                <div>
                  <span className="text-slate-500 block">DETECTION ENGINE</span>
                  <span className="text-white font-semibold">Pretrained Wav2Vec2</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TARGET DOMAIN</span>
                  <span className="text-[#00d4ff] font-semibold">English Speech Audio</span>
                </div>
                <div>
                  <span className="text-slate-500 block">EVALUATION</span>
                  <span className="text-emerald-400 font-semibold">Deterministic Threat Engine</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* 3D Tilt Card: Interactive Demo of Application (Task 2) */}
      {/* Placed below SPECTRAL ACOUSTIC SENSING ACTIVE and above core capabilities */}
      <section className="w-full flex justify-center py-4">
        <Demo3DTiltCard user={user} />
      </section>

      {/* Feature Grid: Core Capabilities */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="purple" size="md">Core Capabilities</Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mt-3 mb-4">
            Defending Trust Against Synthetic Audio Threats
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            VoiceShield integrates deep acoustic neural feature extraction with situational call intelligence to counter AI voice cloning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card variant="default" className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] mb-6 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
              <Cpu size={24} />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              Neural Deepfake Detection
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Utilizes Wav2Vec2 sequence classification to analyze acoustic phoneme subtleties, vocoder artifacts, and synthetic phase anomalies in speech audio.
            </p>
          </Card>

          <Card variant="default" className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center text-[#a855f7] mb-6 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              Contextual Threat Engine
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Separates objective acoustic probability from situational extortion tactics (urgency, unverified numbers, and credential demands) to produce clear risk categories.
            </p>
          </Card>

          <Card variant="default" className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              Zero-Trust Audit Vault
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Cryptographically verified Firebase ID tokens and Supabase PostgreSQL backend enforce strict user isolation for all historical analysis records.
            </p>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge variant="cyan" size="md">Workflow Architecture</Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mt-3 mb-4">
            How VoiceShield Operates
          </h2>
          <p className="text-slate-400 text-sm">
            Three streamlined steps to analyze call authenticity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-[#0f1117] border border-white/[0.08] relative">
            <span className="text-4xl font-display font-black text-[#00d4ff]/20 absolute top-4 right-6">
              01
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00d4ff] mb-4">
              <Mic size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Capture or Upload</h4>
            <p className="text-sm text-slate-400">
              Record live speech directly through the browser with native 16kHz WAV encoding or upload recorded audio files (WAV, MP3, FLAC).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f1117] border border-white/[0.08] relative">
            <span className="text-4xl font-display font-black text-[#a855f7]/20 absolute top-4 right-6">
              02
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#a855f7] mb-4">
              <Radio size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Neural Inference</h4>
            <p className="text-sm text-slate-400">
              FastAPI backend resamples to 16kHz mono, trims silence, and performs real forward-pass inference on the pretrained deepfake detection model.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f1117] border border-white/[0.08] relative">
            <span className="text-4xl font-display font-black text-emerald-500/20 absolute top-4 right-6">
              03
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Risk Synthesis</h4>
            <p className="text-sm text-slate-400">
              Model probability scores are synthesized with contextual threat flags to output actionable guidance (Low, Medium, High, or Critical threat).
            </p>
          </div>
        </div>
      </section>

      {/* Engineering Specifications (Task 5: Structured similar to Core Capabilities) */}
      <section id="technology" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="cyan" size="md">Engineering Specifications</Badge>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mt-3 mb-4">
            System Architecture & ML Pipeline
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Built with production-grade engineering principles, strictly avoiding simulated mock outputs, synthetic probability fabrications, or client-side trust assumptions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card variant="default" className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff] mb-6 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
              <Cpu size={24} />
            </div>
            <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider mb-1 block">
              Acoustic Classifier
            </span>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              Wav2Vec2 Sequence Model
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-1">
              MelodyMachine V2 (94.5M parameters). Fine-tuned cross-lingual speech representation trained on genuine and vocoded spoof audio.
            </p>
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Sample Rate</span>
              <span className="text-[#00d4ff] font-medium">16 kHz Mono</span>
            </div>
          </Card>

          <Card variant="default" className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center text-[#a855f7] mb-6 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Server size={24} />
            </div>
            <span className="text-xs font-mono text-[#a855f7] uppercase tracking-wider mb-1 block">
              Backend Engine
            </span>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              FastAPI + PyTorch
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-1">
              High-throughput async execution pipeline with automated CUDA GPU / CPU sensing, RMS silence trimming, and fast tensor inference.
            </p>
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Compute</span>
              <span className="text-[#a855f7] font-medium">CUDA / Torch CPU</span>
            </div>
          </Card>

          <Card variant="default" className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <ShieldCheck size={24} />
            </div>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1 block">
              Authentication
            </span>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              Firebase Bearer Tokens
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-1">
              Zero-trust identity verification via cryptographic JWT tokens. Subspace boundaries isolate user telemetry and audio records.
            </p>
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Protocol</span>
              <span className="text-emerald-400 font-medium">RS256 JWT</span>
            </div>
          </Card>

          <Card variant="default" className="flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Database size={24} />
            </div>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-1 block">
              Audit Persistence
            </span>
            <h3 className="text-xl font-display font-bold text-white mb-2">
              Supabase / SQLite Fallback
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed flex-1">
              Encrypted cloud PostgreSQL storage with RLS policies and instant, zero-downtime offline fallback to local SQLite database.
            </p>
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Resilience</span>
              <span className="text-amber-400 font-medium">Zero-Downtime</span>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
