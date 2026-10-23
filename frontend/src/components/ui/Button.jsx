import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  className = '',
  icon: Icon = null,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none relative overflow-hidden';

  const variants = {
    primary: 'bg-gradient-to-r from-[#00d4ff] to-[#0284c7] text-[#07080f] font-semibold hover:shadow-[0_0_25px_rgba(0,212,255,0.4)] border border-[#00d4ff]/40',
    purple: 'bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white font-semibold hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] border border-[#a855f7]/40',
    secondary: 'bg-[#161b27]/80 hover:bg-[#161b27] text-slate-200 border border-white/10 hover:border-white/20 hover:text-white',
    outline: 'bg-transparent text-[#00d4ff] border border-[#00d4ff]/40 hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]',
    danger: 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50',
    ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5'
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold'
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={disabled || isLoading ? {} : { scale: 1.02 }}
      whileTap={disabled || isLoading ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 18} />}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
}
