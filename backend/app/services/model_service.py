import logging
import threading
from typing import Dict, Any, Tuple
import numpy as np
import torch
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

from app.core.config import settings

logger = logging.getLogger("voiceshield.model_service")

class DeepfakeModelService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DeepfakeModelService, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self.model_name = settings.MODEL_NAME
        self.sampling_rate = settings.TARGET_SAMPLE_RATE
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.feature_extractor = None
        self.model = None
        self.id2label = {}
        self.label2id = {}
        self.is_loaded = False
        self.load_error = None
        self._init_model()
        self._initialized = True

    def _init_model(self):
        """Loads pretrained Wav2Vec2 audio deepfake classifier and feature extractor once."""
        try:
            logger.info(f"Loading speech deepfake detection model: {self.model_name} on device: {self.device}")
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name)
            self.model = AutoModelForAudioClassification.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()

            self.id2label = getattr(self.model.config, "id2label", {0: "fake", 1: "real"})
            self.label2id = getattr(self.model.config, "label2id", {"fake": 0, "real": 1})
            self.is_loaded = True
            logger.info(
                f"Model successfully loaded! Parameters: {sum(p.numel() for p in self.model.parameters()):,}, "
                f"Labels: {self.id2label}, Device: {self.device}"
            )
        except Exception as e:
            self.is_loaded = False
            self.load_error = str(e)
            logger.error(f"Failed to load ML model {self.model_name}: {e}", exc_info=True)

    def get_status(self) -> Dict[str, Any]:
        """Returns model status and architecture metadata."""
        return {
            "model_name": self.model_name,
            "architecture": "Wav2Vec2ForSequenceClassification",
            "is_loaded": self.is_loaded,
            "device": str(self.device),
            "sample_rate_hz": self.sampling_rate,
            "target_language": "English",
            "labels": self.id2label,
            "parameter_count": sum(p.numel() for p in self.model.parameters()) if self.model else 0,
            "error": self.load_error
        }

    def predict(self, audio_data: np.ndarray, duration_seconds: float, rms_energy: float) -> Dict[str, Any]:
        """
        Runs real deep acoustic inference using Wav2Vec2 sequence classification.
        
        Args:
            audio_data: 1D float32 numpy array resampled to 16,000 Hz.
            duration_seconds: Duration of the valid audio.
            rms_energy: Root mean square energy to detect silence.
            
        Returns:
            Dictionary with prediction label, fake_score, real_score, model metadata.
        """
        if not self.is_loaded or self.model is None or self.feature_extractor is None:
            raise RuntimeError(f"Deepfake detection model is not loaded: {self.load_error or 'Unknown error'}")

        # Quality check 1: Silent or empty audio
        if rms_energy < 0.001:
            return {
                "prediction": "INCONCLUSIVE",
                "fake_score": 0.0,
                "real_score": 0.0,
                "confidence": 0.0,
                "model_name": self.model_name,
                "reason": "Audio signal is silent or below minimum audible energy threshold."
            }

        # Quality check 2: Audio too short for sequence classification
        if duration_seconds < settings.MIN_AUDIO_DURATION_SEC:
            return {
                "prediction": "INCONCLUSIVE",
                "fake_score": 0.0,
                "real_score": 0.0,
                "confidence": 0.0,
                "model_name": self.model_name,
                "reason": f"Audio clip duration ({duration_seconds:.2f}s) is shorter than required minimum ({settings.MIN_AUDIO_DURATION_SEC}s)."
            }

        try:
            # Preprocess features using the model's native Wav2Vec2 feature extractor
            inputs = self.feature_extractor(
                audio_data,
                sampling_rate=self.sampling_rate,
                return_tensors="pt"
            )

            # Move inputs to target device (CPU/GPU)
            input_values = inputs.input_values.to(self.device)

            with torch.no_grad():
                outputs = self.model(input_values)
                logits = outputs.logits
                probs = torch.softmax(logits, dim=-1).squeeze().cpu().tolist()

            # Ensure probs is a 2-element list [fake_prob, real_prob]
            if isinstance(probs, float):
                probs = [probs, 1.0 - probs]

            # Label mapping from model config: 0 -> 'fake', 1 -> 'real'
            fake_score = float(probs[0])
            real_score = float(probs[1])

            # Primary classification
            if fake_score >= 0.50:
                prediction = "AI_GENERATED"
                confidence = fake_score
            else:
                prediction = "HUMAN_SPEECH"
                confidence = real_score

            logger.info(
                f"Inference completed: prediction={prediction}, fake_score={fake_score:.4f}, "
                f"real_score={real_score:.4f}, duration={duration_seconds:.2f}s"
            )

            return {
                "prediction": prediction,
                "fake_score": round(fake_score, 4),
                "real_score": round(real_score, 4),
                "confidence": round(confidence, 4),
                "model_name": self.model_name,
                "status": "success"
            }

        except Exception as e:
            logger.error(f"Error during ML model inference: {e}", exc_info=True)
            raise RuntimeError(f"Model inference failed: {str(e)}")

# Global singleton service
model_service = DeepfakeModelService()
