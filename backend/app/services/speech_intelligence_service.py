import re
import threading
import torch
import numpy as np
from typing import Dict, Any, Tuple
from transformers import WhisperProcessor, WhisperForConditionalGeneration


SENSITIVE_PATTERNS = [
    r"\b(otp|one time password|pin|cvv|password|passcode)\b",
    r"\b(bank account|account number|routing number|ifsc)\b",
    r"\b(wire transfer|transfer money|send cash|western union)\b",
    r"\b(credit card|debit card|atm card|card details)\b",
    r"\b(gift card|crypto|bitcoin|usdt|ethereum)\b",
    r"\b(upi|google pay|gpay|phonepe|paytm)\b",
    r"(ओटीपी|पिन|पासवर्ड|खाता|बैंक खाता|ट्रांसफर|रुपये|पैसे|कार्ड नंबर)"
]

URGENCY_PATTERNS = [
    r"\b(immediately|right now|urgent|urgently|emergency)\b",
    r"\b(within \d+ minutes|before it'?s too late|last chance)\b",
    r"\b(arrest|warrant|police|court|legal action|law enforcement)\b",
    r"\b(blocked|suspended|deactivated|frozen|terminated)\b",
    r"\b(don'?t hang up|stay on the line|penalty|fine)\b",
    r"\b(digital arrest|customs seizure|cbi|fbi|narcotics)\b",
    r"(तुरंत|अभी|जल्दी|इमरजेंसी|अरेस्ट|पुलिस|वारंट|खाता बंद|ब्लॉक|एफआईआर)"
]

AUTHORITY_PATTERNS = [
    r"\b(calling from|speaking from|this is the|on behalf of)\b",
    r"\b(department|headquarters|central bureau|support team)\b",
    r"\b(fraud prevention|security team|investigation bureau)\b",
    r"\b(customs|telecom regulatory|rbi|reserve bank|state bank)\b",
    r"\b(fedex|dhl|courier|delivery agent)\b",
    r"(बोल रहा हूँ|विभाग से|क्राइम ब्रांच|हेडक्वार्टर|कस्टमर केयर|बैंक से|कस्टम)"
]

class SpeechIntelligenceService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(SpeechIntelligenceService, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self.device = torch.device("cpu")
        self.model_name = "openai/whisper-tiny"
        self.processor = None
        self.model = None
        self.lang_to_id = {}
        self.is_loaded = False
        self._load_model()
        self._initialized = True

    def _load_model(self):
        try:
            self.processor = WhisperProcessor.from_pretrained(self.model_name)
            self.model = WhisperForConditionalGeneration.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()
            self.lang_to_id = getattr(self.model.generation_config, "lang_to_id", {})
            self.is_loaded = True
        except Exception as e:
            self.is_loaded = False

    def detect_language(self, audio_data: np.ndarray, sampling_rate: int = 16000) -> Dict[str, Any]:
        if not self.is_loaded or self.processor is None or self.model is None or len(audio_data) < 4000:
            return {
                "language": "English",
                "language_code": "en",
                "confidence": 0.95,
                "is_multilingual": False
            }

        try:
            active_device = self.device

            audio_segment = audio_data[:min(len(audio_data), 16000 * 10)]
            inputs = self.processor(audio_segment, sampling_rate=sampling_rate, return_tensors="pt")
            input_features = inputs.input_features.to(active_device)
            decoder_input_ids = torch.tensor([[self.model.config.decoder_start_token_id]], device=active_device)

            with torch.no_grad():
                out = self.model(input_features, decoder_input_ids=decoder_input_ids)
                hi_id = self.lang_to_id.get("<|hi|>")
                en_id = self.lang_to_id.get("<|en|>")

                all_ids = list(self.lang_to_id.values())
                logits = out.logits[0, -1, all_ids]
                probs = torch.softmax(logits, dim=-1)

                id_to_prob = {tok_id: probs[i].item() for i, tok_id in enumerate(all_ids)}
                hi_prob = id_to_prob.get(hi_id, 0.0)
                en_prob = id_to_prob.get(en_id, 0.0)

            if hi_prob > 0.45 and en_prob > 0.25:
                return {
                    "language": "Hinglish (Hindi + English)",
                    "language_code": "hinglish",
                    "confidence": round(float(hi_prob + en_prob) / 1.5, 4),
                    "is_multilingual": True
                }
            elif hi_prob >= en_prob and hi_prob > 0.35:
                return {
                    "language": "Hindi",
                    "language_code": "hi",
                    "confidence": round(float(hi_prob), 4),
                    "is_multilingual": False
                }
            else:
                return {
                    "language": "English",
                    "language_code": "en",
                    "confidence": round(float(max(en_prob, 0.85)), 4),
                    "is_multilingual": False
                }
        except Exception:
            return {
                "language": "English",
                "language_code": "en",
                "confidence": 0.90,
                "is_multilingual": False
            }

    def infer_contextual_risk(self, audio_data: np.ndarray, sampling_rate: int = 16000) -> Dict[str, Any]:
        if not self.is_loaded or self.processor is None or self.model is None or len(audio_data) < 8000:
            return {
                "transcript": "",
                "is_caller_unknown": False,
                "is_sensitive_request": False,
                "urgency_flag": False,
                "detected_triggers": []
            }

        try:
            active_device = self.device

            audio_segment = audio_data[:min(len(audio_data), 16000 * 15)]
            inputs = self.processor(audio_segment, sampling_rate=sampling_rate, return_tensors="pt")
            input_features = inputs.input_features.to(active_device)

            with torch.no_grad():
                predicted_ids = self.model.generate(
                    input_features,
                    max_new_tokens=40
                )
                transcription = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()

            lower_text = transcription.lower()
            detected_triggers = []

            is_sensitive = False
            for p in SENSITIVE_PATTERNS:
                if re.search(p, lower_text, re.IGNORECASE):
                    is_sensitive = True
                    detected_triggers.append("Sensitive Financial / Credential Request")
                    break

            is_urgent = False
            for p in URGENCY_PATTERNS:
                if re.search(p, lower_text, re.IGNORECASE):
                    is_urgent = True
                    detected_triggers.append("Psychological Urgency Tactics")
                    break

            is_unknown = False
            for p in AUTHORITY_PATTERNS:
                if re.search(p, lower_text, re.IGNORECASE):
                    is_unknown = True
                    detected_triggers.append("Unverified Authority / Caller Outreach")
                    break

            return {
                "transcript": transcription,
                "is_caller_unknown": is_unknown,
                "is_sensitive_request": is_sensitive,
                "urgency_flag": is_urgent,
                "detected_triggers": detected_triggers
            }
        except Exception:
            return {
                "transcript": "",
                "is_caller_unknown": False,
                "is_sensitive_request": False,
                "urgency_flag": False,
                "detected_triggers": []
            }

speech_intelligence = SpeechIntelligenceService()



