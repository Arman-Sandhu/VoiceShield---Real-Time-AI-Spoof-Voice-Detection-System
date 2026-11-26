import React from 'react';
import { UserX, CreditCard, Flame, Sparkles, ShieldCheck } from 'lucide-react';

export default function ContextForm() {
  const indicators = [
    {
      id: 'is_caller_unknown',
      title: 'Caller Identity & Unverified Contact Detection',
      description: 'Automatically analyzes spoken introduction, authority claims (e.g. police, customs, bank), and unverified caller patterns.',
      icon: UserX,
      color: '#00d4ff',
      tag: 'Neural LID & Entity Match'
    },
    {
      id: 'is_sensitive_request',
      title: 'Financial Demand & Credential Extraction',
      description: 'Extracts requests for immediate cash, money transfer (e.g. 5000 Rs, wire, UPI), passwords, PINs, or sensitive credentials.',
      icon: CreditCard,
      color: '#a855f7',
      tag: 'Intent & Entity Extraction'
    },
    {
      id: 'urgency_flag',
      title: 'Psychological Urgency & Distress Tactics',
      description: 'Detects situational pressure tactics including kidnapping/accident emergencies, expiring deadlines, and frantic emotional tone.',
      icon: Flame,
      color: '#f43f5e',
      tag: 'Acoustic & Semantic Urgency'
    }
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h4 className="text-sm font-semibold text-white">Call Context Risk Intelligence</h4>
          <p className="text-xs text-slate-400">
            Acoustic spoof score is cross-analyzed with situational threat indicators predicted directly by AI.
          </p>
        </div>
        <span className="text-xs font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-2.5 py-1 rounded-lg border border-[#00d4ff]/30 flex items-center gap-1.5 shrink-0">
          <Sparkles size={12} className="animate-pulse" />
          <span>Automated AI Inference</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {indicators.map((q) => {
          const Icon = q.icon;
          return (
            <div
              key={q.id}
              className="p-4 rounded-xl border border-white/[0.08] bg-[#0f1117]/80 flex items-center justify-between gap-4 transition-all hover:border-white/20"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${q.color}15`,
                    borderColor: `${q.color}40`,
                    color: q.color
                  }}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-white truncate">
                      {q.title}
                    </h5>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {q.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">
                <ShieldCheck size={12} className="text-[#00d4ff]" />
                <span className="hidden sm:inline">{q.tag}</span>
                <span className="sm:hidden">Auto</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
