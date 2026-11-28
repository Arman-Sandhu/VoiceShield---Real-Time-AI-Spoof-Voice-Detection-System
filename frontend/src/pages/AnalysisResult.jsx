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
  X,
  Globe,
  Bot
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ScoreGauge from '../components/analysis/ScoreGauge';
import RiskBadge from '../components/analysis/RiskBadge';
import { downloadFileToDevice } from '../utils/fileDownloader';
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
      setIsFlagged(!nextState);
    } finally {
      setTogglingFlag(false);
    }
  };

  const handleDownloadReport = async () => {
    const reportData = {
      service: 'VoiceShield Forensic Analysis Report',
      eventId: result.event_id,
      timestamp: result.timestamp,
      fileName: currentFileName,
      prediction: result.prediction,
      spoofScore: `${(result.fake_score * 100).toFixed(2)}%`,
      humanScore: `${(result.real_score * 100).toFixed(2)}%`,
      confidence: `${(result.confidence * 100).toFixed(2)}%`,
      finalRisk: result.final_risk,
      riskExplanation: result.risk_explanation,
      detectedLanguage: result.detected_language || 'English',
      transcript: result.transcript || '',
      detectedTriggers: result.detected_triggers || [],
      contextFlags: result.context_flags || {},
      modelName: result.model_name || 'voiceshield-hindi-english-deepfake-v3-hardened',
      durationSeconds: result.duration_seconds
    };

    const fileName = `VoiceShield_${result.event_id}_Report.json`;
    await downloadFileToDevice(JSON.stringify(reportData, null, 2), fileName, 'application/json');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
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
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card variant="elevated" className="p-6 flex flex-col items-center">
            <ScoreGauge
              fakeScore={result.fake_score || 0}
              realScore={result.real_score || 0}
              prediction={result.prediction}
              size={210}
            />

            <div className="w-full mt-5 pt-5 border-t border-white/[0.08] flex flex-col gap-2.5 text-xs font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 shrink-0">
                  <FileAudio size={14} className="text-[#00f5d4]" /> Analyzed File
                </span>
                <span className="text-slate-200 font-semibold truncate max-w-[190px]" title={currentFileName}>
                  {currentFileName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Globe size={14} className="text-[#00d4ff]" /> Detected Language
                </span>
                <span className="text-slate-200 font-semibold">
                  {result.detected_language || 'English'}
                  {result.language_confidence ? ` (${(result.language_confidence * 100).toFixed(0)}%)` : ''}
                </span>
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

        <div className="lg:col-span-7 flex flex-col gap-6">
          <RiskBadge
            riskLevel={result.final_risk || 'LOW'}
            showDescription={true}
          />

          <Card variant="default" className="p-6 flex flex-col gap-5">
            <div>
              <h4 className="text-sm font-semibold text-white mb-2.5 flex items-center gap-2">
                <Info size={16} className="text-[#00d4ff]" />
                Threat Synthesis & Analysis Summary
              </h4>
              <p className="threat-summary-text text-sm text-slate-200 leading-relaxed bg-[#07080f]/80 p-4 rounded-xl border border-white/[0.06]">
                {result.risk_explanation || 'Assessment completed successfully.'}
              </p>
            </div>

            <div className="telemetry-metrics-box p-4 rounded-xl bg-[#07080f]/90 border border-white/[0.06] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#00d4ff] font-semibold flex items-center gap-1.5">
                  <Activity size={14} /> Acoustic Forensics & Feature Telemetry
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Confidence: {((result.confidence || 0.95) * 100).toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Human Naturalness</span>
                    <span className="text-emerald-400 font-bold">{((result.real_score || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#00f5d4] rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, (result.real_score || 0) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Synthetic AI Probability</span>
                    <span className="text-rose-400 font-bold">{((result.fake_score || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(0, (result.fake_score || 0) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2.5">
                Caller Situational Threat Indicators
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`threat-indicator-card p-3 rounded-xl border flex items-center gap-2.5 ${
                  result.context_flags?.is_caller_unknown
                    ? 'threat-indicator-active bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'threat-indicator-safe bg-white/5 border-white/5 text-slate-400'
                }`}>
                  {result.context_flags?.is_caller_unknown ? (
                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xs font-mono">
                    {result.context_flags?.is_caller_unknown ? 'Unverified Identity' : 'Known Contact'}
                  </span>
                </div>

                <div className={`threat-indicator-card p-3 rounded-xl border flex items-center gap-2.5 ${
                  result.context_flags?.is_sensitive_request
                    ? 'threat-indicator-active bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'threat-indicator-safe bg-white/5 border-white/5 text-slate-400'
                }`}>
                  {result.context_flags?.is_sensitive_request ? (
                    <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xs font-mono">
                    {result.context_flags?.is_sensitive_request ? 'Financial Request' : 'No Sensitive Request'}
                  </span>
                </div>

                <div className={`threat-indicator-card p-3 rounded-xl border flex items-center gap-2.5 ${
                  result.context_flags?.urgency_flag
                    ? 'threat-indicator-active bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'threat-indicator-safe bg-white/5 border-white/5 text-slate-400'
                }`}>
                  {result.context_flags?.urgency_flag ? (
                    <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                  ) : (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xs font-mono">
                    {result.context_flags?.urgency_flag ? 'High Pressure' : 'Normal Pace'}
                  </span>
                </div>
              </div>
            </div>

            {/* Spoken Audio Transcription placed below telemetry scan */}
            {result.detected_language === 'Hindi' ? (
              <div className="p-3.5 rounded-xl bg-[#07080f]/70 border border-white/[0.05] flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-2">
                  <Globe size={14} className="text-[#00d4ff]" />
                  Multilingual Acoustic Forensics: Hindi speech detected. Real-time acoustic deepfake scoring active.
                </span>
                <span className="text-emerald-400 shrink-0">Acoustics Analyzed</span>
              </div>
            ) : result.transcript ? (
              <div className="transcription-trigger-box p-4 rounded-xl bg-[#07080f]/90 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Bot size={14} className="text-[#00d4ff]" />
                  <span className="text-xs font-mono uppercase tracking-wider text-[#00d4ff] font-semibold">
                    Spoken Audio Transcription & Trigger Analysis
                  </span>
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  "{result.transcript}"
                </p>
                {result.detected_triggers && result.detected_triggers.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {result.detected_triggers.map((trigger, idx) => (
                      <span
                        key={idx}
                        className="transcription-trigger-badge px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold"
                      >
                        ⚠ {trigger}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#07080f]/70 border border-white/[0.05] flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-2">
                  <Bot size={14} className="text-[#00d4ff]" />
                  Linguistic Analysis: Speech characteristics verified without malicious social engineering markers.
                </span>
                <span className="text-emerald-400 shrink-0">Clear</span>
              </div>
            )}

            <div className={`defensive-action-box p-4 rounded-xl border flex items-start gap-3 ${
              result.final_risk === 'HIGH' || result.final_risk === 'CRITICAL'
                ? 'defensive-action-critical bg-rose-500/10 border-rose-500/30 text-rose-200'
                : 'defensive-action-normal bg-[#00f5d4]/5 border-[#00f5d4]/20 text-slate-300'
            }`}>
              <ShieldCheck size={18} className={`shrink-0 mt-0.5 ${
                result.final_risk === 'HIGH' || result.final_risk === 'CRITICAL'
                  ? 'text-rose-400'
                  : 'text-[#00f5d4]'
              }`} />
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-semibold uppercase tracking-wider font-mono text-white">
                  {result.final_risk === 'HIGH' || result.final_risk === 'CRITICAL'
                    ? 'Defensive Action Required'
                    : 'Recommended Operational Protocol'}
                </span>
                <p className="leading-relaxed">
                  {result.final_risk === 'HIGH' || result.final_risk === 'CRITICAL'
                    ? 'This voice pattern indicates high-confidence synthetic generation or coercive social engineering. Terminate communication immediately, avoid sharing OTPs or financial credentials, and verify identity through a known independent channel.'
                    : 'Acoustic waveform exhibits biological vocal tract resonance and natural pitch stability. No defensive countermeasure or secondary identity verification is mandated.'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Telemetry Timestamp: {new Date(result.timestamp).toLocaleTimeString()}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> Vault Verified
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
