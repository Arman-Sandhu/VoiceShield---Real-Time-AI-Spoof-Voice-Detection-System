import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function Card({
  children,
  className = '',
  variant = 'default',
  hover = true,
  onClick = null,
  ...props
}) {
  const variants = {
    default: 'bg-[#0f1117]/80 border-white/[0.07] backdrop-blur-xl',
    elevated: 'bg-[#161b27]/85 border-white/[0.1] backdrop-blur-2xl shadow-2xl',
    'glow-cyan': 'bg-[#0f1117]/85 border-[#00d4ff]/25 shadow-[0_0_30px_rgba(0,212,255,0.1)]',
    'glow-purple': 'bg-[#0f1117]/85 border-[#a855f7]/25 shadow-[0_0_30px_rgba(168,85,247,0.1)]'
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={hover && !onClick ? { y: -2 } : hover && onClick ? { scale: 1.01, y: -2 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={twMerge(
        clsx(
          'rounded-2xl border p-6 transition-colors duration-200 relative overflow-hidden',
          variants[variant],
          onClick && 'cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
