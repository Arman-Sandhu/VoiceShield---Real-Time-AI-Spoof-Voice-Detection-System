import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory is the backend root folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Explicitly load .env from the backend root
env_file = BASE_DIR / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv()

class Settings:
    PROJECT_NAME: str = "VoiceShield API"
    VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # ML Model Configuration
    # Hugging Face model: Wav2Vec2 Sequence Classification
    MODEL_NAME: str = os.getenv("HF_MODEL_PATH", "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification")
    TARGET_SAMPLE_RATE: int = 16000
    MIN_AUDIO_DURATION_SEC: float = 1.0
    MAX_AUDIO_DURATION_SEC: float = 60.0
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    
    # Firebase Admin Configuration
    FIREBASE_CREDENTIALS_PATH: Path = (
        Path(os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-admin.json"))
        if Path(os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-admin.json")).is_absolute()
        else BASE_DIR / os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-admin.json")
    )
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    
    # Local SQLite Fallback Database
    SQLITE_DB_PATH: Path = BASE_DIR / "voiceshield.db"
    
    # CORS Origins
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]

settings = Settings()
