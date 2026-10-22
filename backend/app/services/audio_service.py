import io
import logging
from typing import Tuple, Optional
import numpy as np
import soundfile as sf
import librosa

from app.core.config import settings

logger = logging.getLogger("voiceshield.audio_service")

class AudioProcessingError(Exception):
    pass

def process_audio(file_bytes: bytes, filename: str = "audio.wav") -> Tuple[np.ndarray, float, float]:
    """
    Decodes uploaded audio bytes, converts to 16kHz mono float32, normalizes amplitude,
    and calculates duration and RMS energy.
    
    Returns:
        Tuple of (audio_array: np.ndarray, duration_seconds: float, rms_energy: float)
    """
    if not file_bytes or len(file_bytes) < 100:
        raise AudioProcessingError("Uploaded audio file is empty or corrupted (under 100 bytes).")

    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise AudioProcessingError(
            f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_BYTES / (1024 * 1024):.1f}MB."
        )

    data: Optional[np.ndarray] = None
    sr: Optional[int] = None

    # Step 1: Attempt decoding via soundfile (WAV, MP3, FLAC, OGG)
    try:
        data, sr = sf.read(io.BytesIO(file_bytes))
    except Exception as sf_err:
        logger.warning(f"Soundfile decoding failed for '{filename}': {sf_err}. Attempting librosa/fallback...")
        try:
            # Fallback to librosa if soundfile failed
            data, sr = librosa.load(io.BytesIO(file_bytes), sr=None, mono=False)
        except Exception as lib_err:
            logger.error(f"Failed to decode audio file '{filename}': sf error: {sf_err}, librosa error: {lib_err}")
            raise AudioProcessingError(
                f"Unsupported or corrupted audio format in '{filename}'. "
                "Please upload a standard PCM WAV, MP3, FLAC, or OGG file."
            )

    if data is None or len(data) == 0:
        raise AudioProcessingError("Decoded audio contains no audio samples.")

    # Step 2: Convert stereo to mono
    if len(data.shape) > 1:
        if data.shape[0] == 2 and data.shape[1] > 2:
            data = librosa.to_mono(data)
        else:
            data = librosa.to_mono(data.T)

    # Ensure float32
    data = data.astype(np.float32)

    # Step 3: Resample to target sample rate (16,000 Hz) if needed
    target_sr = settings.TARGET_SAMPLE_RATE
    if sr != target_sr:
        try:
            data = librosa.resample(data, orig_sr=sr, target_sr=target_sr)
        except Exception as resample_err:
            raise AudioProcessingError(f"Error resampling audio from {sr}Hz to {target_sr}Hz: {resample_err}")

    # Step 4: Calculate pre-trim duration
    pre_trim_duration = len(data) / float(target_sr)

    # Step 5: Trim leading and trailing silence
    try:
        trimmed_data, _ = librosa.effects.trim(data, top_db=30)
        # Only use trimmed data if it retains sufficient length
        if len(trimmed_data) >= int(0.5 * target_sr):
            data = trimmed_data
    except Exception:
        pass

    # Step 6: Normalize amplitude to avoid clipping / extreme variance
    data = librosa.util.normalize(data)

    duration = float(len(data)) / float(target_sr)

    # Step 7: Calculate RMS energy to detect silent recordings
    rms_energy = float(np.sqrt(np.mean(data ** 2)))

    return data, duration, rms_energy
