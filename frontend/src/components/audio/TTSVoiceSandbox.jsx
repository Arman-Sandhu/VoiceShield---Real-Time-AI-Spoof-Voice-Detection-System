import React, { useState } from 'react';
import { Sparkles, Play, Pause, RefreshCw, Volume2, ShieldCheck, ArrowRight, AlertCircle, Bot, User, Check, Download } from 'lucide-react';
import Button from '../ui/Button';
import api from '../../services/api';
import { downloadFileToDevice } from '../../utils/fileDownloader';

const SCAM_PRESETS = [
  {
    category: 'CEO Wire Scam',
    title: 'Urgent Wire Transfer',
    voice: 'en-US-ChristopherNeural',
    text: 'Hello, this is the CEO speaking from transit. I need you to immediately process the pending vendor wire transfer before banking closes.'
  },
  {
    category: 'Bank Fraud Alert',
    title: 'Security OTP Verification',
    voice: 'en-US-JennyNeural',
    text: 'This is an automated alert from your bank fraud prevention team. A suspicious debit of 950 dollars was detected. Please share the verification code sent to your mobile.'
  },
  {
    category: 'Family Distress',
    title: 'Emergency Money Request',
    voice: 'en-GB-RyanNeural',
    text: 'Hi Mom, I am stranded at the international terminal and my luggage was stolen. Please wire 400 pounds to this emergency account right now.'
  },
  {
    category: 'Digital Arrest (Hindi)',
    title: 'Police Extortion Lure',
    voice: 'hi-IN-MadhurNeural',
    text: 'नमस्ते, मैं क्राइम ब्रांच साइबर पुलिस से बोल रहा हूँ। आपके नाम पर गैरकानूनी पार्सल ज़ब्त हुआ है, तुरंत संपर्क करें अन्यथा गिरफ़्तारी होगी।'
  }
];

const VOICES = [
  { id: 'hi-IN-MadhurNeural', name: 'Madhur', gender: 'Male', lang: 'Hindi (India)', tone: 'Authoritative Hindi' },
  { id: 'hi-IN-SwaraNeural', name: 'Swara', gender: 'Female', lang: 'Hindi (India)', tone: 'Expressive Hindi' },
  { id: 'en-IN-PrabhatNeural', name: 'Prabhat', gender: 'Male', lang: 'English (India)', tone: 'Support / Tech Accent' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja', gender: 'Female', lang: 'English (India)', tone: 'Customer Service' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'Male', lang: 'English (US)', tone: 'Executive / Corporate' },
  { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Female', lang: 'English (US)', tone: 'Natural / Conversational' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'Male', lang: 'English (UK)', tone: 'British Formal' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'Female', lang: 'English (UK)', tone: 'British Calm' }
];

export default function TTSVoiceSandbox({ onAudioReady, onReset, onAutoAnalyze }) {
  const [text, setText] = useState(SCAM_PRESETS[0].text);
  const [selectedVoice, setSelectedVoice] = useState('en-US-ChristopherNeural');
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [generatedBlob, setGeneratedBlob] = useState(null);
  const [generatedFile, setGeneratedFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElem, setAudioElem] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const isHindiText = /[\u0900-\u097F]/.test(text);

  const handleGenerate = async (targetText = null, targetVoice = null) => {
    const payloadText = (targetText || text).trim();
    let payloadVoice = targetVoice || selectedVoice;

    if (!payloadText) {
      setErrorMessage('Please enter text to synthesize.');
      return;
    }

    // Auto-detect Hindi script: English-only voice models fail on Devanagari Unicode.
    // Gracefully route to native Hindi voice matching selected gender:
    if (/[\u0900-\u097F]/.test(payloadText) && !payloadVoice.startsWith('hi-IN')) {
      const voiceInfo = VOICES.find((v) => v.id === payloadVoice);
      payloadVoice = voiceInfo?.gender === 'Female' ? 'hi-IN-SwaraNeural' : 'hi-IN-MadhurNeural';
      setSelectedVoice(payloadVoice);
    }

    setGenerating(true);
    setErrorMessage(null);
    if (audioElem) {
      audioElem.pause();
      setIsPlaying(false);
    }

    try {
      const response = await api.post(
        '/tts/generate',
        { text: payloadText, voice: payloadVoice },
        { responseType: 'blob' }
      );

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const fileName = `Synthetic_${payloadVoice.replace('Neural', '')}_${Date.now()}.mp3`;
      const file = new File([blob], fileName, { type: 'audio/mpeg' });

      setAudioUrl(url);
      setGeneratedBlob(blob);
      setGeneratedFile(file);

      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      setAudioElem(audio);

      if (onAudioReady) {
        onAudioReady(file, blob);
      }
    } catch (err) {
      let msg = err.message || 'Failed to synthesize speech audio.';
      if (err.response?.data instanceof Blob) {
        try {
          const raw = await err.response.data.text();
          const parsed = JSON.parse(raw);
          if (parsed.detail) msg = parsed.detail;
        } catch (_) {}
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      if (err.response?.status === 404) {
        msg = 'Cloud TTS service is booting up. Please retry in 10-15 seconds.';
      }
      setErrorMessage(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handlePresetClick = (preset) => {
    setText(preset.text);
    setSelectedVoice(preset.voice);
    handleGenerate(preset.text, preset.voice);
  };

  const togglePlayback = () => {
    if (!audioElem) return;
    if (isPlaying) {
      audioElem.pause();
      setIsPlaying(false);
    } else {
      audioElem.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleDownloadAudio = async () => {
    if (!generatedBlob && !audioUrl) return;
    const fileName = generatedFile?.name || `VoiceShield_Synthetic_${Date.now()}.mp3`;
    await downloadFileToDevice(generatedBlob, fileName, 'audio/mpeg');
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs font-mono text-[#00d4ff] uppercase tracking-wider">
          <Bot size={15} />
          <span>AI Deepfake Synthesis Testing Laboratory</span>
        </div>
        <h3 className="text-xl font-display font-bold text-white">
          Generate Synthetic Voice & Test Detector
        </h3>
        <p className="text-xs text-slate-400">
          Synthesize high-fidelity neural AI voices using Edge Neural TTS and immediately feed the audio into VoiceShield to observe real-time detection accuracy.
        </p>
      </div>

      <div>
        <label className="block text-xs font-mono uppercase text-slate-400 mb-2">
          Preset Vishing / Social Engineering Scenarios:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {SCAM_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className="p-3 rounded-xl bg-[#0f1117] border border-white/5 hover:border-[#00d4ff]/40 text-left transition-all hover:bg-white/[0.03] group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#00d4ff] group-hover:bg-[#00d4ff]/10">
                  {preset.category}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {preset.voice.includes('hi-IN') ? 'Hindi' : 'English'}
                </span>
              </div>
              <h5 className="text-xs font-display font-semibold text-white group-hover:text-[#00d4ff] transition-colors truncate">
                {preset.title}
              </h5>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-sans">
                {preset.text}
              </p>
            </button>
          ))}
        </div>
      </div>

      {isHindiText && !selectedVoice.startsWith('hi-IN') && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span>
            Hindi Devanagari text detected. English voices cannot pronounce Hindi script; audio will automatically synthesize using <strong>Madhur (Hindi Neural)</strong>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
            Voice Persona & Gender
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full bg-[#161b27] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#00d4ff] font-mono cursor-pointer"
          >
            <optgroup label="Hindi Neural Voices (Required for Hindi text)">
              {VOICES.filter((v) => v.lang.includes('Hindi')).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.gender === 'Male' ? '♂️' : '♀️'} {v.name} ({v.lang}) - {v.tone}
                </option>
              ))}
            </optgroup>
            <optgroup label="English Neural Voices (For English text)">
              {VOICES.filter((v) => !v.lang.includes('Hindi')).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.gender === 'Male' ? '♂️' : '♀️'} {v.name} ({v.lang}) - {v.tone}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
            Target Language Accent
          </label>
          <div className="p-2.5 rounded-xl bg-[#161b27] border border-white/5 text-xs font-mono text-slate-300 flex items-center justify-between">
            <span>{VOICES.find((v) => v.id === selectedVoice)?.lang}</span>
            <span className="text-[#00d4ff] font-bold">
              {VOICES.find((v) => v.id === selectedVoice)?.gender}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-mono uppercase text-slate-400">
            Speech Synthesis Text Prompt
          </label>
          <span className="text-[11px] font-mono text-slate-500">
            {text.length} characters
          </span>
        </div>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter the speech text that will be synthesized..."
          className="w-full bg-[#161b27] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#00d4ff] focus:ring-1 focus:ring-[#00d4ff]/30 font-sans resize-none"
        />
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          icon={generating ? RefreshCw : Sparkles}
          isLoading={generating}
          onClick={() => handleGenerate()}
          className="w-full sm:w-auto"
        >
          {generating ? 'Synthesizing Audio...' : 'Generate Synthetic Voice'}
        </Button>

        {audioUrl && (
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1 justify-between sm:justify-start p-2 rounded-xl bg-[#161b27] border border-white/10">
            <button
              type="button"
              onClick={togglePlayback}
              className="px-3 py-2 rounded-lg bg-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/30 transition-colors flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAudio}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer"
              title="Download generated synthetic speech audio"
            >
              <Download size={14} className="text-[#00d4ff]" />
              <span>Download Audio</span>
            </button>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 truncate ml-auto sm:ml-2">
              <Check size={13} /> Ready for Detection
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

