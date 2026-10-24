from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class ContextFlags(BaseModel):
    is_caller_unknown: bool = Field(default=False, description="Whether the caller identity is unverified or unknown")
    is_sensitive_request: bool = Field(default=False, description="Whether financial transfer, credentials, or OTP is requested")
    urgency_flag: bool = Field(default=False, description="Whether extreme time pressure or distress tactics are exerted")

class ModelStatusResponse(BaseModel):
    model_name: str
    architecture: str
    is_loaded: bool
    device: str
    sample_rate_hz: int
    target_language: str
    labels: Dict[Any, str]
    parameter_count: int
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    model_ready: bool
    database_backend: str

class AnalysisResultResponse(BaseModel):
    event_id: str
    prediction: str = Field(description="AI_GENERATED | HUMAN_SPEECH | INCONCLUSIVE")
    fake_score: float = Field(description="Probability or score of synthetic spoof audio (0.0 to 1.0)")
    real_score: float = Field(description="Probability or score of human voice audio (0.0 to 1.0)")
    confidence: float
    model_name: str
    duration_seconds: float
    context_flags: Dict[str, bool]
    context_risk_level: str = Field(description="LOW | MEDIUM | HIGH")
    final_risk: str = Field(description="LOW | MEDIUM | HIGH | CRITICAL")
    risk_explanation: str
    timestamp: str
    file_name: Optional[str] = None
    is_flagged: bool = False
    status: str = "success"

class AnalysisHistoryItem(BaseModel):
    id: Optional[int] = None
    event_id: str
    user_id: str
    mode: str
    duration: Optional[float] = None
    model_name: Optional[str] = None
    fake_score: Optional[float] = None
    real_score: Optional[float] = None
    prediction: Optional[str] = None
    context_risk: Optional[Dict[str, Any]] = None
    final_risk: Optional[str] = None
    risk_explanation: Optional[str] = None
    file_name: Optional[str] = None
    username: Optional[str] = None
    user_email: Optional[str] = None
    is_flagged: bool = False
    created_at: str

class FlagToggleResponse(BaseModel):
    event_id: str
    is_flagged: bool
    message: str = "Flag status updated successfully"

class RenameAnalysisRequest(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255, description="New file name for the audio analysis record")

class RenameAnalysisResponse(BaseModel):
    event_id: str
    file_name: str
    message: str = "File name updated successfully."

class UpdateUsernameRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100, description="New display username")

class UpdateUsernameResponse(BaseModel):
    user_id: str
    username: str
    message: str = "Username updated successfully."

