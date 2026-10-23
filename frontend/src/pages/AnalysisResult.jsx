import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  History,
  Clock,
  Cpu,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScoreGauge from '../components/analysis/ScoreGauge';
import RiskBadge from '../components/analysis/RiskBadge';

export default function AnalysisResult({ result, onReset }) {
  if (!result) return null;

  const isFake = result.prediction === 'AI_GENERATED';
  const isInconclusive = result.prediction === 'INCONCLUSIVE';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
              VERIFICATION REPORT
            </span>
            <span className="text-xs font-mono text-slate-500">&bull;</span>
            <span className="text-xs font-mono text-slate-400">{result.event_id}</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white">
            Speech Authenticity Assessment
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onReset} icon={RotateCcw}>
            Analyze Another Audio
          </Button>

          <Link to="/history">
            <Button variant="ghost" size="sm" icon={History}>
              View in History
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Score Gauge & Acoustic Metrics */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card variant="elevated" className="flex flex-col items-center">
            <ScoreGauge
              fakeScore={result.fake_score || 0}
              realScore={result.real_score || 0}
              prediction={result.prediction}
              size={240}
            />

            {/* Neural Acoustic Metadata */}
            <div className="w-full mt-6 pt-6 border-t border-white/[0.08] flex flex-col gap-2.5 text-xs font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Cpu size={14} className="text-[#00d4ff]" /> Model Architecture
                </span>
                <span className="text-slate-200">Wav2Vec2 Sequence</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-[#a855f7]" /> Audio Duration
                </span>
                <span className="text-slate-200">{result.duration_seconds || 0} sec</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Model Identifier</span>
                <span className="text-slate-300 truncate max-w-[150px]" title={result.model_name}>
                  {result.model_name || 'Deepfake-V2'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Risk Synthesis & Actionable Explanation */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Risk Level Highlight Card */}
          <RiskBadge
            riskLevel={result.final_risk || 'LOW'}
            showDescription={false}
          />

          {/* Narrative Explanation Card */}
          <Card variant="default">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Info size={16} className="text-[#00d4ff]" />
              Threat Synthesis & Analysis Summary
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed bg-[#07080f]/80 p-4 rounded-xl border border-white/[0.06]">
              {result.risk_explanation || 'Assessment completed successfully.'}
            </p>

            {/* Contextual Risk Breakdown */}
            <div className="mt-6">
              <h5 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-3">
                Caller Situational Threat Indicators
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className={`p-3 rounded-xl border text-xs font-mono ${
                    result.context_flags?.is_caller_unknown
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-white/[0.02] border-white/5 text-slate-400'
                  }`}
                >
                  <span className="block font-semibold">Unknown Caller</span>
                  <span className="text-[11px] mt-0.5 block opacity-80">
                    {result.context_flags?.is_caller_unknown ? 'FLAGGED' : 'Verified / Familiar'}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs font-mono ${
                    result.context_flags?.is_sensitive_request
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-white/[0.02] border-white/5 text-slate-400'
                  }`}
                >
                  <span className="block font-semibold">Sensitive / Money</span>
                  <span className="text-[11px] mt-0.5 block opacity-80">
                    {result.context_flags?.is_sensitive_request ? 'FLAGGED' : 'No credential requests'}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs font-mono ${
                    result.context_flags?.urgency_flag
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-white/[0.02] border-white/5 text-slate-400'
                  }`}
                >
                  <span className="block font-semibold">Psychological Urgency</span>
                  <span className="text-[11px] mt-0.5 block opacity-80">
                    {result.context_flags?.urgency_flag ? 'FLAGGED' : 'Standard demeanor'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended Safety Actions */}
            <div className="mt-6 pt-6 border-t border-white/[0.08]">
              <h5 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                Recommended Security Actions
              </h5>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff] font-bold">&bull;</span>
                  <span>
                    Never transfer money, purchase gift cards, or share OTPs based solely on an incoming voice call.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff] font-bold">&bull;</span>
                  <span>
                    Always disconnect and dial the person or organization back on a verified independent phone number.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff] font-bold">&bull;</span>
                  <span>
                    Establish a private family emergency code or passphrase for verifying authentic distress calls.
                  </span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Academic & Probabilistic Disclaimer */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400 leading-relaxed font-mono">
            <span className="text-slate-300 font-semibold uppercase block mb-1">
              Scientific Notice & Limitations
            </span>
            Machine learning voice authenticity models evaluate acoustic spectral distributions and vocoder artifacts. Predictions are probabilistic confidence estimates designed for human-in-the-loop decision support and must not be treated as absolute legal proof of identity or fraud.
          </div>
        </div>
      </div>
    </div>
  );
}
