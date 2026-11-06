import React from 'react';
import { Cpu, Database, Lock } from 'lucide-react';
import ShieldMicLogo from '../ui/ShieldMicLogo';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#07080f] py-12 px-4 sm:px-6 lg:px-8 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff]">
            <ShieldMicLogo size={18} />
          </div>
          <div>
            <p className="font-display font-semibold text-white">VoiceShield AI</p>
            <p className="text-xs text-slate-400">Real-Time AI Spoof Voice Detection & Social Engineering Defense</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu size={14} className="text-[#00d4ff]" /> Wav2Vec2 Acoustic Classifier
          </span>
          <span className="flex items-center gap-1.5">
            <Database size={14} className="text-[#a855f7]" /> Supabase / SQLite Engine
          </span>
          <span className="flex items-center gap-1.5">
            <Lock size={14} className="text-emerald-400" /> Firebase JWT Security
          </span>
        </div>

        <p className="text-xs text-slate-400 text-center md:text-right">
          Model outputs are probabilistic estimates for decision support.
        </p>
      </div>
    </footer>
  );
}
