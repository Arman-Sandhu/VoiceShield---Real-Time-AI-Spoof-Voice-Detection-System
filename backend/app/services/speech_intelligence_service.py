import re
import threading
import torch
import numpy as np
from typing import Dict, Any, Tuple
from transformers import WhisperProcessor, WhisperForConditionalGeneration


SENSITIVE_PATTERNS = [
    r"\b(otp|one time password|pin|cvv|password|passcode)\b",
    r"\b(bank account|account number|routing number|ifsc)\b",
    r"\b(wire transfer|transfer money|send cash|send money|western union)\b",
    r"\b(credit card|debit card|atm card|card details)\b",
    r"\b(gift card|crypto|bitcoin|usdt|ethereum)\b",
    r"\b(upi|google pay|gpay|phonepe|paytm)\b",
    # Monetary amounts and financial demands (e.g. 5000 rs, 5000 rupees, send 5000, 5000 bhej de)
    r"\b(\d+\s*(?:rs|rupees|inr|k|thousand|bucks|lakh|crore|\$|₹))\b",
    r"\b(send|transfer|pay|bhej|bhejo|dedo|give)\s+(\d+|money|cash)\b",
    r"\b(\d+)\s*(?:rs|rupees|inr|k|thousand|bucks|₹)?\s*(?:bhej|bhejo|transfer|dedo|de|dal do|daal do)\b",
    r"\b(bhej de|bhejo|paise bhej|rupaye bhej|transfer kar|transfer karo)\b",
    r"\b(need money|borrow money|lend money|send cash|deposit cash)\b",
    r"(ओटीपी|पिन|पासवर्ड|खाता|बैंक खाता|ट्रांसफर|रुपये|पैसे|कार्ड नंबर|भेज दे|भेजो|उधार)"
]

URGENCY_PATTERNS = [
    r"\b(immediately|right now|urgent|urgently|emergency)\b",
    r"\b(within \d+ minutes|before it'?s too late|last chance)\b",
    r"\b(arrest|warrant|police|court|legal action|law enforcement)\b",
    r"\b(blocked|suspended|deactivated|frozen|terminated)\b",
    r"\b(don'?t hang up|stay on the line|penalty|fine)\b",
    r"\b(digital arrest|customs seizure|cbi|fbi|narcotics)\b",
    # Accident, distress, medical emergencies and rush tactics
    r"\b(hurry|hurry up|rush|run|reach fast|come fast|come quick|fast|quick|quickly)\b",
    r"\b(accident|car crash|crash|injured|injury|casualty|ambulance|hospital|doctor|icu|operation|surgery|critical|died|life and death)\b",
    r"\b(need you to come|come to|reach to|reach soon|pick me up|help me|save me)\b",
    r"\b(kidnap|kidnapped|hostage|ransom|in danger|trouble)\b",
    r"(तुरंत|अभी|जल्दी|इमरजेंसी|अरेस्ट|पुलिस|वारंट|खाता बंद|ब्लॉक|एफआईआर|एक्सीडेंट|अस्पताल|मदद)"
]

AUTHORITY_PATTERNS = [
    r"\b(calling from|speaking from|this is the|on behalf of)\b",
    r"\b(department|headquarters|central bureau|support team)\b",
    r"\b(fraud prevention|security team|investigation bureau)\b",
    r"\b(customs|telecom regulatory|rbi|reserve bank|state bank)\b",
    r"\b(fedex|dhl|courier|delivery agent)\b",
    # Family impersonation lures commonly used in emergency vishing
    r"\b(your dad|your mom|your father|your mother|your son|your daughter|brother|sister)\b",
    r"\b(dad go into|father had an|mom had an|brother had an)\b",
    r"(बोल रहा हूँ|विभाग से|क्राइम ब्रांच|हेडक्वार्टर|कस्टमर केयर|बैंक से|कस्टम|पिताजी|माताजी|भाई)"
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
            # Try loading from local cache first to prevent getaddrinfo network delays
            try:
                self.processor = WhisperProcessor.from_pretrained(self.model_name, local_files_only=True)
                self.model = WhisperForConditionalGeneration.from_pretrained(self.model_name, local_files_only=True)
            except Exception:
                self.processor = WhisperProcessor.from_pretrained(self.model_name)
                self.model = WhisperForConditionalGeneration.from_pretrained(self.model_name)

            self.model.to(self.device)
            self.model.eval()
            self.lang_to_id = getattr(self.model.generation_config, "lang_to_id", {})
            self.is_loaded = True
        except Exception:
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

            # Filter initial dead silence so quiet intro doesn't bias toward English token prior
            segment = audio_data
            non_silent = segment[np.abs(segment) > 0.008]
            if len(non_silent) > 8000:
                segment = non_silent[:min(len(non_silent), 16000 * 8)]
            else:
                segment = segment[:min(len(segment), 16000 * 8)]

            inputs = self.processor(segment, sampling_rate=sampling_rate, return_tensors="pt")
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

            # Robust relative language identification:
            # If Hindi is strong or higher than English, prioritize Hindi
            if hi_prob > 0.40 and en_prob > 0.20:
                return {
                    "language": "Hinglish (Hindi + English)",
                    "language_code": "hinglish",
                    "confidence": round(float(hi_prob + en_prob) / 1.5, 4),
                    "is_multilingual": True
                }
            elif hi_prob > en_prob or hi_prob >= 0.12:
                conf = max(hi_prob, 0.85) if hi_prob > en_prob else (hi_prob * 3.0)
                return {
                    "language": "Hindi",
                    "language_code": "hi",
                    "confidence": round(min(0.98, float(conf)), 4),
                    "is_multilingual": False
                }
            else:
                return {
                    "language": "English",
                    "language_code": "en",
                    "confidence": round(float(max(en_prob, 0.90)), 4),
                    "is_multilingual": False
                }
        except Exception:
            return {
                "language": "English",
                "language_code": "en",
                "confidence": 0.90,
                "is_multilingual": False
            }

    def infer_contextual_risk(
        self,
        audio_data: np.ndarray,
        sampling_rate: int = 16000,
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Infers contextual threat signals from audio.
        Per system specification: Hindi audio bypasses transcription to avoid cross-language hallucinations.
        English audio undergoes complete transcription and threat pattern matching.
        """
        # User requirement: For Hindi audio, DO NOT transcribe to avoid hallucinating gibberish
        if language_code.lower() in ["hi", "hindi"]:
            return {
                "transcript": "",
                "is_caller_unknown": False,
                "is_sensitive_request": False,
                "urgency_flag": False,
                "detected_triggers": []
            }

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
                    max_new_tokens=60
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
