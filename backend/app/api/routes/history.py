import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel

from app.core.security import verify_token
from app.services.history_service import history_service
from app.services.hf_sync_service import hf_sync_service
from app.schemas.analysis import (
    AnalysisHistoryItem,
    FlagToggleResponse,
    RenameAnalysisRequest,
    RenameAnalysisResponse,
    UpdateUsernameRequest,
    UpdateUsernameResponse
)

logger = logging.getLogger("voiceshield.history_route")

router = APIRouter(tags=["Analysis History"])

@router.get("/analysis-history", response_model=List[AnalysisHistoryItem])
@router.get("/history", response_model=List[AnalysisHistoryItem])
def get_analysis_history(user: dict = Depends(verify_token)):
    """
    Returns analysis history strictly for the authenticated Firebase user.
    """
    history_service.ensure_user(user_id=user["uid"], email=user.get("email"))
    records = history_service.get_user_history(user_id=user["uid"], limit=100)
    return records

@router.get("/user/stats")
@router.get("/user/profile")
def get_user_subspace_stats(user: dict = Depends(verify_token)):
    """
    Returns the user's isolated subspace telemetry: joined time,
    total audios analyzed, total duration analyzed, recorded vs uploaded count,
    and total spoofs detected.
    """
    return history_service.get_user_stats(user_id=user["uid"], email=user.get("email"))

@router.get("/analysis/{event_id}", response_model=AnalysisHistoryItem)
def get_analysis_by_id(event_id: str, user: dict = Depends(verify_token)):
    """
    Returns single analysis record by event_id, verifying user ownership.
    """
    record = history_service.get_analysis_by_id(event_id=event_id, user_id=user["uid"])
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record '{event_id}' not found or access denied."
        )
    return record

@router.patch("/analysis/{event_id}/flag", response_model=FlagToggleResponse)
@router.post("/analysis/{event_id}/flag", response_model=FlagToggleResponse)
def toggle_analysis_flag(
    event_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(verify_token)
):
    """
    Toggles the is_flagged status for an analysis record if user believes analysis was inaccurate.
    """
    result = history_service.toggle_flag(event_id=event_id, user_id=user["uid"])
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record '{event_id}' not found or access denied."
        )

    # Sync updated flag status to Hugging Face dataset in background
    try:
        background_tasks.add_task(
            hf_sync_service.update_flag,
            event_id=event_id,
            is_flagged=result["is_flagged"]
        )
    except Exception as hf_err:
        logger.warning(f"Could not queue HF flag update task: {hf_err}")

    return FlagToggleResponse(
        event_id=result["event_id"],
        is_flagged=result["is_flagged"],
        message="Flag status toggled successfully."
    )

@router.delete("/analysis/{event_id}")
def delete_analysis(event_id: str, user: dict = Depends(verify_token)):
    """
    Deletes an analysis record belonging to the authenticated user.
    """
    deleted = history_service.delete_analysis(event_id=event_id, user_id=user["uid"])
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record '{event_id}' not found or could not be deleted."
        )
    return {"status": "success", "message": f"Record '{event_id}' successfully removed."}
 
@router.patch("/analysis/{event_id}/rename", response_model=RenameAnalysisResponse)
@router.put("/analysis/{event_id}/rename", response_model=RenameAnalysisResponse)
@router.post("/analysis/{event_id}/rename", response_model=RenameAnalysisResponse)
def rename_analysis(
    event_id: str,
    payload: RenameAnalysisRequest,
    user: dict = Depends(verify_token)
):
    """
    Renames the file_name for an analysis record belonging to the authenticated user.
    """
    clean_name = payload.file_name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name cannot be empty."
        )

    result = history_service.rename_analysis(
        event_id=event_id,
        user_id=user["uid"],
        file_name=clean_name
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis record '{event_id}' not found or access denied."
        )

    return RenameAnalysisResponse(
        event_id=result["event_id"],
        file_name=result["file_name"],
        message="File name updated successfully."
    )

@router.patch("/user/username", response_model=UpdateUsernameResponse)
@router.put("/user/username", response_model=UpdateUsernameResponse)
@router.post("/user/username", response_model=UpdateUsernameResponse)
def update_user_username(
    payload: UpdateUsernameRequest,
    user: dict = Depends(verify_token)
):
    """
    Updates the authenticated user's username in the users table and analysis_history table.
    """
    clean_username = payload.username.strip()
    if not clean_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be empty."
        )

    result = history_service.update_username(
        user_id=user["uid"],
        username=clean_username
    )
    return UpdateUsernameResponse(
        user_id=result["user_id"],
        username=result["username"],
        message="Username updated successfully in user table and analysis history."
    )

class RequestEmailOTPRequest(BaseModel):
    new_email: str

class VerifyEmailOTPRequest(BaseModel):
    new_email: str
    otp: str

@router.post("/user/email/request-otp")
def request_email_otp(
    payload: RequestEmailOTPRequest,
    user: dict = Depends(verify_token)
):
    clean_email = payload.new_email.strip().lower()
    if not clean_email or "@" not in clean_email or "." not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    if clean_email == (user.get("email") or "").strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email must be different from current email."
        )

    if history_service.is_email_taken(clean_email, exclude_user_id=user["uid"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already in use by another account."
        )

    history_service.generate_email_otp(user["uid"], clean_email)
    return {
        "status": "success",
        "message": f"Verification code sent to {clean_email}."
    }

@router.post("/user/email/verify-otp")
def verify_email_otp(
    payload: VerifyEmailOTPRequest,
    user: dict = Depends(verify_token)
):
    clean_email = payload.new_email.strip().lower()
    clean_otp = payload.otp.strip()

    if not clean_email or not clean_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and OTP are both required."
        )

    if history_service.is_email_taken(clean_email, exclude_user_id=user["uid"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email address is already in use by another account."
        )

    is_valid = history_service.verify_email_otp(user["uid"], clean_email, clean_otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new code."
        )

    result = history_service.update_email(user["uid"], clean_email)
    return {
        "status": "success",
        "email": result["email"],
        "message": "Email address updated successfully across user subspace."
    }

class UpdatePasswordWithOTPRequest(BaseModel):
    otp: str
    new_password: str

@router.post("/user/password/request-otp")
def request_password_otp(
    user: dict = Depends(verify_token)
):
    """
    Sends a 6-digit verification code to the authenticated user's email address
    to authorize setting or changing their account password.
    """
    user_email = (user.get("email") or "").strip().lower()
    if not user_email or "@" not in user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account has no valid email address associated with it to receive a verification code."
        )

    history_service.generate_password_otp(user["uid"], user_email)
    return {
        "status": "success",
        "message": f"A 6-digit verification code has been sent to {user_email}.",
        "email": user_email
    }

@router.post("/user/password/verify-and-update")
def verify_password_and_update(
    payload: UpdatePasswordWithOTPRequest,
    user: dict = Depends(verify_token)
):
    """
    Verifies the email OTP and updates/sets the account password via Firebase Admin SDK.
    Bypasses re-authentication restrictions safely because ownership is verified via email OTP.
    """
    user_email = (user.get("email") or "").strip().lower()
    clean_otp = (payload.otp or "").strip()
    clean_pw = (payload.new_password or "").strip()

    if not clean_otp or len(clean_otp) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter the complete 6-digit verification code."
        )

    if len(clean_pw) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    is_valid = history_service.verify_password_otp(user["uid"], user_email, clean_otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new code."
        )

    try:
        history_service.update_user_password(user["uid"], clean_pw)
    except Exception as e:
        logger.error(f"Failed to update password for user {user['uid']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update password: {str(e)}"
        )

    return {
        "status": "success",
        "message": "Password successfully updated! You can now log in with your email and password."
    }


