import librosa
import numpy as np
import io
import soundfile as sf

def preprocess_audio(file_bytes: bytes, target_sr=16000):
    """
    Load audio from bytes, resample to target_sr, normalize amplitude, 
    and trim silence.
    """
    try:
        # Load audio from bytes
        # sf.read can read from a file-like object
        data, sr = sf.read(io.BytesIO(file_bytes))
        
        # If stereo, convert to mono
        if len(data.shape) > 1:
            data = librosa.to_mono(data.T)
            
        # Resample if needed
        if sr != target_sr:
            data = librosa.resample(data, orig_sr=sr, target_sr=target_sr)
            
        # Normalize amplitude
        data = librosa.util.normalize(data)
        
        # Trim silence (top_db=20 is standard)
        data, _ = librosa.effects.trim(data, top_db=20)
        
        return data
    except Exception as e:
        print(f"Error processing audio: {e}")
        return None
