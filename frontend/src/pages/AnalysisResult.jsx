import React, { useState } from 'react';
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
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileAudio,
  Flag,
  Download,
  Pencil,
  Check,
  X
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScoreGauge from '../components/analysis/ScoreGauge';
import RiskBadge from '../components/analysis/RiskBadge';
import AudioPlayer from '../components/audio/AudioPlayer';

export default function AnalysisResult({
  result,
  audioFile = null,
  audioBlob = null,
  onReset
}) {
  const [isFlagged, setIsFlagged] = useState(result?.is_flagged || false);
  const [togglingFlag, setTogglingFlag] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(
    result?.file_name || audioFile?.name || 'VoiceShield_Recording.wav'
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [renaming, setRenaming] = useState(false);

  if (!result) return null;

  const handleStartRename = () => {
    setNewFileNameInput(currentFileName);
    setIsEditingName(true);
  };

  const handleSaveRename = async (e) => {
    if (e) e.preventDefault();
    const trimmed = newFileNameInput.trim();
    if (!trimmed || trimmed === currentFileName) {
      setIsEditingName(false);
      return;
    }

    setRenaming(true);
    try {
      await api.patch(`/analysis/${result.event_id}/rename`, { file_name: trimmed });
      setCurrentFileName(trimmed);
      result.file_name = trimmed;
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to rename audio record:', err);
      alert('Could not update file name. Please try again.');
    } finally {
      setRenaming(false);
    }
  };

  const handleToggleFlag = async () => {
    if (togglingFlag) return;
    setTogglingFlag(true);
    const nextState = !isFlagged;
    setIsFlagged(nextState);

    try {
      await api.patch(`/analysis/${result.event_id}/flag`);
    } catch (err) {
      console.error('Failed to toggle flag:', err);
      // Revert optimistic update
      setIsFlagged(!nextState);
    } finally {
      setTogglingFlag(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
              VERIFICATION REPORT
            </span>
            <span className="text-xs font-mono text-slate-500">&bull;</span>
            <span className="text-xs font-mono text-slate-400">{result.event_id}</span>
            <span className="text-xs font-mono text-slate-500">&bull;</span>
            {isEditingName ? (
              <form onSubmit={handleSaveRename} className="inline-flex items-center gap-1.5">
                <input
                  type="text"
                  value={newFileNameInput}
                  onChange={(e) => setNewFileNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  className="bg-[#161b27] border border-[#00d4ff]/60 rounded-md px-2 py-0.5 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-[#00d4ff]"
                  autoFocus
                  disabled={renaming}
                />
                <button
                  type="submit"
                  disabled={renaming}
                  className="p-1 rounded bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30 transition-colors"
                  title="Save file name"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  disabled={renaming}
                  className="p-1 rounded bg-white/5 text-slate-400 hover:text-white transition-colors"
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </form>
            ) : (
              <span className="text-xs font-mono text-emerald-400 inline-flex items-center gap-1.5">
                <FileAudio size={13} />
                <span className="max-w-xs truncate" title={currentFileName}>{currentFileName}</span>
                <button
                  type="button"
                  onClick={handleStartRename}
                  className="p-1 rounded text-slate-400 hover:text-[#00d4ff] hover:bg-white/10 transition-colors"
                  title="Rename audio file in history"
                >
                  <Pencil size={12} />
                </button>
              </span>
            )}
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white">
            Speech Authenticity Assessment
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dispute / Flag Button */}
          <button
            type="button"
            onClick={handleToggleFlag}
            disabled={togglingFlag}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
              isFlagged
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10'
            }`}
            title="Flag if you believe this AI analysis was inaccurate"
          >
            <Flag
              size={15}
              className={`transition-all ${isFlagged ? 'text-rose-500 fill-rose-500 scale-110' : ''}`}
            />
            <span>{isFlagged ? 'Analysis Flagged (Disputed)' : 'Flag as Inaccurate'}</span>
          </button>

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

      {/* Main Results Grid - Unified Balanced 2-Column Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Column (B): Neural Acoustic Score Gauge & Audio Playback with Waveform */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6 h-full">
          {/* Neural Acoustic Score Gauge Card */}
          <Card variant="elevated" className="p-6 flex flex-col items-center">
            <ScoreGauge
              fakeScore={result.fake_score || 0}
              realScore={result.real_score || 0}
              prediction={result.prediction}
              size={210}
            />

            {/* Neural Acoustic Metadata */}
            <div className="w-full mt-5 pt-5 border-t border-white/[0.08] flex flex-col gap-2.5 text-xs font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 shrink-0">
                  <FileAudio size={14} className="text-[#00f5d4]" /> Analyzed File
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-200 font-semibold truncate max-w-[190px]" title={currentFileName}>
                    {currentFileName}
                  </span>
                  {!isEditingName && (
                    <button
                      type="button"
                      onClick={handleStartRename}
                      className="p-1 rounded text-slate-400 hover:text-[#00d4ff] hover:bg-white/5 transition-colors shrink-0"
                      title="Rename audio record"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Cpu size={14} className="text-[#00d4ff]" /> Model Architecture
                </span>
                <span className="text-slate-200 font-medium">VoiceShield Neural Sequence</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Clock size={14} className="text-[#a855f7]" /> Audio Duration
                </span>
                <span className="text-slate-200 font-medium">{result.duration_seconds || 0} sec</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="shrink-0">Model Identifier</span>
                <span className="text-slate-300 font-mono truncate max-w-[210px]" title={result.model_name}>
                  {result.model_name || 'voiceshield-hindi-english-deepfake-v3-hardened'}
                </span>
              </div>
            </div>
          </Card>

          {/* Audio Playback & Oscilloscope Waveform Card */}
          <Card variant="default" className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00f5d4] animate-pulse" />
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#00f5d4] font-semibold">
                  Acoustic Sample Playback & Waveform
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-500">16,000 Hz MONO</span>
            </div>

            {audioBlob || audioFile ? (
              <AudioPlayer
                audioBlob={audioBlob}
                audioFile={audioFile}
                fileName={currentFileName}
                title={currentFileName}
                showWaveform={true}
                showDownload={true}
              />
            ) : (
              <div className="p-6 text-center rounded-xl bg-[#04080d] border border-white/5 text-xs font-mono text-slate-400">
                <p>Audio source session concluded. Event metadata safely stored in history vault.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (A): Contextual Threat Assessment & Synthesis Breakdown */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6 h-full">
          {/* Risk Level Highlight Card */}
          <RiskBadge
            riskLevel={result.final_risk || 'LOW'}
            showDescription={true}
          />

          {/* Threat Synthesis, Situational Indicators & Recommended Actions Card */}
          <Card variant="default" className="p-6 flex-1 flex flex-col justify-between">
            {/* Top Section: Threat Synthesis Narrative & Caller Indicators grouped tightly together */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Info size={16} className="text-[#00d4ff]" />
                Threat Synthesis & Analysis Summary
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed bg-[#07080f]/80 p-4 rounded-xl border border-white/[0.06]">
                {result.risk_explanation || 'Assessment completed successfully.'}
              </p>

              {/* Contextual Risk Breakdown - follows narrative directly with no empty gap */}
              <div className="mt-5">
                <h5 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-3">
                  Caller Situational Threat Indicators
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    className={`p-3.5 rounded-xl border text-xs font-mono ${
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
                    className={`p-3.5 rounded-xl border text-xs font-mono ${
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
                    className={`p-3.5 rounded-xl border text-xs font-mono ${
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

              {/* Acoustic Biometric Indicators */}
              {result.biometric_indicators && result.biometric_indicators.length > 0 && (
                <div className="mt-5">
                  <h5 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity size={14} className="text-[#a855f7]" />
                    Acoustic Biometric Profiling
                  </h5>
                  <div className="space-y-1.5">
                    {result.biometric_indicators.map((ind, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/20 text-[11px] font-mono text-purple-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] shrink-0" />
                        <span>{ind}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section: Recommended Safety Actions */}
            <div className="mt-6 pt-6 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                  Recommended Security Actions
                </h5>
                <span className="text-[10px] font-mono text-[#00d4ff]/80">DEFENSE PROTOCOLS</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300">
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
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff] font-bold">&bull;</span>
                  <span>
                    Implement multi-factor out-of-band verification before approving high-value transactions or sensitive credential releases.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d4ff] font-bold">&bull;</span>
                  <span>
                    Report suspected voice clone scams and spoofed caller IDs immediately to your institution's security team or national cybercrime registry.
                  </span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Academic & Probabilistic Disclaimer - sits flush at bottom */}
          <div className="p-4.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400 leading-relaxed font-mono">
            <span className="text-slate-300 font-semibold uppercase block mb-1">
              Scientific Notice & Limitations
            </span>
            Machine learning voice authenticity models evaluate acoustic spectral distributions, neural vocoder phase artifacts, and synthetic frequency anomalies. Predictions are probabilistic confidence estimates designed for human-in-the-loop decision support and must not be treated as absolute legal proof of identity or fraud. Detection accuracy may vary depending on ambient background noise, cellular compression codecs (e.g. GSM/VoLTE), and the duration or quality of the audio sample provided.
          </div>
        </div>
      </div>
    </div>
  );
}
