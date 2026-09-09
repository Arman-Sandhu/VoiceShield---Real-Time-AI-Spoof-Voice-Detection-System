import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Shield, ShieldQuestion, AlertTriangle } from 'lucide-react';

export default function RiskBadge({ riskLevel }) {
  const getBadgeStyle = () => {
    switch(riskLevel) {
      case 'LOW':
        return { color: 'bg-green-500', icon: <Shield size={24} />, text: 'text-green-400' };
      case 'MEDIUM':
        return { color: 'bg-yellow-500', icon: <ShieldQuestion size={24} />, text: 'text-yellow-400' };
      case 'HIGH':
        return { color: 'bg-orange-500', icon: <AlertTriangle size={24} />, text: 'text-orange-400' };
      case 'CRITICAL':
        return { color: 'bg-red-500', icon: <ShieldAlert size={24} />, text: 'text-red-400' };
      default:
        return { color: 'bg-slate-500', icon: <Shield size={24} />, text: 'text-slate-400' };
    }
  };

  const style = getBadgeStyle();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={riskLevel}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className={`flex items-center gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50`}
      >
        <div className={`p-3 rounded-full text-white ${style.color}`}>
          {style.icon}
        </div>
        <div>
          <p className="text-sm text-slate-400 uppercase font-bold tracking-wider">Risk Level</p>
          <p className={`text-2xl font-black ${style.text}`}>{riskLevel}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
