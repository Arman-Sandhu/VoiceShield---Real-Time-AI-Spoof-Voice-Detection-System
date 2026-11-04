import logging
from typing import Dict, Any, List
import numpy as np
import librosa

logger = logging.getLogger("voiceshield.biometric_service")

class AcousticBiometricEngine:
    """
    Language-independent acoustic biometric verification engine.
    Analyzes physical voice biomechanics (laryngeal micro-tremor, pitch jitter,
    dynamic vocoder phase harmonics, and ambient microphone floor) to differentiate
    authentic human vocal tract physics from synthetic AI voice models.
    """

    @staticmethod
    def analyze_biometrics(audio_data: np.ndarray, sr: int = 16000) -> Dict[str, Any]:
        """
        Analyzes audio samples for synthetic vs biological human vocal characteristics.
        
        Args:
            audio_data: 1D float32 numpy array resampled to 16kHz.
            sr: Sample rate in Hz (default 16,000).
            
        Returns:
            Dictionary containing:
                - bio_fake_prob: float (0.0 to 1.0)
                - pitch_jitter: float
                - pitch_std: float
                - mean_flatness: float
                - indicators: List[str]
                - is_human_biometrics: bool
        """
        if len(audio_data) < int(sr * 0.4):
            return {
                "bio_fake_prob": 0.5,
                "confidence": 0.0,
                "indicators": ["Audio sample duration too short for biometric profiling."],
                "is_human_biometrics": False
            }

        indicators: List[str] = []
        fake_evidence_points = 0.0
        total_checks = 4.0

        # --- 1. Vocal Tract Pitch Micro-Tremor & Jitter ---
        jitter = 0.0
        pitch_std = 0.0
        try:
            # Use YIN algorithm with frame_length=1024, hop_length=256 (~16ms hops)
            f0 = librosa.yin(audio_data, fmin=65, fmax=400, sr=sr, frame_length=1024, hop_length=256)
            voiced = f0[~np.isnan(f0)]
            if len(voiced) >= 12:
                p_mean = float(np.mean(voiced))
                pitch_std = float(np.std(voiced))
                diffs = np.abs(np.diff(voiced))
                jitter = float(np.mean(diffs) / (p_mean + 1e-6))
                
                # Check A: Hyper-smooth synthetic pitch (Absence of involuntary biological micro-tremor)
                # Human vocal fold vibration naturally produces jitter between 0.009 and 0.045
                if jitter < 0.0075:
                    fake_evidence_points += 1.4
                    indicators.append("Hyper-smooth pitch trajectory (lacks biological vocal cord micro-tremors).")
                elif jitter > 0.0095 and pitch_std > 8.0:
                    fake_evidence_points -= 1.0  # Strong natural human indicator
                    
                # Check B: Unnatural pitch monotonicity (flat robotic pitch synthesis)
                if pitch_std < 4.5 and len(voiced) > 25:
                    fake_evidence_points += 0.8
                    indicators.append("Monotonic pitch envelope typical of neural synthesis vocoders.")
        except Exception as e:
            logger.debug(f"Biometric pitch analysis notice: {e}")

        # --- 2. Spectral Flatness & Vocoder Synthesis Artifacts ---
        try:
            flatness = librosa.feature.spectral_flatness(y=audio_data, hop_length=256)
            mean_flatness = float(np.mean(flatness))
            flatness_std = float(np.std(flatness))

            # Modern neural vocoders (HiFi-GAN, BigVGAN, ElevenLabs) display distinctive
            # compressed spectral flatness distribution compared to authentic mic speech
            if mean_flatness < 0.00008:
                fake_evidence_points += 0.9
                indicators.append("Compressed spectral harmonic structure characteristic of neural vocoders.")
            elif mean_flatness > 0.0008 and flatness_std > 0.0015:
                fake_evidence_points -= 0.6  # Natural room acoustics & breathing variance
        except Exception as e:
            logger.debug(f"Biometric spectral flatness notice: {e}")

        # --- 3. Sub-band Spectral Contrast Dynamics ---
        try:
            contrast = librosa.feature.spectral_contrast(y=audio_data, sr=sr, hop_length=256)
            mean_contrast = float(np.mean(contrast))
            contrast_std = float(np.std(contrast))

            # Neural voice synthesis maintains rigid sub-band peak-to-valley separation
            if mean_contrast > 28.0 and contrast_std < 10.0:
                fake_evidence_points += 0.7
                indicators.append("Rigid sub-band spectral contrast across formants.")
            elif contrast_std > 12.0:
                fake_evidence_points -= 0.5
        except Exception as e:
            logger.debug(f"Biometric spectral contrast notice: {e}")

        # --- 4. Inter-Phoneme Silence Floor Analysis ---
        try:
            # Check if silent intervals have absolute zero or synthetic noise injection
            # Real mic speech contains ambient room noise floor (>-60dB)
            frame_length = int(sr * 0.03)  # 30ms frames
            num_frames = len(audio_data) // frame_length
            if num_frames > 4:
                frames = audio_data[:num_frames * frame_length].reshape(num_frames, frame_length)
                frame_rms = np.sqrt(np.mean(frames ** 2, axis=1))
                min_rms = float(np.min(frame_rms))
                
                # Digitally generated files have near-zero silence floor (< 1e-4)
                if min_rms < 0.00025:
                    fake_evidence_points += 0.8
                    indicators.append("Synthetic digital noise floor detected in pause intervals.")
                elif min_rms > 0.002:
                    fake_evidence_points -= 0.6  # Natural room ambient air floor
        except Exception as e:
            logger.debug(f"Biometric noise floor notice: {e}")

        # --- Normalize Evidence into Biometric Probability [0.0, 1.0] ---
        # Baseline probability is 0.50
        evidence_ratio = fake_evidence_points / total_checks
        bio_fake_prob = float(np.clip(0.50 + (evidence_ratio * 0.50), 0.02, 0.98))

        is_human = (bio_fake_prob < 0.35)

        return {
            "bio_fake_prob": bio_fake_prob,
            "jitter": round(jitter, 5),
            "pitch_std": round(pitch_std, 2),
            "indicators": indicators,
            "is_human_biometrics": is_human
        }

biometric_engine = AcousticBiometricEngine()

