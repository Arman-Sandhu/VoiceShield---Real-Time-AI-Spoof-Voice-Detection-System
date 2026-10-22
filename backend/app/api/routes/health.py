from fastapi import APIRouter
from app.core.config import settings
from app.services.model_service import model_service
from app.services.history_service import history_service
from app.schemas.analysis import HealthResponse, ModelStatusResponse

router = APIRouter(tags=["Health & Status"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    db_backend = "Supabase PostgreSQL" if history_service.supabase else "Local SQLite"
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "model_ready": model_service.is_loaded,
        "database_backend": db_backend
    }

@router.get("/model-status", response_model=ModelStatusResponse)
def get_model_status():
    return model_service.get_status()
