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
  CheckCircle2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';

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
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 flex flex-col items-center text-center">
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

      {/* Feature Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
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

      {/* Technology Specs Section */}
      <section id="technology" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-white/[0.08]">
        <div className="bg-[#0f1117]/90 rounded-3xl border border-white/[0.1] p-8 sm:p-12 backdrop-blur-xl">
          <div className="max-w-3xl mb-10">
            <Badge variant="cyan" size="md">Engineering Specifications</Badge>
            <h2 className="text-3xl font-display font-bold text-white mt-3 mb-4">
              System Architecture & ML Pipeline
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Built with production-grade engineering principles, strictly avoiding simulated mock outputs, synthetic probability fabrications, or client-side trust assumptions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#161b27]/80 border border-white/[0.06]">
              <span className="text-xs font-mono text-slate-400 block mb-1">ACOUSTIC CLASSIFIER</span>
              <span className="text-white font-semibold block text-base">Wav2Vec2 Sequence Model</span>
              <span className="text-xs text-[#00d4ff] font-mono mt-2 block">MelodyMachine V2 (94.5M params)</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#161b27]/80 border border-white/[0.06]">
              <span className="text-xs font-mono text-slate-400 block mb-1">BACKEND ENGINE</span>
              <span className="text-white font-semibold block text-base">FastAPI + PyTorch</span>
              <span className="text-xs text-[#a855f7] font-mono mt-2 block">CPU/CUDA auto-sensing</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#161b27]/80 border border-white/[0.06]">
              <span className="text-xs font-mono text-slate-400 block mb-1">AUTHENTICATION</span>
              <span className="text-white font-semibold block text-base">Firebase JWT Tokens</span>
              <span className="text-xs text-emerald-400 font-mono mt-2 block">Cryptographic Bearer validation</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#161b27]/80 border border-white/[0.06]">
              <span className="text-xs font-mono text-slate-400 block mb-1">AUDIT STORAGE</span>
              <span className="text-white font-semibold block text-base">Supabase / SQLite Dual-Mode</span>
              <span className="text-xs text-amber-400 font-mono mt-2 block">Zero-downtime offline fallback</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
