from fastapi import APIRouter, HTTPException, status, Response
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from app.services.tts_service import tts_service

router = APIRouter(prefix="/tts", tags=["Text-to-Speech Engine"])

class TTSGenerateRequest(BaseModel):
    text: str = Field(..., min_length=2, max_length=1000)
    voice: str = Field(default="en-US-ChristopherNeural")

@router.get("/voices", response_model=List[Dict[str, Any]])
def list_tts_voices():
    return tts_service.get_voices()

@router.post("/generate")
async def generate_tts_audio(payload: TTSGenerateRequest):
    try:
        audio_bytes = await tts_service.synthesize(text=payload.text, voice_id=payload.voice)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=voiceshield_synthetic_voice.mp3",
                "X-Generated-Voice": payload.voice
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"TTS synthesis failed: {e}")

