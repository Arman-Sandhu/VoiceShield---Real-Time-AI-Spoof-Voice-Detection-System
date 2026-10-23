import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import Button from '../ui/Button';
import AudioWaveformVisualizer from './AudioWaveformVisualizer';
import AudioPlayer from './AudioPlayer';
import { encodeWAV } from '../../utils/wavEncoder';

export default function AudioRecorder({ onAudioReady, onReset }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedFileName, setRecordedFileName] = useState('');
  const [audioStream, setAudioStream] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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
    setAudioStream(null);

    if (onAudioReady) {
      onAudioReady(wavFile, wavBlob);
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

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordedFileName('');
    setRecordingTime(0);
    setErrorMessage(null);
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
          height={110}
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
          <AudioPlayer audioBlob={recordedBlob} title={recordedFileName || "Microphone Recording"} />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <CheckCircle2 size={16} />
              <span className="truncate max-w-xs">{recordedFileName || 'Voice captured & ready for AI verification'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadRecording}
                icon={Download}
                title="Download recorded WAV file to device"
              >
                Download WAV
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={discardRecording}
                icon={Trash2}
              >
                Re-record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
