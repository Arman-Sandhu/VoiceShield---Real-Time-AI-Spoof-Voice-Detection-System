import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import ShieldMicLogo from '../ui/ShieldMicLogo';

export default function RiskBadge({ riskLevel = 'LOW', size = 'lg', showDescription = false }) {
  const level = (riskLevel || 'LOW').toUpperCase();

  const configs = {
    LOW: {
      label: 'LOW THREAT',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      icon: ShieldMicLogo,
      desc: 'Minimal risk indicators detected in voice acoustic features and context.'
    },
    MEDIUM: {
      label: 'MODERATE RISK',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      icon: AlertTriangle,
      desc: 'Moderate risk detected. Exercise heightened vigilance and verify caller through secondary channels.'
    },
    HIGH: {
      label: 'HIGH RISK',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.25)]',
      icon: ShieldAlert,
      desc: 'Significant synthetic voice markers or suspicious pressure tactics detected.'
    },
    CRITICAL: {
      label: 'CRITICAL THREAT',
      color: 'text-red-400',
      bg: 'bg-red-500/20 border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.4)] animate-pulse',
      icon: ShieldAlert,
      desc: 'Severe probability of AI voice cloning combined with urgent social engineering tactics!'
    }
  };

  const config = configs[level] || configs.LOW;
  const Icon = config.icon;

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold tracking-wider ${config.bg} ${config.color}`}>
        <Icon size={13} />
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl ${config.bg}`}
    >
      <div className={`w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center ${config.color} shrink-0`}>
        <Icon size={26} />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono uppercase text-slate-400 tracking-widest">
            Contextual Threat Assessment
          </span>
        </div>
        <h3 className={`text-xl font-display font-extrabold tracking-wide ${config.color}`}>
          {config.label}
        </h3>
        {showDescription && (
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            {config.desc}
          </p>
        )}
      </div>
    </motion.div>
  );
}
