import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.services.model_service import model_service
from app.api.routes import health, analysis, history

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("voiceshield.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: preload ML model
    logger.info("Initializing VoiceShield ML engine and services...")
    status = model_service.get_status()
    if status["is_loaded"]:
        logger.info(f"Model engine ready: {status['model_name']} on {status['device']}")
    else:
        logger.warning(f"Model loading alert: {status['error']}")
    yield
    # Shutdown
    logger.info("VoiceShield API shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="VoiceShield: Real-Time AI Spoof Voice Detection & Social Engineering Risk Assessment API",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router)
app.include_router(analysis.router)
app.include_router(history.router)

@app.get("/")
def root():
    return {
        "service": "VoiceShield API",
        "status": "operational",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "model": settings.MODEL_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
