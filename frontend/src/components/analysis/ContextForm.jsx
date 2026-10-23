import React from 'react';
import { UserX, CreditCard, Flame, Check } from 'lucide-react';
import Card from '../ui/Card';

export default function ContextForm({ flags, onChange }) {
  const questions = [
    {
      id: 'is_caller_unknown',
      title: 'Unknown or Unverified Caller',
      description: 'The caller is not in your verified contacts, called from an unfamiliar number, or identity cannot be corroborated.',
      icon: UserX,
      color: '#00d4ff'
    },
    {
      id: 'is_sensitive_request',
      title: 'Financial or Sensitive Credential Request',
      description: 'The caller requested an immediate wire transfer, gift card, credit card PIN, passwords, or one-time passcodes (OTP).',
      icon: CreditCard,
      color: '#a855f7'
    },
    {
      id: 'urgency_flag',
      title: 'High Urgency, Panic, or Pressure',
      description: 'The caller used distress tactics (e.g. kidnapping hoax, arrest threat, expiring deadline, or frantic emotional tone).',
      icon: Flame,
      color: '#f43f5e'
    }
  ];

  const handleToggle = (id) => {
    onChange({
      ...flags,
      [id]: !flags[id]
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h4 className="text-sm font-semibold text-white">Call Context Risk Factors</h4>
          <p className="text-xs text-slate-400">
            Acoustic spoof score is evaluated alongside situational social engineering indicators.
          </p>
        </div>
        <span className="text-xs font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-0.5 rounded border border-[#00d4ff]/30">
          {Object.values(flags).filter(Boolean).length}/3 Flagged
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {questions.map((q) => {
          const isChecked = !!flags[q.id];
          const Icon = q.icon;
          return (
            <div
              key={q.id}
              onClick={() => handleToggle(q.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                isChecked
                  ? 'bg-[#161b27] border-[#00d4ff]/50 shadow-[0_0_20px_rgba(0,212,255,0.15)]'
                  : 'bg-[#0f1117]/80 border-white/[0.06] hover:border-white/20 hover:bg-[#161b27]/50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: isChecked ? `${q.color}20` : 'rgba(255,255,255,0.03)',
                    borderColor: isChecked ? `${q.color}60` : 'rgba(255,255,255,0.08)',
                    color: isChecked ? q.color : '#94a3b8'
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <h5 className={`text-sm font-semibold ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                    {q.title}
                  </h5>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {q.description}
                  </p>
                </div>
              </div>

              {/* Custom checkbox */}
              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                  isChecked
                    ? 'bg-[#00d4ff] border-[#00d4ff] text-[#07080f]'
                    : 'border-white/20 bg-white/5'
                }`}
              >
                {isChecked && <Check size={14} strokeWidth={3} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
