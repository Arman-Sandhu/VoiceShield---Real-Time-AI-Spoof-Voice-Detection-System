import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, CheckCircle2, AlertCircle, Download, Scissors, Pencil, Check, X } from 'lucide-react';
import Button from '../ui/Button';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';
import AudioPlayer from './AudioPlayer';
import AudioCropper from './AudioCropper';
import { encodeWAV } from '../../utils/wavEncoder';

export default function AudioRecorder({ onAudioReady, onReset }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedFile, setRecordedFile] = useState(null);
  const [recordedFileName, setRecordedFileName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [customName, setCustomName] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [audioStream, setAudioStream] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    progress: 0,
    audioRef: null
  });

  const timerIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const recordedSamplesRef = useRef([]);
  const sampleRateRef = useRef(16000);

  // Timer update
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    setErrorMessage(null);
    setRecordedBlob(null);
    setRecordedFileName('');
    setRecordingTime(0);
    setPlaybackState({ isPlaying: false, progress: 0, audioRef: null });
    recordedSamplesRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      mediaStreamRef.current = stream;
      setAudioStream(stream);

      // Setup Web Audio API pipeline using hardware native sample rate
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate;

      const source = audioCtx.createMediaStreamSource(stream);
      // ScriptProcessorNode buffers mono audio
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Clone samples into storage buffer
        recordedSamplesRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setErrorMessage(
        'Microphone access was denied or is unavailable. Please grant microphone permissions in your browser.'
      );
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    // Stop microphone stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Disconnect audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    // Flatten recorded Float32Array chunks into single continuous buffer
    const chunks = recordedSamplesRef.current;
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const flatSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      flatSamples.set(chunk, offset);
      offset += chunk.length;
    }

    // Use actual hardware sample rate from AudioContext
    const sr = sampleRateRef.current || 44100;

    // Minimum recording validation (at least 1 second of audio)
    if (flatSamples.length < sr) {
      setErrorMessage('Recording is too short (under 1 second). Please speak for at least 2-3 seconds.');
      setRecordedBlob(null);
      if (onReset) onReset();
      return;
    }

    // Generate unique ID and timestamp for filename: VoiceShield_id_time format
    const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = new Date();
    const timeFormatted = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `VoiceShield_${uniqueId}_${timeFormatted}.wav`;
    setRecordedFileName(fileName);

    // Encode to standard 16-bit PCM WAV at the genuine hardware sample rate
    const wavBlob = encodeWAV(flatSamples, sr);
    const wavFile = new File([wavBlob], fileName, { type: 'audio/wav' });

    setRecordedBlob(wavBlob);
    setRecordedFile(wavFile);
    setAudioStream(null);

    if (onAudioReady) {
      onAudioReady(wavFile, wavBlob);
    }
  };

  const handleCropComplete = (newFile, newBlob) => {
    setRecordedFile(newFile);
    setRecordedBlob(newBlob);
    setRecordedFileName(newFile.name);
    setPlaybackState({ isPlaying: false, progress: 0, audioRef: null });
    setShowCropper(false);
    if (onAudioReady) {
      onAudioReady(newFile, newBlob);
    }
  };

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = recordedFileName || `VoiceShield_REC_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);
  };

  const handleStartRename = () => {
    if (!recordedFileName) return;
    setCustomName(recordedFileName);
    setIsEditingName(true);
  };

  const handleSaveRename = (e) => {
    if (e) e.preventDefault();
    let trimmed = customName.trim();
    if (!trimmed) {
      setIsEditingName(false);
      return;
    }
    if (!trimmed.toLowerCase().endsWith('.wav')) {
      trimmed += '.wav';
    }
    setRecordedFileName(trimmed);
    setIsEditingName(false);
    if (recordedBlob) {
      const newFile = new File([recordedBlob], trimmed, { type: 'audio/wav' });
      setRecordedFile(newFile);
      if (onAudioReady) {
        onAudioReady(newFile, recordedBlob);
      }
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordedFile(null);
    setRecordedFileName('');
    setIsEditingName(false);
    setCustomName('');
    setShowCropper(false);
    setRecordingTime(0);
    setErrorMessage(null);
    setPlaybackState({ isPlaying: false, progress: 0, audioRef: null });
    recordedSamplesRef.current = [];
    if (onReset) onReset();
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Live Waveform or Static Preview */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {isRecording ? 'Live Microphone Stream' : recordedBlob ? 'Recorded Audio Sample' : 'Acoustic Monitor'}
          </span>
          {isRecording && (
            <span className="flex items-center gap-2 text-xs font-mono text-rose-400 font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              REC {formatTimer(recordingTime)}
            </span>
          )}
        </div>

        <AudioWaveformVisualizer
          stream={audioStream}
          isRecording={isRecording}
          audioBlob={recordedBlob}
          isPlaying={playbackState.isPlaying}
          playbackProgress={playbackState.progress}
          audioRef={playbackState.audioRef}
          height={recordedBlob ? 125 : 215}
        />
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Recording Controls */}
      {!recordedBlob ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f1117] border border-white/[0.08]">
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-semibold text-white">Direct Voice Recording</h4>
            <p className="text-xs text-slate-400">
              {isRecording
                ? 'Speak clearly into your microphone in English...'
                : 'Click record to capture live speech (min 2-3 seconds).'}
            </p>
          </div>

          <div>
            {!isRecording ? (
              <Button
                variant="primary"
                onClick={startRecording}
                icon={Mic}
                className="shadow-[0_0_20px_rgba(0,212,255,0.3)]"
              >
                Start Recording
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={stopRecording}
                icon={Square}
                className="animate-pulse"
              >
                Stop & Capture ({formatTimer(recordingTime)})
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Preview Player and Actions */
        <div className="flex flex-col gap-4">
          {showCropper ? (
            <AudioCropper
              audioFile={recordedFile}
              audioBlob={recordedBlob}
              onCropComplete={handleCropComplete}
              onCancel={() => setShowCropper(false)}
            />
          ) : (
            <>
              <AudioPlayer
                audioBlob={recordedBlob}
                fileName={recordedFileName || "Microphone Recording.wav"}
                showWaveform={false}
                onPlaybackChange={setPlaybackState}
              />

              {/* 3 Action Buttons aligned in one line */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCropper(true)}
                  icon={Scissors}
                  className="w-full justify-center text-xs"
                  title="Crop or trim audio selection"
                >
                  Crop Audio
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadRecording}
                  icon={Download}
                  className="w-full justify-center text-xs"
                  title="Download recorded WAV file to device"
                >
                  Download WAV
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={discardRecording}
                  icon={Trash2}
                  className="w-full justify-center text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  Re-record
                </Button>
              </div>

              {/* Green status line placed under the 3 buttons with rename capability */}
              <div className="flex items-center justify-between gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                  {isEditingName ? (
                    <form onSubmit={handleSaveRename} className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        className="bg-[#161b27] border border-emerald-500/50 rounded-lg px-2 py-0.5 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-emerald-400 w-full max-w-xs"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                        title="Save name"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1 rounded bg-white/5 text-slate-400 hover:text-white transition-colors"
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{recordedFileName || 'Voice captured & ready for AI verification'}</span>
                      {recordedFileName && (
                        <button
                          type="button"
                          onClick={handleStartRename}
                          className="p-1 rounded text-emerald-400/70 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors shrink-0"
                          title="Rename recorded file"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
