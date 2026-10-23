import React from 'react';
import { motion } from 'framer-motion';

export default function ScoreGauge({
  fakeScore = 0.0,
  realScore = 0.0,
  prediction = 'HUMAN_SPEECH',
  size = 220
}) {
  const fakePercent = Math.round(fakeScore * 100);
  const realPercent = Math.round(realScore * 100);

  const radius = (size - 32) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fakePercent / 100) * circumference;

  const isFake = prediction === 'AI_GENERATED';
  const isInconclusive = prediction === 'INCONCLUSIVE';

  const strokeColor = isInconclusive
    ? '#94a3b8'
    : isFake
    ? '#f43f5e'
    : '#10b981';

  const glowShadow = isInconclusive
    ? 'rgba(148, 163, 184, 0.2)'
    : isFake
    ? 'rgba(244, 63, 94, 0.35)'
    : 'rgba(16, 185, 129, 0.35)';

  return (
    <div className="flex flex-col items-center justify-center relative p-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Glow backdrop */}
        <div
          className="absolute inset-4 rounded-full blur-2xl opacity-40 transition-all duration-700"
          style={{ background: strokeColor }}
        />

        <svg width={size} height={size} className="transform -rotate-90 relative z-10">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="12"
            fill="transparent"
          />

          {/* Animated Value Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: `drop-shadow(0 0 8px ${glowShadow})`
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
            Synthetic Likelihood
          </span>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-baseline gap-0.5 my-1"
          >
            <span className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              {fakePercent}
            </span>
            <span className="text-xl font-bold text-slate-400">%</span>
          </motion.div>

          <span
            className={`text-xs font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
              isInconclusive
                ? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                : isFake
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {isInconclusive ? 'INCONCLUSIVE' : isFake ? 'SYNTHETIC SPOOF' : 'AUTHENTIC HUMAN'}
          </span>
        </div>
      </div>

      {/* Probabilities breakdown bar */}
      <div className="w-full max-w-xs mt-4 flex items-center justify-between text-xs font-mono text-slate-400 px-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          Human: {realPercent}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          Synthetic: {fakePercent}%
        </span>
      </div>
    </div>
  );
}
