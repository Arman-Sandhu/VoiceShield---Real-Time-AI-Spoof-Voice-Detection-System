import io
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

        communicate = edge_tts.Communicate(clean_text, matched_voice)
        audio_buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])

        audio_bytes = audio_buffer.getvalue()
        if not audio_bytes:
            raise RuntimeError("TTS generation resulted in empty audio buffer.")

        return audio_bytes

tts_service = TTSService()

