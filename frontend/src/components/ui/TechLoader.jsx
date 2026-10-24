import React from 'react';
import { Shield, Mic } from 'lucide-react';

export default function TechLoader({ text = 'Initializing VoiceShield Core...' }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#04090e] text-white relative overflow-hidden select-none">
      {/* Background radial cyber glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-radial from-[#00f5d4]/10 via-[#00d4ff]/5 to-transparent blur-2xl pointer-events-none" />

      {/* High-tech shield with outward ripples */}
      <div className="relative flex items-center justify-center w-56 h-56 mb-6">
        {/* Concentric outward ripples */}
        <div className="absolute inset-0 rounded-full border border-[#00f5d4]/50 animate-tech-ripple pointer-events-none" />
        <div
          className="absolute inset-0 rounded-full border border-[#00d4ff]/40 animate-tech-ripple pointer-events-none"
          style={{ animationDelay: '0.8s' }}
        />
        <div
          className="absolute inset-0 rounded-full border border-[#10b981]/30 animate-tech-ripple pointer-events-none"
          style={{ animationDelay: '1.6s' }}
        />

        {/* Outer rotating dashed cyber reticle */}
        <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#00f5d4]/30 animate-[spin_12s_linear_infinite] pointer-events-none" />
        <div className="absolute w-44 h-44 rounded-full border border-dotted border-[#00d4ff]/20 animate-[spin_20s_linear_infinite_reverse] pointer-events-none" />

        {/* Central Shield with nestled Mic Logo (No square bounding box) */}
        <div className="relative z-10 flex items-center justify-center">
          <Shield
            className="w-16 h-16 text-[#00f5d4] drop-shadow-[0_0_22px_rgba(0,245,212,0.85)]"
            strokeWidth={1.8}
          />
          <div className="absolute inset-0 flex items-center justify-center pt-0.5">
            <Mic
              className="w-7 h-7 text-white drop-shadow-[0_0_12px_rgba(0,245,212,0.95)] animate-pulse"
              strokeWidth={2.4}
            />
          </div>
        </div>
      </div>

      {/* Tech Status Telemetry */}
      <div className="flex flex-col items-center gap-2.5 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping" />
          <span className="text-xs font-mono tracking-[0.22em] text-[#00f5d4] font-semibold uppercase">
            {text}
          </span>
        </div>

        {/* High-tech scanning laser bar */}
        <div className="w-52 h-1 bg-slate-800/80 rounded-full relative overflow-hidden border border-white/5 shadow-inner">
          <div className="h-full w-24 bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent animate-cyber-scan" />
        </div>
      </div>
    </div>
  );
}
