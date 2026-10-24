import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, UploadCloud, Cpu, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ShieldMicLogo from '../components/ui/ShieldMicLogo';
import AudioRecorder from '../components/audio/AudioRecorder';
import AudioUploader from '../components/audio/AudioUploader';
import ContextForm from '../components/analysis/ContextForm';
import AnalysisResult from './AnalysisResult';

export default function VoiceAnalysis({ user, username }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('record'); // 'record' or 'upload'
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
      setErrorMessage('Please record or upload an audio clip before starting analysis.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);

    // Realistic progressive status sequence
    const phases = [
      'Validating & Normalizing Audio Buffer',
      'Running Wav2Vec2 Neural Feature Extractor',
      'Classifying Acoustic Deepfake Probabilities',
      'Synthesizing Contextual Social Engineering Risk',
      'Securing Audit Telemetry'
    ];

    let phaseIndex = 0;
    const interval = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setAnalysisPhase(phases[phaseIndex]);
    }, 600);

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('custom_file_name', audioFile.name);
    formData.append('is_caller_unknown', contextFlags.is_caller_unknown ? 'true' : 'false');
    formData.append('is_sensitive_request', contextFlags.is_sensitive_request ? 'true' : 'false');
    formData.append('urgency_flag', contextFlags.urgency_flag ? 'true' : 'false');
    formData.append('mode', activeTab);
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
      console.error('Analysis failed:', err);
      const msg =
        err.response?.data?.detail ||
        'Analysis pipeline failed. Please check audio format and try again.';
      setErrorMessage(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAll = () => {
    setAudioFile(null);
    setAudioBlob(null);
    setAnalysisResult(null);
    setErrorMessage(null);
    setContextFlags({
      is_caller_unknown: false,
      is_sensitive_request: false,
      urgency_flag: false
    });
  };

  // If analysis completed, render the full Analysis Result view
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span className="text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
              DETECTION STUDIO
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Voice Authenticity Workspace
            </h1>
          </div>
        </div>

        <Badge variant="cyan" size="md" icon={ShieldMicLogo}>
          Wav2Vec2 Real Inference
        </Badge>
      </div>

      {/* Main Workspace Layout - Aligned Grid with Optimized Margins */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Audio Source Tab Selection and Input */}
        <div className="lg:col-span-7 flex flex-col">
          <Card variant="elevated" className="p-6 sm:p-7 flex flex-col justify-between h-full">
            <div>
              {/* Input Method Tabs */}
              <div className="flex rounded-xl bg-[#0f1117] p-1.5 border border-white/[0.08] mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('record');
                  handleAudioReset();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'record'
                    ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic size={15} />
                <span>Microphone Record</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  handleAudioReset();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === 'upload'
                    ? 'bg-[#00d4ff]/15 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UploadCloud size={15} />
                <span>Upload Audio File</span>
              </button>
            </div>

            {/* Tab Panels */}
            {activeTab === 'record' ? (
              <AudioRecorder
                onAudioReady={handleAudioReady}
                onReset={handleAudioReset}
              />
            ) : (
              <AudioUploader
                onAudioReady={handleAudioReady}
                onReset={handleAudioReset}
              />
            )}
            </div>
          </Card>
        </div>

        {/* Right Column: Context Form and Action */}
        <div className="lg:col-span-5 flex flex-col">
          <Card variant="default" className="p-6 sm:p-7 flex flex-col justify-between h-full">
            <div>
              <ContextForm
                flags={contextFlags}
                onChange={setContextFlags}
              />

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            </div>

            {/* Action Button & Scanning Visualizer */}
            <div className="mt-6 pt-6 border-t border-white/[0.08]">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0f1117] border border-[#00d4ff]/30 text-center">
                  <div className="relative w-16 h-16 flex items-center justify-center mb-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#00d4ff] border-r-[#a855f7]"
                    />
                    <Cpu size={24} className="text-[#00d4ff] animate-pulse" />
                  </div>

                  <span className="text-xs font-mono uppercase text-[#00d4ff] tracking-wider font-semibold mb-1">
                    Running Neural Acoustic Model
                  </span>
                  <p className="text-xs text-slate-300 font-mono">
                    {analysisPhase}...
                  </p>
                </div>
              ) : (
                <Button
                  id="run-analysis-button"
                  data-testid="run-analysis-button"
                  variant="primary"
                  size="lg"
                  onClick={runAnalysis}
                  disabled={!audioFile}
                  icon={Sparkles}
                  className="w-full shadow-[0_0_25px_rgba(0,212,255,0.3)]"
                >
                  Analyze Voice Authenticity
                </Button>
              )}

              <p className="text-[11px] text-slate-500 text-center mt-3 font-mono">
                Audio is processed securely at 16,000 Hz. Raw audio is never permanently stored.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
