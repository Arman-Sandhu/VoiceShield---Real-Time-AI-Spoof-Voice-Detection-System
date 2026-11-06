import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status, BackgroundTasks

from app.core.security import verify_token
from app.services.audio_service import process_audio, AudioProcessingError
from app.services.model_service import model_service
from app.services.risk_service import assess_contextual_risk
from app.services.history_service import history_service
from app.services.hf_sync_service import hf_sync_service
from app.schemas.analysis import AnalysisResultResponse, LiveCallChunkResponse

logger = logging.getLogger("voiceshield.analysis_route")

router = APIRouter(tags=["Voice Analysis"])

@router.post("/analyze-file", response_model=AnalysisResultResponse)
async def analyze_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Audio file in WAV, MP3, FLAC, or OGG format"),
    custom_file_name: Optional[str] = Form(None, description="Optional custom display file name"),
    is_caller_unknown: bool = Form(False, description="Whether caller is unverified"),
    is_sensitive_request: bool = Form(False, description="Whether sensitive info or money was requested"),
    urgency_flag: bool = Form(False, description="Whether urgency/pressure was applied"),
    mode: str = Form("upload", description="'upload', 'record', or 'live_call'"),
    username: Optional[str] = Form(None, description="Optional username of investigator/user"),
    user: dict = Depends(verify_token)
):
    """
    Analyzes uploaded speech audio for synthetic voice cloning / spoofing.
    Performs real acoustic feature inference and combines with situational risk assessment.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file provided in request."
        )

    is_live = (mode == "live_call")
    logger.info(f"Received analysis request from user {user['uid']} for file '{file.filename}', mode='{mode}'")

    # 1. Read file bytes
    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file data."
        )

    # 2. Decode and preprocess audio
    try:
        audio_data, duration, rms_energy = process_audio(file_bytes, filename=file.filename)
    except AudioProcessingError as ape:
        logger.warning(f"Audio processing error for user {user['uid']}: {ape}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ape)
        )
    except Exception as e:
        logger.error(f"Unexpected error processing audio: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while decoding audio."
        )

    # 3. Real Pretrained ML Model Inference (Calibrated)
    try:
        model_result = model_service.predict(
            audio_data=audio_data,
            duration_seconds=duration,
            rms_energy=rms_energy,
            is_live_call=is_live
        )
    except RuntimeError as re:
        logger.error(f"ML Model inference error: {re}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference engine failure: {str(re)}"
        )

    prediction = model_result["prediction"]
    fake_score = model_result["fake_score"]
    real_score = model_result["real_score"]
    confidence = model_result.get("confidence", max(fake_score, real_score))
    model_name = model_result["model_name"]

    # 4. Contextual Risk Assessment
    risk_result = assess_contextual_risk(
        fake_score=fake_score,
        prediction=prediction,
        is_caller_unknown=is_caller_unknown,
        is_sensitive_request=is_sensitive_request,
        urgency_flag=urgency_flag,
        is_live_call=is_live
    )

    final_risk = risk_result["final_risk"]
    context_risk_level = risk_result["context_risk_level"]
    risk_explanation = risk_result["risk_explanation"]

    # 5. Generate Event ID and Persist to Database
    event_id = f"VS-{str(uuid.uuid4())[:8].upper()}"
    timestamp_iso = datetime.now(timezone.utc).isoformat()

    context_flags = {
        "is_caller_unknown": is_caller_unknown,
        "is_sensitive_request": is_sensitive_request,
        "urgency_flag": urgency_flag
    }

    effective_file_name = (
        custom_file_name.strip()
        if custom_file_name and custom_file_name.strip()
        else (file.filename or "")
    ).strip() or "VoiceShield_Audio.wav"

    try:
        history_service.save_analysis(
            event_id=event_id,
            user_id=user["uid"],
            mode=mode,
            duration=duration,
            model_name=model_name,
            fake_score=fake_score,
            real_score=real_score,
            prediction=prediction,
            context_risk=context_flags,
            final_risk=final_risk,
            risk_explanation=risk_explanation,
            file_name=effective_file_name,
            username=username or user.get("name"),
            user_email=user.get("email"),
            is_flagged=False
        )
    except Exception as db_err:
        logger.error(f"Failed to record analysis to database: {db_err}")

    # 5. Background sync to Hugging Face Telemetry Vault (audios/ + metadata.jsonl)
    try:
        background_tasks.add_task(
            hf_sync_service.sync_record,
            event_id=event_id,
            audio_bytes=file_bytes,
            file_name=effective_file_name,
            user_id=user["uid"],
            username=username or user.get("name") or "Anonymous",
            mode=mode,
            duration=duration,
            prediction=prediction,
            fake_score=fake_score,
            real_score=real_score,
            final_risk=final_risk,
            risk_explanation=risk_explanation,
            is_flagged=False,
            created_at=timestamp_iso
        )
    except Exception as hf_err:
        logger.warning(f"Could not queue HF telemetry sync task: {hf_err}")

    return AnalysisResultResponse(
        event_id=event_id,
        prediction=prediction,
        fake_score=fake_score,
        real_score=real_score,
        confidence=confidence,
        model_name=model_name,
        duration_seconds=round(duration, 2),
        context_flags=context_flags,
        context_risk_level=context_risk_level,
        final_risk=final_risk,
        risk_explanation=risk_explanation,
        timestamp=timestamp_iso,
        file_name=effective_file_name,
        biometric_indicators=model_result.get("biometric_indicators", []),
        is_flagged=False,
        status="success"
    )

@router.post("/live-chunk", response_model=LiveCallChunkResponse)
@router.post("/analysis/live-chunk", response_model=LiveCallChunkResponse)
async def analyze_live_chunk(
    file: UploadFile = File(..., description="Short 3-second audio chunk"),
    user: dict = Depends(verify_token)
):
    """
    Ultra-low-latency real-time inference endpoint for live phone call assistance.
    Processes 3-second streaming audio chunks with debounced alert recommendations and vibration patterns.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No audio chunk provided.")

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed reading chunk: {e}")

    try:
        audio_data, duration, rms_energy = process_audio(file_bytes, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed preprocessing chunk: {e}")

    try:
        result = model_service.predict(
            audio_data=audio_data,
            duration_seconds=duration,
            rms_energy=rms_energy,
            is_live_call=True
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference failed: {e}")

    fake_score = result["fake_score"]
    real_score = result["real_score"]
    prediction = result["prediction"]

    # Debounced alert triggers & vibration patterns for mobile live calls
    if fake_score >= 0.75:
        is_alert = True
        alert_level = "CRITICAL"
        recommendation = f"CRITICAL SPOOF DETECTED ({fake_score * 100:.1f}% AI Clone). High risk of synthetic voice impersonation!"
        vibrate_pattern = [200, 100, 200, 100, 300]
    elif fake_score >= 0.50:
        is_alert = True
        alert_level = "CAUTION"
        recommendation = f"POTENTIAL SPOOF DETECTED ({fake_score * 100:.1f}% AI probability). Exercise caution and verify caller identity."
        vibrate_pattern = [150, 100, 150]
    else:
        is_alert = False
        alert_level = "NORMAL"
        recommendation = f"Authentic human speech confirmed ({fake_score * 100:.1f}% spoof score). Acoustic harmonics normal."
        vibrate_pattern = []

    return LiveCallChunkResponse(
        prediction=prediction,
        fake_score=fake_score,
        real_score=real_score,
        confidence=result["confidence"],
        is_alert=is_alert,
        alert_level=alert_level,
        recommendation=recommendation,
        vibrate_pattern=vibrate_pattern,
        biometric_indicators=result.get("biometric_indicators", []),
        duration_seconds=round(duration, 2),
        status="success"
    )
