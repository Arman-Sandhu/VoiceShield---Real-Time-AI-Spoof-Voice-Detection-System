import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, UploadCloud, Cpu, AlertCircle, ArrowLeft, Sparkles, PhoneCall, Bot, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ShieldMicLogo from '../components/ui/ShieldMicLogo';
import AudioRecorder from '../components/audio/AudioRecorder';
import AudioUploader from '../components/audio/AudioUploader';
import LiveCallShield from '../components/audio/LiveCallShield';
import TTSVoiceSandbox from '../components/audio/TTSVoiceSandbox';
import ContextForm from '../components/analysis/ContextForm';
import AnalysisResult from './AnalysisResult';

export default function VoiceAnalysis({ user, username }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('record');
  const [audioFile, setAudioFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [contextFlags, setContextFlags] = useState({
    is_caller_unknown: false,
    is_sensitive_request: false,
    urgency_flag: false
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState('Preparing Audio');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleAudioReady = (file, blobOrUrl) => {
    setAudioFile(file);
    if (blobOrUrl instanceof Blob) {
      setAudioBlob(blobOrUrl);
    } else {
      setAudioBlob(null);
    }
    setErrorMessage(null);
  };

  const handleAudioReset = () => {
    setAudioFile(null);
    setAudioBlob(null);
    setErrorMessage(null);
  };

  const runAnalysis = async () => {
    if (!audioFile) {
      setErrorMessage('Please record, upload, or generate an audio sample before starting analysis.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);

    const phases = [
      'Calibrating Acoustic Waveform Signal',
      'Running VoiceShield Neural Feature Extractor',
      'Analyzing Spoken Language & Contextual Signals',
      'Classifying Deepfake Spoof Probabilities',
      'Securing Forensic Telemetry Vault'
    ];

    let phaseIndex = 0;
    const interval = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setAnalysisPhase(phases[phaseIndex]);
    }, 550);

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('custom_file_name', audioFile.name);
    formData.append('is_caller_unknown', 'false');
    formData.append('is_sensitive_request', 'false');
    formData.append('urgency_flag', 'false');
    formData.append('mode', activeTab === 'tts_sandbox' ? 'upload' : activeTab);
    const effectiveUsername = username || user?.displayName || '';
    if (effectiveUsername) {
      formData.append('username', effectiveUsername);
    }

    try {
      const response = await api.post('/analyze-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(interval);
      setAnalysisResult(response.data);
    } catch (err) {
      clearInterval(interval);
      const msg =
        err.response?.data?.detail ||
        'Analysis pipeline failed. Please check audio format and try again.';
      setErrorMessage(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAll = () => {
    handleAudioReset();
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  if (analysisResult) {
    return (
      <AnalysisResult
        result={analysisResult}
        audioFile={audioFile}
        audioBlob={audioBlob}
        onReset={resetAll}
      />
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span className="text-[11px] sm:text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
              DETECTION STUDIO &bull; MULTILINGUAL
            </span>
            <h1 className="text-xl sm:text-3xl font-display font-bold text-white">
              Voice Authenticity Workspace
            </h1>
          </div>
        </div>

        <Badge variant="cyan" size="md" icon={ShieldMicLogo} className="self-start sm:self-auto">
          Calibrated Acoustic Inference
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-[#0f1117] p-1.5 border border-white/[0.08] shadow-lg gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('record');
            handleAudioReset();
          }}
          className={`flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'record'
              ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.25)] border border-[#00d4ff]/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Mic size={15} />
          <span className="truncate">Microphone</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('upload');
            handleAudioReset();
          }}
          className={`flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.25)] border border-[#00d4ff]/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UploadCloud size={15} />
          <span className="truncate">Upload File</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tts_sandbox');
            handleAudioReset();
          }}
          className={`flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'tts_sandbox'
              ? 'bg-[#a855f7]/20 text-[#c084fc] shadow-[0_0_20px_rgba(168,85,247,0.35)] border border-[#a855f7]/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot size={15} />
          <span className="truncate">AI Voice Sandbox</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('live_call');
            handleAudioReset();
          }}
          className={`flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'live_call'
              ? 'bg-[#00f5d4]/15 text-[#00f5d4] shadow-[0_0_20px_rgba(0,245,212,0.3)] border border-[#00f5d4]/40 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PhoneCall size={15} />
          <span className="truncate">Live Call Shield</span>
        </button>
      </div>

      {activeTab === 'live_call' ? (
        <div className="w-full">
          <LiveCallShield user={user} username={username} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col">
            <Card variant="elevated" className="p-5 sm:p-7 flex flex-col justify-between h-full">
              <div>
                {activeTab === 'record' ? (
                  <AudioRecorder
                    onAudioReady={handleAudioReady}
                    onReset={handleAudioReset}
                  />
                ) : activeTab === 'upload' ? (
                  <AudioUploader
                    onAudioReady={handleAudioReady}
                    onReset={handleAudioReset}
                  />
                ) : (
                  <TTSVoiceSandbox
                    onAudioReady={handleAudioReady}
                    onReset={handleAudioReset}
                    onAutoAnalyze={runAnalysis}
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <Card variant="default" className="p-5 sm:p-7 flex flex-col justify-between h-full">
              <div>
                <div className="mb-5 p-3.5 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-xs text-[#00d4ff] flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Automated Contextual Risk Inference</span>
                    <span className="text-[11px] text-slate-300">
                      Our neural speech intelligence model automatically extracts language, transcription, and caller urgency signals directly from the audio telemetry.
                    </span>
                  </div>
                </div>

                <ContextForm />

                {errorMessage && (
                  <div className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/[0.08]">
                {analyzing ? (
                  <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#0f1117]/95 border border-[#00f5d4]/30 text-center relative overflow-hidden shadow-[0_0_20px_rgba(0,245,212,0.08)]">
                    <div className="relative flex items-center justify-center w-28 h-28 my-1 pointer-events-none select-none">
                      <div className="absolute inset-0 rounded-full border border-[#00f5d4]/45 animate-contained-ripple" />
                      <div
                        className="absolute inset-0 rounded-full border border-[#00d4ff]/35 animate-contained-ripple"
                        style={{ animationDelay: '0.7s' }}
                      />
                      <div
                        className="absolute inset-0 rounded-full border border-[#10b981]/25 animate-contained-ripple"
                        style={{ animationDelay: '1.4s' }}
                      />

                      <div className="absolute w-20 h-20 rounded-full border border-dashed border-[#00f5d4]/35 animate-[spin_10s_linear_infinite]" />
                      <div className="absolute w-24 h-24 rounded-full border border-dotted border-[#00d4ff]/20 animate-[spin_16s_linear_infinite_reverse]" />

                      <div className="relative z-10 flex items-center justify-center">
                        <ShieldMicLogo
                          size={38}
                          className="text-[#00f5d4] drop-shadow-[0_0_16px_rgba(0,245,212,0.85)]"
                          micClassName="animate-pulse drop-shadow-[0_0_10px_rgba(0,245,212,0.95)]"
                          strokeWidth={1.8}
                        />
                      </div>
                    </div>

                    <div className="w-44 h-1 bg-slate-800/80 rounded-full relative overflow-hidden border border-white/5 my-2 shadow-inner">
                      <div className="h-full w-20 bg-gradient-to-r from-transparent via-[#00f5d4] to-transparent animate-cyber-scan" />
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-[#00f5d4] animate-ping" />
                      <span className="text-xs font-mono uppercase tracking-wider text-[#00f5d4] font-semibold">
                        Acoustic & Semantic Telemetry Active
                      </span>
                    </div>

                    <p className="text-sm font-display font-medium text-white mb-1">
                      {analysisPhase}...
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 max-w-xs">
                      Evaluating waveform phonemes, phase continuity, and multilingual language signals.
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    icon={Sparkles}
                    onClick={runAnalysis}
                    disabled={!audioFile}
                    className="w-full py-4 text-base font-bold shadow-[0_0_20px_rgba(0,212,255,0.25)]"
                  >
                    Start Deep Audio Analysis
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
