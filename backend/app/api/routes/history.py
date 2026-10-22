import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import verify_token
from app.services.history_service import history_service
from app.schemas.analysis import AnalysisHistoryItem

logger = logging.getLogger("voiceshield.history_route")

router = APIRouter(tags=["Analysis History"])

@router.get("/analysis-history", response_model=List[AnalysisHistoryItem])
@router.get("/history", response_model=List[AnalysisHistoryItem])
def get_analysis_history(user: dict = Depends(verify_token)):
    """
    Returns analysis history strictly for the authenticated Firebase user.
    """
    records = history_service.get_user_history(user_id=user["uid"], limit=100)
    return records

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
