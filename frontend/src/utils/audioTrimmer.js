import { encodeWAV } from './wavEncoder';

/**
 * Client-side high-fidelity audio cropper/trimmer.
 * Slices any audio file/blob from startTime to endTime,
 * downmixes to mono, resamples to 16,000 Hz, and encodes
 * into a standard 16-bit PCM WAV compatible with Wav2Vec2 inference.
 *
 * @param {File|Blob} fileOrBlob - Input audio file or blob
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {string} [newFileName] - Optional desired filename
 * @returns {Promise<{ blob: Blob, file: File, duration: number, fileName: string }>}
 */
export async function cropAudioFile(fileOrBlob, startTime, endTime, newFileName) {
  if (!fileOrBlob) throw new Error('No audio file provided to crop.');

  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const tempCtx = new AudioContextClass();
  
  let audioBuffer;
  try {
    audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
  } finally {
    try {
      await tempCtx.close();
    } catch (e) {
      // Ignored
    }
  }

  const originalSampleRate = audioBuffer.sampleRate;
  const totalDuration = audioBuffer.duration;

  const clampedStart = Math.max(0, Math.min(startTime, totalDuration));
  const clampedEnd = Math.max(clampedStart + 0.1, Math.min(endTime, totalDuration));
  const croppedDuration = clampedEnd - clampedStart;

  const startSample = Math.floor(clampedStart * originalSampleRate);
  const endSample = Math.min(audioBuffer.length, Math.floor(clampedEnd * originalSampleRate));
  const sampleLength = Math.max(1, endSample - startSample);

  // Extract mono channel data
  const numChannels = audioBuffer.numberOfChannels;
  const monoSamples = new Float32Array(sampleLength);

  if (numChannels === 1) {
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < sampleLength; i++) {
      monoSamples[i] = channel[startSample + i];
    }
  } else {
    // Average stereo channels into mono
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.getChannelData(1);
    for (let i = 0; i < sampleLength; i++) {
      monoSamples[i] = (ch0[startSample + i] + ch1[startSample + i]) / 2;
    }
  }

  // Target 16,000 Hz for Wav2Vec2 inference
  let finalSamples = monoSamples;
  const targetSampleRate = 16000;

  if (originalSampleRate !== targetSampleRate) {
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.ceil(croppedDuration * targetSampleRate),
      targetSampleRate
    );
    const tempAudioBuf = offlineCtx.createBuffer(1, monoSamples.length, originalSampleRate);
    tempAudioBuf.copyToChannel(monoSamples, 0);

    const source = offlineCtx.createBufferSource();
    source.buffer = tempAudioBuf;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    finalSamples = renderedBuffer.getChannelData(0);
  }

  // Encode to 16-bit PCM WAV
  const wavBlob = encodeWAV(finalSamples, targetSampleRate);
  
  let finalName = newFileName;
  if (!finalName) {
    const baseName = fileOrBlob.name ? fileOrBlob.name.replace(/\.[^/.]+$/, '') : `VoiceShield_REC_${Date.now()}`;
    finalName = `${baseName}_cropped.wav`;
  }

  const wavFile = new File([wavBlob], finalName, { type: 'audio/wav' });

  return {
    blob: wavBlob,
    file: wavFile,
    duration: Math.round(croppedDuration * 100) / 100,
    fileName: finalName
  };
}
