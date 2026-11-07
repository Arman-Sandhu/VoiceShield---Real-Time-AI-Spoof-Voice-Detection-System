# VoiceShield: Real-Time AI Spoof Voice Detection System

> **Comprehensive Project Synopsis & Technical Evaluation Report**  
> *Academic Capstone & Engineering Portfolio Specification*

---

## 1. Executive Summary & Abstract

**VoiceShield** is an end-to-end, full-stack cybersecurity platform engineered to detect synthetic speech, AI-cloned audio, and audio deepfakes in near real-time. As generative artificial intelligence models (such as diffusion-based voice clones, neural vocoders, and zero-shot voice synthesisers like VALL-E, ElevenLabs, and Tortoise-TTS) become widely accessible, malicious actors increasingly exploit synthetic voices in high-impact cybercrimes—including executive impersonation ("CEO fraud"), authorized push payment fraud, kidnapping hoaxes, and social engineering attacks.

VoiceShield mitigates this emerging threat vector through a novel **Dual-Engine Architecture**:
1. **Acoustic Neural Classification Engine**: An acoustic sequence classifier based on the **Wav2Vec 2.0** architecture (`MelodyMachine/Deepfake-audio-detection-V2`, 94.5 million parameters), analyzing latent speech representations, phoneme boundary micro-anomalies, and vocoder phase artifacts directly from raw 16,000 Hz audio waveforms.
2. **Deterministic Contextual Threat Engine**: A rule-based risk matrix combining the neural synthetic likelihood score with situational extortion vectors (caller identity verification, psychological urgency cues, and financial/credential demands) to produce an actionable, explainable threat rating (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

The system is deployed as a cloud-ready platform featuring a high-performance **FastAPI** backend, **PyTorch** inference engine, **Firebase** cryptographic authentication, **Supabase PostgreSQL** cloud persistence with zero-downtime **SQLite3** local fallback, and a futuristic, responsive **React 19 / Vite / TailwindCSS** frontend with Web Audio API oscilloscope visualization.

---

## 2. Problem Statement & Motivation

### 2.1 The Threat Landscape
Recent advancements in generative speech synthesis have reduced the audio sample requirement for convincing voice cloning from hours to **under three seconds**. Consequently, voice-based social engineering has surged:
- **Financial Fraud**: Attackers mimic corporate officers to authorize fraudulent wire transfers.
- **Family Impersonation Scams**: Synthesized voices of family members in fabricated emergencies distress victims into sending urgent ransom or bail funds.
- **Biometric Bypass**: Cloned voices bypass legacy voice-biometric authentication in automated call centers and banking IVR systems.

### 2.2 Shortcomings of Existing Solutions
- **Isolated Acoustic Analyzers**: Most research tools output raw synthetic probabilities without considering the contextual scenario of the call, resulting in false senses of security or alarm fatigue.
- **Heavy Computational Latency**: Standard laboratory models often require batch-mode processing or server clusters, preventing near-real-time user feedback.
- **Mocked Prototypes**: Many hackathon prototypes rely on simulated scores or random distributions rather than operational deep learning pipelines.

### 2.3 Proposed Solution
VoiceShield bridges the gap between deep acoustic analysis and practical threat triage by pairing a real deep learning classifier with situational threat heuristics, packaged in an intuitive web-based forensic studio.

---

## 3. Project Objectives & Scope

### 3.1 Primary Objectives
- **Accurate Spoof Classification**: Achieve high-confidence discrimination between genuine human speech and AI-generated/cloned audio without reliance on mocked data.
- **Explainable Contextual Risk Scoring**: Synthesize acoustic probability with human factors to explain *why* an interaction is dangerous.
- **Near-Real-Time Browser Processing**: Enable direct microphone capture, in-browser 16-bit PCM WAV encoding, and rapid server-side inference ($\le 1.5$s latency).
- **Dual-Mode Enterprise Data Persistence**: Guarantee continuous availability using cloud PostgreSQL (Supabase) with automatic, transparent fallback to local ACID-compliant storage (SQLite3).
- **Subspace Data Isolation**: Cryptographically enforce user data privacy where every analysis event and metric is bound to the verified Firebase UID.

### 3.2 Scope & Boundaries
- **Language Domain**: Optimized for English speech samples.
- **Audio Length**: Requires a minimum of 1.0 second of audible speech ($RMS \ge 0.001$).
- **Speaker Attribution**: Identifies whether a voice is synthetic or authentic; does not perform biometric speaker verification (i.e., identifying specific individuals).

---

## 4. System Architecture & Workflow

The architecture follows a modular, decoupled microservice-ready design:

```
                           +-----------------------------------------------+
                           |                 User Browser                  |
                           |  React 19 + Vite + TailwindCSS + Cyber HUD    |
                           +-----------------------------------------------+
                                    |                             ^
                1. Microphone Capture / File Upload               | 6. Forensic Report,
                2. Situational Risk Flags                         |    Authenticity Gauges,
                3. Firebase Bearer JWT Token                      |    Acoustic Visualizers
                                    v                             |
                           +-----------------------------------------------+
                           |          FastAPI Application Gateway          |
                           |       (RESTful Endpoints, CORS, Uvicorn)      |
                           +-----------------------------------------------+
                                    |
            +-----------------------+-----------------------+
            |                                               |
            v                                               v
+------------------------+                     +------------------------+
| 1. Security Guard      |                     | 2. Audio Pipeline      |
| Firebase Admin SDK     |                     | Librosa & SoundFile    |
| - JWT Verification     |                     | - Stereo to Mono       |
| - UID Extraction       |                     | - 16kHz Target Resample|
+------------------------+                     | - Amplitude Norm & RMS |
                                               +------------------------+
                                                            |
                                                            v
+------------------------+                     +------------------------+
| 4. Context Risk Engine |                     | 3. Neural Classifier   |
| Multi-factor matrix:   |<--------------------| Wav2Vec 2.0 Sequence   |
| - Fake Score Weight    |   Fake / Real Logits| Classification         |
| - Extortion Flags      |   Softmax Confidences| (94.5M Parameters)    |
+------------------------+                     +------------------------+
            |
            v
+-----------------------------------------------------------------------+
| 5. Dual-Mode History & Subspace Persistence Service                   |
|   - Primary Cloud: Supabase (PostgreSQL 15 via REST / Service Role)    |
|   - Resilient Fallback: Local SQLite3 (voiceshield.db, ACID Wal-Mode)  |
|   - Subspace Aggregation: Telemetry, Flagging, Audit History          |
+-----------------------------------------------------------------------+
```

### 4.1 Step-by-Step Execution Lifecycle
1. **Audio Ingestion**: Audio is recorded via browser microphone (using Web Audio API and custom PCM WAV encoder) or uploaded as an audio file (`.wav`, `.mp3`, `.flac`, `.ogg`).
2. **Context Input**: The user indicates situational flags (Unknown Caller, Financial Transfer Request, High Urgency).
3. **Authentication & Transport**: The frontend packages the payload into a `multipart/form-data` request accompanied by a cryptographic Firebase Bearer JWT.
4. **DSP Standardization**: The backend resamples audio to exactly 16,000 Hz mono, trims excessive silence, normalizes peak amplitudes, and verifies the signal meets the minimum RMS energy threshold ($> 0.001$).
5. **Neural Forward Pass**: The standardized float tensor is fed into the Wav2Vec 2.0 sequence classifier. The raw logits undergo Softmax activation to yield $P(\text{fake})$ and $P(\text{real})$.
6. **Risk Synthesis**: The Contextual Risk Engine calculates the aggregate threat level and constructs an evidence narrative.
7. **Telemetry Persistence**: The transaction is committed to Supabase or SQLite under the user's isolated subspace.
8. **Forensic Presentation**: The frontend renders an interactive authenticity gauge, acoustic spectrum breakdown, and report download options.

---

## 5. Technical Stack & Engineering Specifications

### 5.1 Backend Infrastructure
| Component | Technology | Rationale / Specification |
|---|---|---|
| **Web Framework** | FastAPI (Python 3.11+) | Asynchronous ASGI framework, automatic OpenAPI documentation, high throughput. |
| **Deep Learning Framework** | PyTorch 2.x | Automatic device detection (CUDA GPU acceleration if available, optimized CPU fallback). |
| **Model Registry** | Hugging Face Transformers | Pretrained weight caching, tokenizers, and feature extractors. |
| **Audio Processing** | Librosa, SoundFile, NumPy | High-precision resampling, spectral transformations, format decoding. |
| **Cloud Database** | Supabase (PostgreSQL) | Managed cloud relational database with Row-Level Security (RLS) and triggers. |
| **Local Database** | SQLite3 | Embedded zero-dependency database for offline failover and local development. |
| **Authentication** | Firebase Admin SDK | Enterprise-grade JWT decoding, session revocation checking. |

### 5.2 Frontend Architecture
| Component | Technology | Rationale / Specification |
|---|---|---|
| **Framework** | React 19 + Vite 8 | Ultra-fast Hot Module Replacement (HMR), component-driven UI architecture. |
| **Styling** | TailwindCSS v4 + Vanilla CSS | Custom cyber-security design tokens, responsive dark theme. |
| **Iconography & Motion** | Lucide React, Framer Motion | Fluid micro-interactions, 3D card perspective tilt effects, accessible icons. |
| **Audio Engine** | HTML5 Web Audio API | `AudioContext`, `AnalyserNode` for live frequency transforms and oscilloscope rendering. |
| **Audio Encoder** | Custom 16-bit PCM WAV Encoder | Browser-native encoding to genuine 16kHz uncompressed WAV blobs without external binaries. |
| **Client Auth** | Firebase Client SDK v12 | Multi-provider authentication (Email/Password, Google OAuth). |

---

## 6. Machine Learning & Deep Learning Methodology

### 6.1 Model Architecture & Selection
VoiceShield leverages **`ArmanSandhu1729/voiceshield-hindi-english-deepfake-v2`** (and its v3-hardened variant), an advanced bilingual sequence classification model fine-tuned on native English and Hindi multi-speaker datasets.

- **Base Architecture**: Wav2Vec 2.0 XLSR-53 (`Wav2Vec2ForSequenceClassification`)
- **Total Parameters**: 315,700,000 (~1.26 GB memory footprint)
- **Feature Encoder**: 7 temporal convolutional layers extracting 512-dimensional latent feature vectors from raw 16,000 Hz waveforms (frozen during continual fine-tuning to preserve acoustic speech foundations).
- **Context Transformer**: 24 transformer encoder blocks with 16 self-attention heads each (hidden size 1024).
- **Classification Head**: Mean-pooling layer followed by a linear projection head mapping latent states to 2 output logits:
  - **Index 0**: `real` (Authentic Human Voice)
  - **Index 1**: `fake` (Synthetic / Voice Clone)
- **Continual Learning Governance**: Standardized on **Cumulative Anchor Replay + Automated Regression Gate** using the permanent **Hugging Face Golden Vault** (`ArmanSandhu1729/voiceshield-golden-vault`) to ensure 0% catastrophic forgetting across future releases.

### 6.2 Mathematical Formulation
Given an audio signal $x \in \mathbb{R}^T$ sampled at 16,000 Hz, the feature encoder produces latent representations:
$$Z = \text{TCN}(x)$$
The transformer blocks model temporal phoneme dependencies and vocoder artifacts:
$$C = \text{Transformer}(Z)$$
The classification head computes raw logits $z_0, z_1$:
$$z = \text{ClassifierHead}(\bar{C})$$
The Softmax function produces normalized probabilities:
$$P(\text{fake}) = \frac{e^{z_0}}{e^{z_0} + e^{z_1}}, \quad P(\text{real}) = \frac{e^{z_1}}{e^{z_0} + e^{z_1}}$$

### 6.3 Signal Quality Pre-Checks & Edge Cases
To prevent false classifications from degraded inputs:
1. **Duration Filter**: Inputs with duration $t < 1.0\text{s}$ are flagged `INCONCLUSIVE` (insufficient phoneme transitions).
2. **Silence / Noise Floor Check**: The Root Mean Square (RMS) energy is calculated:
   $$\text{RMS} = \sqrt{\frac{1}{N}\sum_{i=1}^N x_i^2}$$
   If $\text{RMS} < 0.001$, the input is classified as silent/blank and rejected.

---

## 7. Acoustic Signal Processing & Oscilloscope Visualizer

### 7.1 In-Browser 16-Bit PCM WAV Encoding
Browsers natively capture microphone streams in compressed WebM/Opus formats. To ensure compatibility with the neural model without server-side transcoding overhead:
- A custom JavaScript encoder intercepts raw Float32 audio frames via `ScriptProcessorNode` / `AudioWorklet`.
- Downsamples or resamples to 16,000 Hz.
- Quantizes 32-bit floating-point samples to signed 16-bit integers ($-32768$ to $+32767$).
- Constructs a compliant 44-byte RIFF WAV header (`WAVE_FORMAT_PCM`).

### 7.2 Center-Focused Symmetric Spectrum Visualizer
The live acoustic monitor (`AudioWaveformVisualizer.jsx`) transforms the standard Web Audio API `AnalyserNode` output into a centered speech monitor:
- **Frequency Bin Remapping**: Human speech energy is heavily concentrated between 85 Hz and 4,000 Hz (the lowest 20-30 FFT bins). Linear bin mapping historically crammed all spikes onto the far left.
- **Center Focus with Tukey/Hann Windowing**: The visualizer maps fundamental frequencies (90 Hz – 380 Hz) to the center of the canvas ($i = \text{center}$), while higher speech formants and harmonics (up to 6.5 kHz) fan out symmetrically towards the outer borders:
  $$\text{normDist} = \frac{|i - \text{centerIdx}|}{\text{centerIdx}}, \quad \text{Envelope} = \cos(\text{normDist} \cdot 0.46\pi)$$
- **Treble Pre-Emphasis**: High-frequency vocal components (fricatives "s", "sh", consonants) naturally possess less acoustic energy than vowel fundamentals. An equalization curve ($1.0 + \text{normDist}^{0.7} \times 1.4$) elevates high-frequency responsiveness.
- **Voice Activity Detection (VAD) & Strict Noise Gating**: Eliminates false ambient room noise inflation by gating signals below an RMS energy floor ($\text{RMS} \le 0.016$) and subtracting ambient microphone frequency hiss ($F_{\text{noise}} \ge 0.10$). During silence, bars remain locked to a pristine flat $2.5\text{px}$ baseline raster.
- **Acoustic Power-Law Scaling ($P^{1.35}$)**: Maps real frequency energy through power-law dynamics, replacing artificial linear bulges with authentic, dancing acoustic formant peaks.

---

## 8. Deterministic Contextual Risk Assessment Engine

### 8.1 Multi-Factor Decision Matrix
A synthetic voice alone is not the only indicator of a scam; conversely, a real voice can still be used in social engineering. The **Contextual Risk Engine** evaluates:
- $S_{\text{fake}}$: Acoustic synthetic probability ($0.0$ to $1.0$).
- $F_{\text{unknown}}$: Caller identity unverified or spoofed number ($+15\%$).
- $F_{\text{urgent}}$: High psychological pressure / emergency threat ($+20\%$).
- $F_{\text{finance}}$: Request for immediate wire transfer, gift cards, or credentials ($+25\%$).

$$\text{RiskScore} = (S_{\text{fake}} \times 0.60) + (F_{\text{context}} \times 0.40)$$

### 8.2 Threat Tiers & Automated Recommendations
| Threat Level | Score Range | Meaning | Automated Recommendation |
|---|---|---|---|
| **CRITICAL** | $80\% - 100\%$ | High synthetic probability combined with financial demands or emergency pressure. | **IMMEDIATE HANGUP**: Do not transfer funds or disclose passwords. Contact the individual via a known trusted channel. |
| **HIGH** | $60\% - 79\%$ | Significant synthetic voice probability or heavy extortion flags. | **EXERCISE EXTREME CAUTION**: Ask personal security challenge questions that an AI cannot answer. |
| **MEDIUM** | $35\% - 59\%$ | Ambiguous acoustic indicators or unknown caller with mild pressure. | **VERIFY IDENTITY**: Request call-back on a verified landline or official company directory number. |
| **LOW** | $0\% - 34\%$ | Natural human acoustic signatures with no coercion indicators. | **SAFE**: Normal conversation parameters detected. |

---

## 9. Database Architecture & Dual-Mode Persistence

To guarantee enterprise-level resilience, VoiceShield implements a hybrid database strategy:

```
                            Database Request
                                   |
                                   v
                      +--------------------------+
                      | Is Supabase Configured   |
                      |     and Reachable?       |
                      +--------------------------+
                                   |
                   +---------------+---------------+
                   | Yes                           | No / Timeout (1.5s)
                   v                               v
       +-----------------------+       +-----------------------+
       | Supabase (PostgreSQL) |       | SQLite3 (Local DB)    |
       | Cloud Managed RDBMS   |       | voiceshield.db        |
       | RLS Policies Enabled  |       | WAL Mode, ACID Safe   |
       +-----------------------+       +-----------------------+
```

### 9.1 Database Schema Definition
The database model contains two core tables:

1. **`users` Table**:
   - `user_id` (TEXT, PK): Cryptographic UID from Firebase.
   - `username` (TEXT): Display handle.
   - `email` (TEXT): Registered email address.
   - `joined_at` / `last_active_at` (TIMESTAMPTZ): User activity tracking.
   - `total_audios_analyzed` / `total_time_analyzed` (INTEGER, REAL): Aggregated metrics.
   - `total_recorded` / `total_uploaded` (INTEGER): Workflow breakdown.
   - `total_spoofs_detected` (INTEGER): Security incident metric.

2. **`analysis_history` Table**:
   - `id` (BIGINT, PK): Sequential identifier.
   - `event_id` (TEXT, UNIQUE): UUID4 transaction token.
   - `user_id` (TEXT, FK): References `users(user_id)` with `ON DELETE CASCADE`.
   - `mode` (TEXT): `record` or `upload`.
   - `duration` (REAL): Audio clip duration in seconds.
   - `model_name` (TEXT): Model version identifier.
   - `fake_score` / `real_score` (REAL): Softmax output probabilities.
   - `prediction` (TEXT): `AI_GENERATED` or `HUMAN_SPEECH`.
   - `context_risk` (JSONB / TEXT): Situational flags.
   - `final_risk` (TEXT): Categorical threat level.
   - `risk_explanation` (TEXT): Forensic explanation text.
   - `file_name` (TEXT): Audio file name or recording identifier.
   - `username` / `user_email` (TEXT): User metadata snapshot.
   - `is_flagged` (BOOLEAN): User bookmark flag.
   - `created_at` (TIMESTAMPTZ): Audit timestamp.

### 9.2 Triggers and Row-Level Security (RLS)
- **Subspace Isolation**: In PostgreSQL, Row-Level Security policies ensure users only query rows where `auth.uid() = user_id`, while the backend service role maintains administrative oversight.
- **Automated Sync Trigger (`sync_user_analysis_subspace`)**: Database-level PL/pgSQL trigger automatically creates user subspace records and updates cumulative counters upon any insertion into `analysis_history`.

---

## 10. User Interface & Experience Design (VoiceShield Cyber UI System)

VoiceShield employs a modern **Cybersecurity Dark UI Design System**, combining futuristic aesthetics with accessible forensic workflows:
- **Palette**: Cosmic Void Black (`#04090e`), Cyber Cyan (`#00f5d4`), Neon Electric Blue (`#00d4ff`), Deep Emerald (`#10b981`), and Crimson Alert (`#f43f5e`).
- **Typography**: Space Grotesk / Sora headings with Inter body text and JetBrains Mono for telemetry readouts.
- **Core Views**:
  1. **Landing Page**: Real-time counter metrics, 3D mouse-tracking demo card with glassmorphic depth, and structured Engineering Specifications.
  2. **Studio Workspace**: Live microphone recording with interactive oscilloscope monitor, WAV trimmer/cropper, and drag-and-drop audio uploader.
  3. **Analysis Dashboard**: Real-time authenticity gauge, confidence distribution, acoustic feature breakdown, and situational risk analysis.
  4. **History Vault**: Paginated audit log with search, multi-column filters (AI vs Human, Record vs Upload), inline audio player, and file renaming.
  5. **Telemetry Hub**: Personal statistics (total audio analyzed, detection rates, cumulative duration).
  6. **Authentication & Profile**: Email/Password and Google OAuth with password visibility toggles and portaled username edit modal.
  7. **High-Tech Cyber Loader**: Full-screen startup sequence featuring a floating neon shield with an embedded pulsing microphone that radiates concentric outward cyber ripples during system initialization.
- **Unified Brand Iconography**: A custom **Shield-with-Microphone emblem (`ShieldMicLogo`)** standardized across the navigation header, footer, authentication card, risk badges, and metric counters.

---

## 11. Testing, Validation & Performance Evaluation

### 11.1 Verification Test Suite
| Test Case | Target Component | Input Condition | Expected Behavior | Observed Result | Status |
|---|---|---|---|---|---|
| **TC-01** | API Gateway | `GET /health` | Health status 200, model status reporting. | `{"status": "healthy", "version": "2.0.0"}` | **PASSED** |
| **TC-02** | Deep Learning Engine | `GET /model-status` | Report 94.5M parameters, Wav2Vec2 architecture. | Architecture verified, device detected. | **PASSED** |
| **TC-03** | Human Audio Sample | `POST /analyze-file` | Genuine 3.0s human voice WAV file. | $P(\text{real}) = 99.26\%$, $P(\text{fake}) = 0.74\%$. | **PASSED** |
| **TC-04** | Synthetic Audio Sample | `POST /analyze-file` | Generative voice clone (16kHz). | $P(\text{fake}) > 95\%$, `AI_GENERATED`. | **PASSED** |
| **TC-05** | Short Audio Edge Case | `POST /analyze-file` | Audio clip duration = 0.3 seconds. | Returns `INCONCLUSIVE` (clip $< 1.0\text{s}$). | **PASSED** |
| **TC-06** | Silence Edge Case | `POST /analyze-file` | Flat zero-amplitude audio ($RMS < 0.001$). | Returns `INCONCLUSIVE` (silent input). | **PASSED** |
| **TC-07** | Corrupted File | `POST /analyze-file` | Non-audio binary payload. | HTTP 400 Bad Request with descriptive message. | **PASSED** |
| **TC-08** | Cloud Failover | Database Service | Block Supabase port 443. | Automatic fallback to local `voiceshield.db`. | **PASSED** |
| **TC-09** | Live Oscilloscope | Frontend Visualizer | Microphone input with varied pitch. | Peaks centered with symmetric frequency distribution. | **PASSED** |

### 11.2 Performance Benchmarks
- **Average Inference Latency**: ~450ms on GPU (CUDA), ~1.1s on multi-core CPU.
- **Frontend Asset Bundle**: 685 kB minified production bundle, compiles in under 600ms via Vite.
- **Database Failover Speed**: Seamless $\le 1.5$s timeout before automatic SQLite activation.

---

## 12. Conclusion & Future Roadmap

VoiceShield delivers a cohesive, fully functioning deep learning solution to voice cloning fraud. By unifying sequence classification, audio digital signal processing, contextual heuristics, and dual-mode data persistence into a modern web interface, the system demonstrates how AI tools can be deployed responsibly to safeguard human communications.

### 12.1 Future Scope & Research Directions

1. **Multilingual Deepfake Detection (Hindi & Regional Language Expansion)**:
   - While the current model specializes in English acoustic sequences, real-world social engineering scams heavily target non-English and multilingual demographics.
   - The future architecture will integrate multilingual foundation models (such as Meta's **XLS-R 300M**, **IndicWav2Vec**, or **MMS - Massively Multilingual Speech**) fine-tuned specifically on Indian and global speech datasets to accurately capture deepfake nuances in **Hindi**, regional Indian dialects, and code-mixed speech (e.g., Hinglish).

2. **Input Voice Language Categorization & Classification Engine**:
   - Implementation of an integrated **Language Identification (LID)** preprocessing neural head (such as an ECAPA-TDNN or Whisper-tiny acoustic classifier).
   - The system will automatically detect, categorize, and label the spoken language of the incoming audio stream in real-time, displaying language confidence metrics to the user and dynamically routing the audio to language-optimized deepfake inference weights.

3. **Real-Time Spoof Detection with Live Call Assistance & Active Threat Notifications**:
   - Transitioning from on-demand audio capture to **live call assistance** by interfacing with telephony APIs (SIP / WebRTC), VoIP desktop clients, and smartphone accessibility audio streams.
   - Real-time sliding window analysis (evaluating continuous 2-second chunks with 500ms overlap) to monitor ongoing conversations in the background.
   - **Active Threat Notifications**: Instantly trigger high-priority visual HUD overlays and audible alert notifications the moment synthetic speech signatures or high-pressure social engineering keywords are detected during an active call, enabling users to terminate fraudulent calls before financial transfers occur.

4. **Biometric Voice Fingerprinting & Known Voice Vault**:
   - Enable users to enroll trusted voice profiles (family members, executive personnel) using x-vector/d-vector speaker embeddings.
   - The system will cross-reference incoming calls against enrolled profiles to detect both synthetic cloning attempts and unauthorized impersonation.

---

## 13. Production Cloud Deployment & Native Mobile Architecture (v4.2.0)

### 13.1 Hugging Face Spaces (ZeroGPU Free Tier) Backend

> **Why Hugging Face Spaces over Render:**  
> Standard cloud PaaS services like Render Free Tier enforce a rigid 512 MB RAM limit with zero GPU access. Because VoiceShield's cross-lingual Wav2Vec 2.0 XLSR-53 model (`1.26 GB` weights) requires ~1.4 GB memory to initialize, deploying on Render triggered fatal out-of-memory crashes (`Out of memory (used over 512Mi)`). Pivoting to **Hugging Face Spaces ZeroGPU** resolved this by providing **16 GB of system RAM** and free on-demand **NVIDIA A10G (24 GB VRAM)** acceleration, slashing real-time chunk inference latency from 2,500ms down to **under 45ms** while hosting both the FastAPI REST endpoints and an interactive Gradio web playground (`/gradio/`).

- **Endpoint**: `https://armansandhu1729-voiceshield-backend.hf.space`
- **Hardware Acceleration**: Dynamically attached **NVIDIA A10G 24GB VRAM** via `@spaces.GPU(duration=30)`.
- **Inference Speed**: Reduced from 2.5s (CPU) to **35ms – 55ms per window**.
- **REST & Gradio Routing**: Dual surface serving FastAPI REST routes (`/analyze-file`, `/analysis/live-chunk`, `/health`, `/history`) alongside an interactive Gradio web playground (`/gradio/`).

### 13.2 Vercel Production Frontend
- **Live Web App**: `https://voiceshield-aispoof-detection.vercel.app/`
- **Hosting**: Vercel automated continuous integration and continuous deployment (CI/CD).
- **Deep SPA Routing**: `vercel.json` configured with fallback rewrites to `/index.html` ensuring direct navigation to all dashboard and telemetry views.
- **Environment Integration**: Securely loads Hugging Face API URLs and Firebase authentication tokens.

### 13.3 Native Android Mobile Application
- **Distribution Package**: `VoiceShield.apk` (4.55 MB), built via Capacitor 8 and Gradle 8.14.3 targeting Android 15 (API 35).
- **Mobile Hardware Integration**: Hardware back button management via `@capacitor/app`, mobile vibration/haptics, audible alarm beeps, and zero-drift responsive viewport containment.

### 13.4 Automated CI/CD Release Pipeline & Frictionless CDN Distribution
- **Automated Cloud Build (`.github/workflows/build-apk.yml`)**: Continuous deployment workflow on GitHub Actions utilizing Java JDK 21 and Gradle 8.14.3 to compile the Android APK and publish release binaries directly to GitHub Releases upon tag triggers.
- **Zero-Auth Static CDN Hosting**: To circumvent Google Play developer fees and ensure immediate public accessibility while preserving full repository privacy, `VoiceShield.apk` is served directly from the website's static public asset edge (`https://voiceshield-aispoof-detection.vercel.app/VoiceShield.apk`).
- **Hero CTA Integration**: Seamless 1-click download trigger built into the primary landing page interface.
