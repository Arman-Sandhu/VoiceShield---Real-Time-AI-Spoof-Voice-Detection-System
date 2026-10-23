import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon = null
}) {
  const variants = {
    default: 'bg-white/5 text-slate-300 border-white/10',
    cyan: 'bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30 shadow-[0_0_12px_rgba(0,212,255,0.2)]',
    purple: 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold'
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border tracking-wide uppercase font-mono',
          variants[variant],
          sizes[size],
          className
        )
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />}
      <span>{children}</span>
    </span>
  );
}
