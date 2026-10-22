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
    created_at: str
