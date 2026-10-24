# VoiceShield — Real-Time AI Spoof Voice Detection & Caller Risk Assessment System

> **College Capstone Project & Prototype**  
> *Acoustic Deepfake Detection & Social Engineering Threat Defense*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?logo=huggingface&logoColor=black)](https://huggingface.co)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

---

## 1. Project Overview

**VoiceShield** is a full-stack, near-real-time voice authenticity verification and social engineering threat assessment platform. As generative speech models and voice-cloning technologies proliferate, synthetic voices are increasingly weaponized in executive impersonation, urgent family emergency scams, and financial extortion calls.

VoiceShield addresses this vulnerability through a dual-engine architecture:
1. **Acoustic Neural Classification**: Evaluates high-frequency spectral artifacts, vocoder traces, and phoneme boundary transitions using a pretrained sequence-classification model (`MelodyMachine/Deepfake-audio-detection-V2`).
2. **Deterministic Contextual Threat Engine**: Synthesizes the acoustic score with situational extortion vectors (caller identity verification, urgent distress pressure, and financial/credential demands) to deliver transparent threat levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

---

## 2. Key Features

- **Genuine Neural ML Inference**: Real inference with PyTorch and Hugging Face Transformers. Zero mocked probabilities or random fallbacks.
- **Microphone Record & Analyze**: Live in-browser audio capture with real-time Web Audio API frequency visualization, duration timer, and browser-native 16-bit PCM WAV encoding at 16,000 Hz.
- **Audio File Upload**: Drag-and-drop workspace supporting standard audio formats (`.wav`, `.mp3`, `.flac`, `.ogg`) up to 15MB with client-side and server-side validation.
- **Contextual Threat Scoring**: Separates the ML acoustic synthetic score from call context to guard against social engineering even when voices sound authentic.
- **Redora Design System**: Futuristic, minimal cyber-security aesthetic featuring deep cosmic navy (`#07080f`), glowing cyan accents (`#00d4ff`), purple highlights (`#a855f7`), and glassmorphism.
- **Cryptographic User Isolation**: Firebase Client & Admin SDK integration verifies Bearer ID tokens on every protected endpoint.
- **Dual-Mode History Vault**: Stores telemetry and analysis history in Supabase PostgreSQL, with automatic, transparent fallback to local SQLite (`voiceshield.db`) if cloud connectivity is unavailable.

---

## 3. Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ML Engine**: PyTorch (CPU / CUDA automatic selection)
- **Audio Preprocessing**: `librosa`, `soundfile`, `numpy`
- **Model Framework**: Hugging Face `transformers`
- **Authentication**: Firebase Admin SDK
- **Database**: Supabase Client (PostgreSQL) + SQLite3 (local fallback)

### Frontend
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 (Vanilla CSS variables & Redora design tokens)
- **Motion & UI**: Framer Motion, Lucide React, `clsx`, `tailwind-merge`
- **Audio Processing**: Web Audio API (`AudioContext`, `AnalyserNode`, `ScriptProcessorNode`), custom PCM WAV encoder
- **Client Auth**: Firebase Client SDK v12

---

## 4. System Architecture

```
User (Browser)
   │
   ├─► Audio Input: Microphone (Web Audio API PCM) or File Upload (.wav/.mp3)
   ├─► Situational Flags: Unknown Caller, Financial/Credential Request, Urgency
   │
   ▼
Frontend (React 19 + Tailwind v4 + Framer Motion)
   │
   │  HTTPS Multipart Form + Firebase Bearer Token
   ▼
FastAPI Gateway (`backend/app/main.py`)
   │
   ├─► 1. Security Guard (`app/core/security.py`)
   │      - Cryptographic Firebase ID Token Verification
   │      - Verified UID Extraction
   │
   ├─► 2. Audio Pipeline (`app/services/audio_service.py`)
   │      - Format Decoding (`soundfile` / `librosa`)
   │      - Stereo to Mono Conversion
   │      - Target Resampling to 16,000 Hz
   │      - Amplitude Normalization & Silence Trimming
   │      - RMS Energy & Duration Validation
   │
   ├─► 3. Neural Classifier (`app/services/model_service.py`)
   │      - Model: `MelodyMachine/Deepfake-audio-detection-V2`
   │      - Architecture: `Wav2Vec2ForSequenceClassification`
   │      - Softmax Probability Extraction: fake_score (0) vs real_score (1)
   │
   ├─► 4. Contextual Risk Engine (`app/services/risk_service.py`)
   │      - Decision Matrix combining Fake Score + Threat Flags
   │      - Output: LOW / MEDIUM / HIGH / CRITICAL + Narrative Explanation
   │
   └─► 5. History Service (`app/services/history_service.py`)
          - Dual-mode Cloud Supabase or Local SQLite Persistence
          - Strict user-isolation filter (`user_id == verified_uid`)
```

---

## 5. Machine Learning Model Specifications

- **Identifier**: `MelodyMachine/Deepfake-audio-detection-V2`
- **Architecture**: `Wav2Vec2ForSequenceClassification`
- **Parameter Count**: 94,569,090 parameters
- **Target Sample Rate**: 16,000 Hz (mono)
- **Label Mapping**:
  - `0`: `'fake'` (AI-Generated / Cloned Voice)
  - `1`: `'real'` (Authentic Human Voice)
- **Inference Mode**: Forward-pass sequence classification with Softmax logit activation.
- **Inference Device**: Automatic sensing — PyTorch CUDA acceleration if GPU is available, CPU by default.

### Model Limitations
1. **Domain**: Specifically optimized for English human speech audio clips.
2. **Audio Quality**: High background noise, extreme reverb, or lossy audio re-encoding may reduce classification confidence.
3. **Clip Duration**: Requires at least 1.0 second of audible speech for feature extraction. Clips under 1.0s or silent audio return `INCONCLUSIVE`.
4. **Speaker Attribution**: The model estimates synthetic likelihood; it does *not* identify the specific individual whose voice was cloned.

---

## 6. Environment Setup & Configuration

### Prerequisites
- Python 3.10 or 3.11
- Node.js 18+ and npm 9+
- A Firebase project with Email/Password and Google Authentication enabled

### Backend Environment (`backend/.env`)
Create `backend/.env` (see `backend/.env.example`):
```env
FIREBASE_CREDENTIALS_PATH=./firebase-admin.json
HF_MODEL_PATH=MelodyMachine/Deepfake-audio-detection-V2

# Supabase PostgreSQL (Optional: Falls back to local SQLite if unconfigured or offline)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Frontend Environment (`frontend/.env`)
Create `frontend/.env` (see `frontend/.env.example`):
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

VITE_API_URL=http://localhost:8000
```

---

## 7. Startup Commands

### Step 1: Run Backend Server
```powers
# From project root
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be running at: `http://localhost:8000`  
Swagger UI Interactive Documentation: `http://localhost:8000/docs`

### Step 2: Run Frontend Development Server
```powers
# In a separate terminal, from project root
cd frontend
npm run dev
```
Frontend Web Application will be live at: `http://localhost:5173`

---

## 8. Database Schema & Migration

### Supabase Cloud Database (PostgreSQL)
If using Supabase, execute `backend/supabase_schema.sql` in the Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS public.analysis_history (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    duration REAL,
    model_name TEXT,
    fake_score REAL,
    real_score REAL,
    prediction TEXT,
    context_risk JSONB,
    final_risk TEXT,
    risk_explanation TEXT,
    file_name TEXT DEFAULT '',
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id ON public.analysis_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_created_at ON public.analysis_history(created_at DESC);
```

### Local SQLite Database
If Supabase is unreachable or unconfigured, the backend automatically initializes, migrates, and manages `backend/voiceshield.db`. No manual setup required.

---

## 9. API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Server operational health & database mode | No |
| `GET` | `/model-status` | ML Model loading status & architecture metadata | No |
| `POST` | `/analyze-file` | Accepts audio + context flags, executes neural inference, saves original file name | **Yes (Firebase Bearer)** |
| `GET` | `/analysis-history` | Fetches authenticated user's analysis history with file names & flag status | **Yes (Firebase Bearer)** |
| `GET` | `/analysis/{id}` | Fetches detailed analysis record by Event ID | **Yes (Firebase Bearer)** |
| `PATCH` | `/analysis/{id}/flag` | Toggles user dispute / inaccurate analysis flag | **Yes (Firebase Bearer)** |
| `DELETE` | `/analysis/{id}` | Deletes user's own analysis record | **Yes (Firebase Bearer)** |

---

## 10. Verification & Test Suite

The project includes verified end-to-end integration tests covering endpoints, audio validation, and neural inference:

```powers
& ".\backend\.venv\Scripts\python.exe" -c "
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import verify_token
app.dependency_overrides[verify_token] = lambda: {'uid': 'test_user'}
client = TestClient(app)
print('Health:', client.get('/health').json())
print('Model:', client.get('/model-status').json()['architecture'])
"
```

All 7 integration tests and edge-case validations (silence, <1s audio, corrupt files) pass with 100% success.

---

## 11. Future Roadmap

- [ ] **Multilingual Acoustic Classifiers**: Fine-tuning Wav2Vec2 on Hindi, Spanish, and regional Indian dialect spoof datasets.
- [ ] **Streaming Low-Latency Chunk Analysis**: Stateful recurrent windowing for true live-call monitoring where legally permitted.
- [ ] **Caller Reputation & Carrier Telemetry**: Integration with telecom spoofing detection databases (STIR/SHAKEN).
- [ ] **Model Score Calibration**: Temperature scaling and isotonic regression across out-of-distribution voice datasets.
