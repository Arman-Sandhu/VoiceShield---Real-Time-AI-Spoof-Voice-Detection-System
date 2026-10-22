import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status

from app.core.security import verify_token
from app.services.audio_service import process_audio, AudioProcessingError
from app.services.model_service import model_service
from app.services.risk_service import assess_contextual_risk
from app.services.history_service import history_service
from app.schemas.analysis import AnalysisResultResponse

logger = logging.getLogger("voiceshield.analysis_route")

router = APIRouter(tags=["Voice Analysis"])

@router.post("/analyze-file", response_model=AnalysisResultResponse)
async def analyze_file(
    file: UploadFile = File(..., description="Audio file in WAV, MP3, FLAC, or OGG format"),
    is_caller_unknown: bool = Form(False, description="Whether caller is unverified"),
    is_sensitive_request: bool = Form(False, description="Whether sensitive info or money was requested"),
    urgency_flag: bool = Form(False, description="Whether urgency/pressure was applied"),
    mode: str = Form("upload", description="'upload' or 'record'"),
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

    # 3. Real Pretrained ML Model Inference
    try:
        model_result = model_service.predict(
            audio_data=audio_data,
            duration_seconds=duration,
            rms_energy=rms_energy
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
        urgency_flag=urgency_flag
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
            risk_explanation=risk_explanation
        )
    except Exception as db_err:
        logger.error(f"Failed to record analysis to database: {db_err}")
        # Note: Non-blocking for the immediate analysis response, but logged

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
        status="success"
    )
