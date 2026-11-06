import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks

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
    background_tasks: BackgroundTasks = BackgroundTasks(),
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


