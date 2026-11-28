import io
import re
import asyncio
import edge_tts
from typing import List, Dict, Any

CURATED_VOICES = [
    {
        "id": "en-US-ChristopherNeural",
        "name": "Christopher (US)",
        "gender": "Male",
        "language": "English",
        "language_code": "en",
        "accent": "United States",
        "description": "Authoritative, professional tone often used in corporate & banking impersonation"
    },
    {
        "id": "en-US-JennyNeural",
        "name": "Jenny (US)",
        "gender": "Female",
        "language": "English",
        "language_code": "en",
        "accent": "United States",
        "description": "Natural conversational voice common in customer support & personal scam lures"
    },
    {
        "id": "en-GB-RyanNeural",
        "name": "Ryan (UK)",
        "gender": "Male",
        "language": "English",
        "language_code": "en",
        "accent": "British",
        "description": "Formal British accent suitable for executive and enterprise vishing tests"
    },
    {
        "id": "en-GB-SoniaNeural",
        "name": "Sonia (UK)",
        "gender": "Female",
        "language": "English",
        "language_code": "en",
        "accent": "British",
        "description": "Calm, structured British voice profile"
    },
    {
        "id": "en-IN-PrabhatNeural",
        "name": "Prabhat (India)",
        "gender": "Male",
        "language": "English",
        "language_code": "en",
        "accent": "Indian English",
        "description": "Indian English male tone widely observed in tech support & banking scams"
    },
    {
        "id": "en-IN-NeerjaNeural",
        "name": "Neerja (India)",
        "gender": "Female",
        "language": "English",
        "language_code": "en",
        "accent": "Indian English",
        "description": "Indian English female voice suited for automated verification testing"
    },
    {
        "id": "hi-IN-MadhurNeural",
        "name": "Madhur (Hindi)",
        "gender": "Male",
        "language": "Hindi",
        "language_code": "hi",
        "accent": "Hindi (India)",
        "description": "Authoritative Hindi male voice used in digital arrest & police extortion scams"
    },
    {
        "id": "hi-IN-SwaraNeural",
        "name": "Swara (Hindi)",
        "gender": "Female",
        "language": "Hindi",
        "language_code": "hi",
        "accent": "Hindi (India)",
        "description": "High-fidelity Hindi female voice for regional vishing scenarios"
    }
]

class TTSService:
    @staticmethod
    def get_voices() -> List[Dict[str, Any]]:
        return CURATED_VOICES

    @staticmethod
    async def synthesize(text: str, voice_id: str = "en-US-ChristopherNeural") -> bytes:
        clean_text = (text or "").strip()
        if not clean_text:
            raise ValueError("Text payload cannot be empty.")

        matched_voice = next((v["id"] for v in CURATED_VOICES if v["id"] == voice_id), None)
        if not matched_voice:
            matched_voice = "en-US-ChristopherNeural"

        # Check if text contains Hindi Devanagari characters (U+0900 to U+097F)
        is_devanagari = bool(re.search(r"[\u0900-\u097F]", clean_text))

        # English-only voices fail with 'No audio was received' when given Devanagari script.
        # Intelligently route to native Hindi voice matching selected gender:
        if is_devanagari and not matched_voice.startswith("hi-IN"):
            voice_info = next((v for v in CURATED_VOICES if v["id"] == matched_voice), None)
            if voice_info and voice_info.get("gender") == "Female":
                matched_voice = "hi-IN-SwaraNeural"
            else:
                matched_voice = "hi-IN-MadhurNeural"

        try:
            communicate = edge_tts.Communicate(clean_text, matched_voice)
            audio_buffer = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_buffer.write(chunk["data"])

            audio_bytes = audio_buffer.getvalue()
            if audio_bytes:
                return audio_bytes
        except Exception:
            # Resilient fallback if the selected voice encountered a synthesis exception
            fallback_voice = "hi-IN-MadhurNeural" if is_devanagari else "en-US-ChristopherNeural"
            if matched_voice != fallback_voice:
                communicate = edge_tts.Communicate(clean_text, fallback_voice)
                audio_buffer = io.BytesIO()
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_buffer.write(chunk["data"])
                audio_bytes = audio_buffer.getvalue()
                if audio_bytes:
                    return audio_bytes

        raise RuntimeError("TTS generation resulted in empty audio buffer.")

tts_service = TTSService()

