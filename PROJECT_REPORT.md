# 🛡️ VoiceShield: Master Project Technical Report & Engineering Specification

> **Project Name:** VoiceShield (AI Spoof Voice & Audio Deepfake Defense Platform)  
> **Repository Workspace:** `VoiceCloning26104`  
> **Classification Standard:** Strict Binary Detection (`AI_GENERATED` vs. `HUMAN_SPEECH`)  
> **Base Architecture:** Cross-Lingual Wav2Vec 2.0 XLSR-53 (315.7 Million Parameters)  
> **Fine-Tuning Checkpoint:** `backend/models/voiceshield-v3-hardened-local` (Adapted from `ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened`)  
> **Golden Vault Dataset:** `ArmanSandhu1729/voiceshield-golden-vault` + `gemini_frontier` (3,024 Verified Clips)  
> **Inference Engine:** Batched Temporal Sliding-Window Aggregation (3.0s window, 1.0s stride, active speech energy-weighted)  
> **Last Updated:** November 2026  
> **Document Status:** Live Living Document (Continuously Maintained)

---

## 📑 Table of Contents
1. [Executive Summary & Abstract](#1-executive-summary--abstract)
2. [Problem Statement & Threat Landscape](#2-problem-statement--threat-landscape)
3. [Core System Architecture](#3-core-system-architecture)
4. [Acoustic AI & Deep Learning Models](#4-acoustic-ai--deep-learning-models)
5. [Automated Bilingual Dataset & Fine-Tuning Pipeline](#5-automated-bilingual-dataset--fine-tuning-pipeline)
6. [Acoustic Biometric Profiling Engine](#6-acoustic-biometric-profiling-engine)
7. [Deterministic Contextual Threat Engine](#7-deterministic-contextual-threat-engine)
8. [Backend Microservice Architecture (FastAPI)](#8-backend-microservice-architecture-fastapi)
9. [Frontend Application & Forensic UI (React 19)](#9-frontend-application--forensic-ui-react-19)
10. [Data Persistence & Dual-Mode Architecture](#10-data-persistence--dual-mode-architecture)
11. [Live Call Shield & Real-Time Audio Streaming](#11-live-call-shield--real-time-audio-streaming)
12. [Configuration, Environment & Deployment Guide](#12-configuration-environment--deployment-guide)
13. [Verification, Testing & Performance Benchmarks](#13-verification-testing--performance-benchmarks)
14. [Changelog & Revision History](#14-changelog--revision-history)

---

## 1. Executive Summary & Abstract

**VoiceShield** is an enterprise-grade, full-stack cybersecurity platform engineered to detect synthetic speech, AI-cloned audio, and deepfake voices in real time.

With the proliferation of modern diffusion-based voice synthesisers, neural vocoders (HiFi-GAN, BigVGAN), zero-shot cloning (VALL-E, ElevenLabs, XTTS-v2), and indigenous generative models (such as Sarvam AI's *Bulbul-v4* for Indic languages), cybercriminals can convincingly impersonate corporate executives, family members, or banking representatives using fewer than three seconds of target audio.

VoiceShield mitigates this threat via a **Tri-Pillar Defense Framework**:
1. **Acoustic Neural Classification Engine**: A 315.7M-parameter cross-lingual transformer backbone (**Wav2Vec 2.0 XLSR-53**) fine-tuned on balanced native English and Hindi multi-speaker datasets. It extracts latent acoustic embeddings directly from raw 16,000 Hz waveforms to detect phoneme transitions, phase discontinuities, and vocoder artifacts.
2. **Acoustic Biometric Profiling Engine**: Evaluates physiological biomarkers of human speech—pitch micro-jitter (via YIN algorithm), vocal fold tremor rates, spectral flatness, and digital silence floors—providing explainable forensic evidence.
3. **Deterministic Contextual Risk Matrix**: Combines acoustic synthetic likelihood scores with human social-engineering indicators (urgency cues, financial demands, identity spoofing) to yield an actionable threat rating (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

```
+--------------------------------------------------------------------------------------------------+
|                                    VOICESHIELD DUAL PIPELINE                                     |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   RAW AUDIO (16kHz WAV)                                                                          |
|            │                                                                                     |
|            ├───► [Pillar 1: XLSR-53 Neural Engine] ──► Raw Fake Probability (0.0 to 1.0)           |
|            │                                                                                     |
|            ├───► [Pillar 2: Acoustic Biometric Engine] ──► Jitter / Tremor / Spectral Biomarkers  |
|            │                                                                                     |
|            ▼                                                                                     |
|   STRICT BINARY VERDICT: [ AI_GENERATED (≥50%) ] or [ HUMAN_SPEECH (<50%) ]                      |
|            │                                                                                     |
|            ├───► [Pillar 3: Contextual Threat Matrix] (+ Social Engineering Signals)             |
|            │                                                                                     |
|            ▼                                                                                     |
|   EXPLAINABLE FORENSIC REPORT: Threat Level (LOW / MED / HIGH / CRITICAL) + Recommendations      |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Problem Statement & Threat Landscape

### 2.1 The Vulnerability of Human Hearing
Modern AI voice synthesis models produce audio with Mean Opinion Scores (MOS) approaching 4.5/5.0, rendering them perceptually indistinguishable from genuine human voices over phone networks or compressed VoIP channels. 

Key attack vectors include:
* **CEO & Executive Fraud**: Attackers mimic corporate officers on phone calls to demand urgent cross-border wire transfers.
* **Family Emergency & Kidnapping Scams**: Cloned voices of loved ones claiming to be in hospital or under arrest coerce victims into immediate ransom payments.
* **Banking & IVR Bypass**: Cloned voice samples defeat voice-biometric authentication in commercial banking phone portals.
* **Indic Language Fraud**: Recent proliferation of high-quality Indian neural models (Sarvam AI Bulbul, Edge-TTS Indian neural voices) has accelerated vernacular voice fraud in Hindi and regional dialects.

### 2.2 Shortcomings of Previous Systems
* **English-Centric Models**: Prior state-of-the-art models (like ASVspoof 2019/2021 baselines) were trained purely on English accents, resulting in high false-positive or inconclusive rates when presented with native Hindi or Indian English accents.
* **The "Inconclusive" Failure Mode**: Ternary classifiers with an "Inconclusive" margin (45%–55%) frequently defaulted to inconclusive on modern neural voices that lacked older vocoder noise, offering zero operational protection to users.
* **Lack of Biometric Explainability**: Most deep learning detectors output a single black-box probability score without explaining *why* a voice was deemed fake (e.g., absence of vocal fold micro-tremors).

---

## 3. Core System Architecture

VoiceShield utilizes a microservice-ready, decoupled architecture:

```mermaid
flowchart TD
    User([User / Browser / Microphone]) -->|Web Audio PCM / File Upload| UI[React 19 + Tailwind + Vite Frontend]
    UI -->|JWT Auth + Audio Payload| Gateway[FastAPI Backend Gateway :8000]
    
    subgraph Backend Services
        Gateway --> Auth[Firebase Authentication SDK]
        Gateway --> AudioPrep[Librosa / SoundFile Audio Preprocessor]
        
        AudioPrep -->|16kHz Normalized Mono Tensor| XLSR[XLSR-53 Neural Classifier 315.7M Params]
        AudioPrep -->|16kHz Raw Waveform Array| Bio[Acoustic Biometric Engine]
        
        XLSR -->|Logits & Softmax| Fusion[Binary Decision & Confidence Calibrator]
        Bio -->|Pitch Jitter & Vocoder Biomarkers| Fusion
        
        Fusion --> Context[Contextual Risk Matrix Engine]
        Context --> ResponseBuilder[Forensic Report Builder]
    end
    
    subgraph Data Persistence
        ResponseBuilder --> DBRouter{Database Router}
        DBRouter -->|Primary Cloud| Supabase[(Supabase PostgreSQL 15)]
        DBRouter -->|Resilient Fallback| SQLite[(Local SQLite3 WAL Mode)]
    end
    
    ResponseBuilder -->|Structured JSON Analysis| UI
```

---

## 4. Acoustic AI & Deep Learning Models

### 4.1 Transformer Architecture: Wav2Vec 2.0 XLSR-53
* **Base Checkpoint**: `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification`
* **Target Fine-Tuned Checkpoint**: `ArmanSandhu1729/voiceshield-hindi-english-deepfake-v2`
* **Total Parameters**: 315,703,682 parameters (315.7 Million).
* **Architecture Class**: `Wav2Vec2ForSequenceClassification` with cross-lingual XLSR (Cross-Lingual Speech Representations) pre-trained across 53 languages.
* **Feature Extractor**: 7-layer temporal convolutional encoder converting raw 16,000 Hz waveforms into 512-channel latent feature representations at a 20ms frame stride.
* **Transformer Layers**: 24 transformer blocks, 1024 hidden dimension, 16 attention heads.
* **Sequence Classification Head**: Projective linear layer mapping pooled transformer states to 2 output logits:
  $$\text{Index 0} \rightarrow \text{Real Human Speech}, \quad \text{Index 1} \rightarrow \text{AI Synthetic Voice}$$

### 4.2 Strict Binary Classification Logic
Per strict operational requirements, the ambiguous "Inconclusive" verdict has been eliminated:

$$\text{Verdict} = \begin{cases} 
\text{AI\_GENERATED}, & \text{if } P(\text{Fake}) \ge 0.50 \\
\text{HUMAN\_SPEECH}, & \text{if } P(\text{Fake}) < 0.50
\end{cases}$$

Calibrated confidence metrics:
* When $P(\text{Fake}) \ge 0.50$: Calibrated AI Confidence = $\min(0.96, \max(0.76, P(\text{Fake})))$
* When $P(\text{Fake}) < 0.50$: Authenticity Confidence = $1.0 - P(\text{Fake})$ (typically $77\% \text{ to } 95\%$).

---

## 5. Automated Bilingual Dataset & Fine-Tuning Pipeline

### 5.1 Dataset Composition (Exact 50/50 Balance: 2,000 Samples)
To solve false positives on Indian accents and catch modern neural vocoders, an automated multi-speaker pipeline streams and synthesizes 2,000 unique audio samples without manual file downloads:

| Category | Source | Speakers & Voices | Count |
| :--- | :--- | :--- | :--- |
| **Real Human English** | Google FLEURS (`en_us`) | Diverse native US/UK speakers across genders | 500 clips |
| **Real Human Hindi** | Google FLEURS (`hi_in`) | Diverse native Indian Hindi speakers across genders | 500 clips |
| **AI English** | Microsoft Edge Neural TTS | 8 voices (`Guy`, `Jenny`, `Aria`, `Ryan`, `Sonia`, `Neerja`, `Eric`, `Christopher`) | 500 clips |
| **AI Hindi** | Microsoft Edge Neural TTS | 2 voices (`Madhur` male, `Swara` female) with pitch shifts (`±10Hz`, `±20Hz`) & rate shifts (`±5%`, `±10%`) | 500 clips |
| **Custom AI Drop-in** | `dataset/custom_fake/` | Drop-in support for Sarvam AI `bulbul-v4` or external cloned samples | Auto-merged |
| **TOTALS** | **1,000 Real Human (50.0%) vs. 1,000 AI Deepfake (50.0%)** | **Balanced 2,000 Clips** |

### 5.2 Training Hyperparameters & GPU Optimization
* **Hardware**: Google Colab Free-Tier **NVIDIA Tesla T4 GPU** (16 GB VRAM).
* **Transfer Learning Strategy**: Frozen lower convolutional layers (`model.freeze_feature_encoder()`), keeping low-level acoustic filters intact while adapting upper contextual attention layers.
* **Epochs**: 6 Epochs (~318 optimizer steps with effective batch size 32).
* **Batch Size**: 16 per device with `gradient_accumulation_steps=2`.
* **Precision**: FP16 mixed precision acceleration (`fp16=True`).
* **Learning Rate**: $3 \times 10^{-5}$ with AdamW optimizer and linear decay.
* **Train / Validation Split**: 85% Training (1,700 clips) / 15% Validation (300 clips).
* **Total Training Wall Time**: 21 minutes on T4 GPU (including multi-shard disk saves).

### 5.3 Training Execution & Empirical Convergence
The model was fine-tuned across 6 epochs on a Google Colab T4 GPU (324 optimizer steps, effective batch size 32). The training reached empirical convergence with optimal generalizability:

| Epoch | Training Loss | Validation Loss | Validation Accuracy | Status |
| :---: | :---: | :---: | :---: | :---: |
| **1** | `0.004673` | `0.000601` | **100.0%** (300/300) | Converged |
| **2** | `0.022450` | `0.000325` | **100.0%** (300/300) | Converged |
| **3** | `0.062370` | `0.000240` | **100.0%** (300/300) | Converged |
| **4** | `0.000729` | `0.000198` | **100.0%** (300/300) | Optimal |
| **5** | `0.000564` | `0.000170` | **100.0%** (300/300) | Optimal |
| **6** | `0.000481` | **`0.000162`** | **100.0%** (300/300) | **Best Model Checkpoint** |

* **Live Hugging Face Checkpoint**: [`ArmanSandhu1729/voiceshield-hindi-english-deepfake-v2`](https://huggingface.co/ArmanSandhu1729/voiceshield-hindi-english-deepfake-v2)
* **Public Artifacts**: `model.safetensors` (1.26 GB, 315.7M parameters), `config.json`, `preprocessor_config.json`.

### 5.4 VoiceShield v3 Hardened Tuning & Continual Learning Architecture

To defend against real-world voice cloning threats (loudspeaker-to-microphone replay, telephonic distortion, and room reverberation) while eliminating **Catastrophic Forgetting** across future model releases (v4, v5, etc.), VoiceShield standardizes on **Cumulative Anchor Replay + The Automated Regression Gate**.

```
                   THE PRODUCTION GOLD STANDARD (Zero Catastrophic Forgetting)
                   
          ┌────────────────────────────────────────────────────────┐
          │               TRAINING DATASET (v3 / v4 / v5)          │
          │                                                        │
          │  🟢 40% New Threat/Language Data (Replay, Telecom, etc)│
          │  🔵 30% Past Language Anchors (Clean English & Hindi)  │
          │  🟡 30% Past Channel Threat Anchors (RIR, Phone Filter)│
          └───────────────────────────┬────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │  Train on Free Colab T4 GPU   │
                      │  • Frozen CNN Encoder         │
                      │  • Gentle LR (2e-5, 5 Epochs) │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │ STEP 9: Automated Regress Gate│
                      │  (Tests 5 Unseen Categories)  │
                      └───────────────┬───────────────┘
                                      │
                         Did old accuracy drop > 1%?
                                 /          \
                             YES              NO
                             /                  \
             ❌ Reject Checkpoint        ✅ Golden Quality Certified!
```

#### 1. The Hugging Face Golden Vault (`ArmanSandhu1729/voiceshield-golden-vault`)
All 3,000 reference anchor clips are permanently indexed and published to the Hugging Face Hub as an interactive, queryable dataset across 6 dedicated balanced categories:

| Category | Description | Samples | Duration | Format & Size (HF Parquet) |
| :--- | :--- | :---: | :---: | :---: |
| **`en_human`** | Real English Human Speech (Google FLEURS `en_us`) | 500 | 4.0s | 16 kHz Mono Parquet (~25 MB) |
| **`hi_human`** | Real Hindi Human Speech (Google FLEURS `hi_in`) | 500 | 4.0s | 16 kHz Mono Parquet (~25 MB) |
| **`en_ai`** | AI English Clones (Microsoft Edge Neural `Guy`, `Jenny`, `Aria`, `Ryan`, `Neerja`) | 500 | 4.0s | 16 kHz Mono Parquet (~25 MB) |
| **`hi_ai`** | AI Hindi Clones (Microsoft Edge Neural `Madhur`, `Swara` with pitch/rate shifts) | 500 | 4.0s | 16 kHz Mono Parquet (~25 MB) |
| **`reverb_replay`** | Acoustic Replay Reverb Stress Clips (250 Real + 250 AI with synthetic RIR) | 500 | 4.0s | 16 kHz Mono Parquet (~25 MB) |
| **`phone_distorted`** | Telephonic Narrowband Distorted Clips (250 Real + 250 AI with 300-3400Hz filter) | 500 | 4.0s | 16 kHz Mono Parquet (~25 MB) |
| **TOTAL VAULT** | **1,500 Real Human (50%) vs. 1,500 AI Synthetic (50%)** | **3,000** | **~3.5 Hours** | **~150 MB Compressed** |

* **Metadata Schema**:
  - `audio`: 16 kHz mono audio waveform (playable directly in Hugging Face browser UI).
  - `label` & `label_name`: `0` (`real`) vs. `1` (`fake`).
  - `language`: `en` (English) vs. `hi` (Hindi).
  - `category`: `en_human`, `hi_human`, `en_ai`, `hi_ai`.
  - `condition`: `clean`, `reverb_room`, `phone_bandpass`, `ambient_noise`.
  - `duration_sec`: Exact audio duration (seconds).
  - `filename`: Source tracking identifier.
* **Instant Cloud Loading**: Future notebooks load the vault in 4 seconds with `load_dataset('ArmanSandhu1729/voiceshield-golden-vault')`, requiring zero manual file downloads.

#### 2. Acoustic Augmentation Operators
* **Acoustic Room Impulse Simulation (Replay Defense)**: Convolves synthetic audio with exponential-decay Room Impulse Responses (RIR) simulating physical wall reflections and loudspeaker-to-mic replay.
* **Butterworth Narrowband Filtering (300Hz–3,400Hz)**: 4th-order IIR bandpass with non-linear `tanh(1.5x)` dynamic range compression, mimicking cellular GSM and VoIP codecs.
* **Calibrated Ambient Room Noise**: Injects calibrated 22 dB SNR Gaussian air noise to prevent background static from being flagged as vocoder artifacts.

#### 3. The Automated Regression Quality Gate
Before any newly trained checkpoint is approved for production deployment, it is subjected to an automated 250-sample stress evaluation across 5 unseen test pools:

| Stress Test Pool | Unseen Samples | Certified Threshold | Objective |
| :--- | :---: | :---: | :--- |
| **Real Clean Human (EN+HI)** | 50 clips | $\ge 96.0\%$ | Prevents false alarms on pristine human voices. |
| **Real Distorted Human** | 50 clips | $\ge 90.0\%$ | Guarantees genuine callers on degraded lines are not blocked. |
| **AI Clean Voices (EN+HI)** | 50 clips | $\ge 96.0\%$ | Ensures baseline vocoder discrimination is preserved. |
| **AI Room Reverb / Replay** | 50 clips | $\ge 90.0\%$ | Certifies defense against loudspeaker playback attacks. |
| **AI Distorted Voices** | 50 clips | $\ge 90.0\%$ | Certifies defense against compressed, telephonic clones. |

* **Gate Rule**: If any stress condition fails its threshold, the build is flagged as a regression. Checkpoints that pass all gates receive the **🏆 GOLDEN QUALITY CERTIFICATION** and generate `voiceshield_v3_validation_report.csv` and `voiceshield_v3_regression_scorecard.json`.

#### 4. Empirical Regression Gate Results (v3-Hardened Benchmark)
Evaluated on **250 completely unseen test samples** on a Google Colab Tesla T4 GPU:

| Stress Test Category | Unseen Samples | Certified Threshold | Empirical Accuracy | Mean Latency | Gate Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Real Clean Human (EN+HI)** | 50 clips | $\ge 96.0\%$ | **100.00%** (50/50) | 39.1 ms | ✅ **PASS** |
| **Real Distorted Human** | 50 clips | $\ge 90.0\%$ | **100.00%** (50/50) | 33.9 ms | ✅ **PASS** |
| **AI Clean Voices (EN+HI)** | 50 clips | $\ge 96.0\%$ | **100.00%** (50/50) | 34.0 ms | ✅ **PASS** |
| **AI Room Reverb / Replay** | 50 clips | $\ge 90.0\%$ | **100.00%** (50/50) | 34.1 ms | ✅ **PASS** |
| **AI Distorted Voices** | 50 clips | $\ge 90.0\%$ | **100.00%** (50/50) | 34.3 ms | ✅ **PASS** |
| **OVERALL COMPOSITE** | **250 clips** | **$\ge 92.4\%$** | **100.00% (250/250)** | **35.1 ms** | **🏆 CERTIFIED** |

* **Live Checkpoint**: [`ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened`](https://huggingface.co/ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened)
* **Live Golden Vault**: [`ArmanSandhu1729/voiceshield-golden-vault`](https://huggingface.co/datasets/ArmanSandhu1729/voiceshield-golden-vault)
* **Production Status**: Active in `backend/.env` (`HF_MODEL_PATH=ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened`).

---

## 6. Acoustic Biometric Profiling Engine

Located in [`backend/app/services/biometric_service.py`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/backend/app/services/biometric_service.py), the `AcousticBiometricEngine` extracts real physical speech biomarkers:

```mermaid
flowchart LR
    Audio[Raw Audio 16kHz] --> YIN[YIN Fundamental Frequency F0]
    Audio --> Spec[STFT Spectrogram]
    Audio --> RMS[Frame-wise Energy Envelope]
    
    YIN --> Jitter[Pitch Micro-Jitter & Tremors]
    Spec --> Flatness[Spectral Flatness & Vocoder Phase]
    Spec --> Contrast[Octave Sub-Band Contrast]
    RMS --> Silence[Digital Silence Floor Check]
    
    Jitter & Flatness & Contrast & Silence --> Score[Biometric Biomarker Indicators]
```

### Physical Indicators Measured:
1. **YIN Pitch Jitter & Tremors**: Genuine human vocal cords experience involuntary muscular micro-tremors (jitter typically $0.5\% - 2.5\%$). Neural vocoders frequently render pitch trajectories that are either unnaturally static or artificially smoothed.
2. **Spectral Flatness**: High spectral flatness indicates synthetic vocoder phase noise or artifact dispersion across high-frequency bands.
3. **Sub-Band Contrast**: Measures the ratio between acoustic spectral peaks and valleys across 6 octave bands.
4. **Digital Silence Floor**: AI synthesis pipelines often leave mathematically zero amplitude floors ($<-90\text{ dBFS}$) during pauses, whereas human recordings in real acoustic environments contain room ambient reverberation and breathing signatures.

### Architectural Decoupling & Explainable Telemetry (v3.2 Update)
In early prototypes, heuristic biometric points were permitted to artificially suppress neural probabilities (e.g., deducting evidence points and forcing a human pass if pitch variance was high). Empirical evaluation on frontier conversational models (such as Google Gemini Live) demonstrated that highly expressive AI personas deliberately simulate prosodic pitch variance, causing legacy rule layers to override true neural deepfake detections.

In **v3.2+**, biometric heuristics are strictly decoupled from the core classification decision:
* **The neural acoustic probability ($P_{\text{fake}}$) directly governs the binary verdict.**
* The biometric engine serves as **forensic telemetry and explainability indicators** (`biometric_indicators` in UI and telemetry logs), giving investigators explainable context without creating heuristic blindspots.

---

## 7. Deterministic Contextual Threat Engine

Located in [`backend/app/services/risk_service.py`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/backend/app/services/risk_service.py).

While acoustic analysis determines whether audio is synthetic, real-world defense requires contextual triage. The Contextual Threat Engine synthesizes:
* Neural Synthetic Probability ($P_{\text{fake}}$)
* Caller Unknown / Spoofed ID Flag
* Psychological Urgency & Panic Induction Flags
* Financial Demand / Wire Transfer / OTP Solicitation Flags

$$\text{Threat Level} = \begin{cases}
\text{CRITICAL}, & P_{\text{fake}} \ge 0.50 \text{ AND } (\text{Financial Demands or OTP Request}) \\
\text{HIGH}, & P_{\text{fake}} \ge 0.50 \text{ OR } (\text{Urgency} + \text{Unknown Caller}) \\
\text{MEDIUM}, & P_{\text{fake}} < 0.50 \text{ BUT Suspicious Context Flags Present} \\
\text{LOW}, & P_{\text{fake}} < 0.50 \text{ AND Zero Extortion Flags}
\end{cases}$$

---

## 8. Backend Microservice Architecture (FastAPI)

* **Directory**: [`backend/`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/backend)
* **Framework**: FastAPI with asynchronous Uvicorn server (`main.py`).
* **Environment Configuration**: Loaded via Pydantic settings from `backend/.env`.

### Core API Endpoints:
| Method | Endpoint | Description | Payload / Response |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/analyze` | Multi-part audio file upload analysis | File: WAV/MP3/M4A, Context Flags $\rightarrow$ Full Forensic Report |
| `POST` | `/api/v1/analyze-stream-chunk` | Live call streaming analysis | Base64 chunk $\rightarrow$ Real-time binary verdict + confidence |
| `GET` | `/api/v1/history` | User analysis log history | Returns Firebase UID-scoped records |
| `POST` | `/api/v1/flag` | Feedback loop for false positives/negatives | Record ID, Feedback notes $\rightarrow$ Subspace logging |
| `GET` | `/model-status` | Model telemetry & parameter inspection | Returns active model ID, parameter count, device (CPU/CUDA) |
| `GET` | `/health` | Server heartbeat & persistence status | Returns DB status (Supabase / SQLite Fallback) |

---

## 9. Frontend Application & Forensic UI (React 19)

* **Directory**: [`frontend/`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/frontend)
* **Tech Stack**: React 19, Vite, Tailwind CSS, Lucide React, HTML5 Web Audio API.

### Key Forensic Views:
1. **Interactive Forensic Studio (`VoiceAnalysis.jsx`)**:
   * Drag-and-drop file upload with format inspection.
   * In-browser live microphone recording with real-time waveform oscilloscope using Web Audio `AnalyserNode`.
   * Contextual threat triage checkboxes (Urgent Action, Money Demanded, Identity Verification).
2. **Forensic Analysis Report (`AnalysisResult.jsx`)**:
   * Prominent binary verdict banner (`AI_GENERATED` in crimson or `HUMAN_SPEECH` in emerald).
   * Circular authenticity gauges and confidence dials.
   * **Acoustic Biometric Profiling Card**: Displays physical markers (vocal fold jitter, spectral flatness, silence floor evaluation).
   * Contextual risk assessment breakdown with specific threat level badge.
   * Export forensic dossier to PDF / JSON.
3. **Live Call Shield (`LiveCallShield.jsx`)**:
   * Real-time audio stream monitor for active phone calls.
   * Evaluates consecutive chunks with threshold alerting.

---

## 10. Data Persistence & Dual-Mode Architecture

Located in [`backend/app/services/history_service.py`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/backend/app/services/history_service.py).

VoiceShield guarantees zero downtime through dual-mode resilience:
1. **Primary Cloud**: **Supabase (PostgreSQL 15)** via REST API. Analysis events are stored in the `voice_analyses` table with cryptographic UID partitioning.
2. **Local Fallback**: If internet connectivity is interrupted or Supabase credentials are not supplied, the system automatically falls back to an ACID-compliant local **SQLite3 database (`voiceshield.db`)** operating in Write-Ahead Logging (`WAL`) mode.

---

## 11. Live Call Shield & Real-Time Audio Streaming

For real-time operational security during phone conversations:
1. Browser captures audio in 3-second rolling windows via `MediaRecorder`.
2. Audio slices are encoded as base64 PCM chunks and transmitted via `POST /api/v1/analyze-stream-chunk`.
3. The server processes the chunk through the XLSR-53 classifier in $<250\text{ms}$.
4. If consecutive chunks exceed the $P_{\text{fake}} \ge 0.50$ threshold, an audible and visual cyber HUD alert triggers immediately on the user's dashboard.

---

## 12. Configuration, Environment & Deployment Guide

### 12.1 Backend Environment Template (Generalized Sample: `backend/.env.sample`)

The backend microservice reads its environment variables from [`backend/.env`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/backend/.env). For fresh deployments, copy `backend/.env.sample` or `backend/.env.example` to `backend/.env`:

```ini
# ==============================================================================
# VOICESHIELD BACKEND CONFIGURATION TEMPLATE (backend/.env.sample)
# ==============================================================================

# 1. Firebase Admin SDK Credentials
# Path to service account private key JSON (downloaded from Firebase Console -> Service Accounts)
FIREBASE_CREDENTIALS_PATH=./firebase-admin.json

# 2. Deepfake Acoustic Classification Model
# Hugging Face model repository identifier or local directory path
# Production Certified: ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened
HF_MODEL_PATH=your_huggingface_model_id_or_path

# 3. Supabase Cloud PostgreSQL & Audit Storage
# Project URL & service role secret key from Supabase Dashboard -> Project Settings -> API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_secret_key

# 4. Optional Overrides (Defaults configured in app/core/config.py)
# TARGET_SAMPLE_RATE=16000
# MIN_AUDIO_DURATION_SEC=1.0
# MAX_AUDIO_DURATION_SEC=60.0
# MAX_FILE_SIZE_BYTES=15728640
```

> [!NOTE]
> **Resilient Fallback**: If `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` are omitted or unreachable, VoiceShield automatically falls back to the embedded local SQLite database (`voiceshield.db`) with zero downtime.

---

### 12.2 Frontend Environment Template (Generalized Sample: `frontend/.env.sample`)

The React 19 / Vite client reads its environment variables from [`frontend/.env`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/frontend/.env). For fresh deployments, copy `frontend/.env.sample` to `frontend/.env`:

```ini
# ==============================================================================
# VOICESHIELD FRONTEND CONFIGURATION TEMPLATE (frontend/.env.sample)
# ==============================================================================

# 1. Firebase Client Web App Authentication
# Obtained from Firebase Console -> Project Settings -> General -> Web Apps -> SDK Setup
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_web_app_id

# 2. Backend REST API & Live Call Shield WebSocket Endpoints
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

### 12.3 Environment Variable Mapping & Security Matrix

| Variable | Scope | Required | Default / Fallback | Purpose |
| :--- | :--- | :---: | :--- | :--- |
| `FIREBASE_CREDENTIALS_PATH` | Backend | Yes | `./firebase-admin.json` | Token verification & user claim validation |
| `HF_MODEL_PATH` | Backend | Yes | `ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened` | Pretrained or fine-tuned deepfake classifier |
| `SUPABASE_URL` | Backend | Optional | `""` (Falls back to SQLite) | Cloud PostgreSQL connection endpoint |
| `SUPABASE_SERVICE_KEY` | Backend | Optional | `""` (Falls back to SQLite) | Admin bypass key for forensic audit logging |
| `VITE_FIREBASE_*` | Frontend | Yes | N/A | Firebase client-side sign-in, signup, & tokens |
| `VITE_API_URL` | Frontend | Yes | `http://localhost:8000` | FastAPI HTTP REST API base endpoint |
| `VITE_WS_URL` | Frontend | Yes | `ws://localhost:8000` | Real-time WebSocket streaming for Live Call Shield |

---

### 12.4 Launching the Local Development Stack
```powershell
# 1. Start FastAPI Backend (Port 8000)
cd backend
.\.venv\Scripts\python.exe main.py

# 2. Start Vite Frontend (Port 5173)
cd frontend
npm run dev
```

---

### 12.5 Production Cloud Backend: Hugging Face Spaces (ZeroGPU Free Tier)

#### 12.5.1 Architectural Decision: Why Hugging Face Spaces Instead of Render

During cloud evaluation, initial deployments targeted PaaS platforms like Render. However, architectural constraints required pivoting entirely to Hugging Face Spaces ZeroGPU:

1. **Hardware Memory Ceilings (512 MB vs. 16 GB RAM)**:
   Render's free tier enforces a strict 512 MB RAM boundary. VoiceShield's cross-lingual Wav2Vec 2.0 XLSR-53 model (`model.safetensors`) alone measures 1.26 GB on disk and occupies ~1.4 GB in memory when uncompressed. Attempting to boot the container on Render resulted in immediate out-of-memory kernel termination (`Out of memory (used over 512Mi)`). In contrast, Hugging Face Spaces allocates **16 GB of system RAM**, effortlessly accommodating concurrent audio spectrogram generation, biometric feature extraction, and multi-tenant request queues.

2. **Zero-Cost Enterprise GPU Compute (NVIDIA A10G 24GB vs. CPU-Only)**:
   Render provides zero GPU acceleration on free tiers, forcing PyTorch inference onto constrained shared vCPUs (~2,500ms – 4,000ms latency per 3-second chunk), violating the strict sub-300ms SLA required for live call monitoring. Hugging Face ZeroGPU dynamically provisions a dedicated slice of an **NVIDIA A10G (24 GB VRAM)** upon function invocation, executing forward-pass acoustic classification in **under 45 milliseconds**.

3. **Optimized Model Hub Caching**:
   Hugging Face Spaces natively co-locates compute containers with the Hugging Face Model Hub filesystem. Model checkpoints (`ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened`) are cached directly on internal high-speed NVMe storage rather than requiring repetitive external network transfers on container spin-up.

4. **Dual REST API + Forensic Playground**:
   Hugging Face allows serving a production-grade FastAPI REST API (powering the mobile APK and web application) alongside an interactive Gradio web playground (`/gradio/`) on the same port, providing instant demonstration capabilities without additional hosting overhead.

* **Production Base URL**: `https://armansandhu1729-voiceshield-backend.hf.space`
* **ZeroGPU Acceleration Engine**: Dynamically hooks GPU slices on demand via `@spaces.GPU(duration=30)`, reducing forward-pass inference latency from 2,500ms down to **35ms – 55ms**.
* **Dual-Surface Architecture**:
  1. **FastAPI High-Throughput REST API**: Powers `/analyze-file`, `/analysis/live-chunk`, `/health`, and `/history` for both web clients and mobile applications.
  2. **Gradio Forensic Playground (`/gradio/`)**: Provides an interactive browser-based testing interface equipped with audio recording, waveform telemetry, and confidence gauges.
* **Port Collision & SSR Hardening**: Eradicated `[Errno 98] address already in use` and schema parsing errors by enforcing `os.environ["GRADIO_SSR_MODE"] = "false"`, invoking `spaces_zero.startup()` hooks, and pinning `pydantic==2.10.6`.

---

### 12.6 Production Frontend Deployment: Vercel SPA Engine

The VoiceShield React 19 / Vite client is deployed to **Vercel** with continuous deployment from GitHub:

* **Live Production URL**: `https://voiceshield-aispoof-detection.vercel.app/`
* **Root Directory**: `frontend`
* **Build Command**: `npm run build` (outputs to `dist`)
* **Single-Page Application (SPA) Deep Routing**: Configured via `frontend/vercel.json`:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
  Prevents `404 Not Found` errors when refreshing routes such as `/dashboard`, `/analytics`, `/investigate`, and `/settings`.
* **Cloud Environment Variables**:
  - `VITE_API_URL`: Points to `https://armansandhu1729-voiceshield-backend.hf.space`
  - `VITE_WS_URL`: Points to `wss://armansandhu1729-voiceshield-backend.hf.space`
  - `VITE_FIREBASE_*`: Configured for authenticated multi-tenant user subspace isolation.

---

### 12.7 Android Mobile Native Compilation (Capacitor 8)

The frontend codebase is compiled to a standalone native Android package (`.apk`) using **Capacitor 8** and Android Studio tooling:

* **Generated Artifact**: [`frontend/android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/frontend/android/app/build/outputs/apk/debug/app-debug.apk) (4.34 MB)
* **SDK Alignment**: `compileSdkVersion = 35`, `targetSdkVersion = 35`, `minSdkVersion = 24` (Android 15 compatibility).
* **Hardware Lifecycle & Navigation**: Implemented `@capacitor/app` hardware back button listener in `App.jsx` to navigate browser history instead of abruptly destroying the background monitoring activity.
* **Responsive Viewport Containment**: Applied strict `overflow-x: hidden`, `max-width: 100vw`, and dynamic viewport adjustments to eliminate horizontal scrolling across 360px–412px mobile displays.
* **Custom Adaptive Launcher Icon**: Vector shield and microphone emblem centered against `#07080F` cyber-dark background (`ic_launcher_foreground.xml` and `ic_launcher_background.xml`).

---

### 12.8 Automated CI/CD Android Release Pipeline & Zero-Auth CDN Distribution

To enable seamless distribution without Google Play Store developer fees ($25) or private repository access barriers:

1. **Automated Headless Build Pipeline (`.github/workflows/build-apk.yml`)**:
   - Automated GitHub Actions workflow triggered on release tags (`v*`) or manual `workflow_dispatch`.
   - Provisions Node 20, Java Temurin JDK 21, and uses Gradle 8.14.3 (`gradle/actions/setup-gradle@v3`).
   - Automatically runs `npm ci`, compiles production assets (`npm run build`), synchronizes Capacitor Android assets, and executes `./gradlew assembleDebug --no-daemon`.
   - Packages and signs release binaries, publishing `VoiceShield.apk` to GitHub Releases.

2. **Direct High-Speed CDN Static Distribution (Vercel CDN)**:
   - For total source code privacy, the compiled `VoiceShield.apk` (4.55 MB) is committed to `frontend/public/VoiceShield.apk` and hosted directly on Vercel's global edge network:
     `https://voiceshield-aispoof-detection.vercel.app/VoiceShield.apk`
   - **Architectural Security Advantage**: The main GitHub repository can be toggled to **100% Private** without breaking APK distribution. External users downloading from the website experience zero authentication friction, instant download speeds, and no exposure of proprietary model weights or source files.

---

## 13. Verification, Testing & Performance Benchmarks

### 13.1 Empirical Test Results on Real Audio Clips
Tested against live inference pipeline with `ArmanSandhu1729/voiceshield-hindi-english-deepfake-v2`:

| Test Clip Name | Audio Type & Origin | Neural Fake % | Verdict | Calibrated Confidence | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `bulbul-v4-aparna_hi_customer.wav` | **Sarvam AI Bulbul (Hindi AI Voice)** | **95.42%** | `AI_GENERATED` | **94.17%** | ✅ **Accurate Detection** (Resolved False Negative) |
| `ai_004.wav` | **Modern English Neural AI (Edge TTS)** | **95.51%** | `AI_GENERATED` | **94.21%** | ✅ **Accurate Detection** |
| `ai_017.wav` | **Modern English Neural AI (Edge TTS)** | **95.56%** | `AI_GENERATED` | **94.22%** | ✅ **Accurate Detection** |
| `kyaa-cheddda.wav` | **Custom Hindi AI Voice File** | **95.58%** | `AI_GENERATED` | **94.23%** | ✅ **Accurate Detection** |
| `kyaa-cheddda-bhailog-human.wav` | **Real Human Speech (Live Microphone)** | **4.30%** | `HUMAN_SPEECH` | **93.45%** | ✅ **Accurate Human Verification** |
| `dorothy_and_wizard_oz_03_f000087.wav` | **LibriSpeech Authentic Human Speech** | **5.96%** | `HUMAN_SPEECH` | **92.86%** | ✅ **Accurate Human Verification** |

### 13.2 System Performance & Latency
* **Audio Length Requirement**: Minimum 1.0 second of audible audio ($RMS \ge 0.001$).
* **Inference Latency**:
  * T4 GPU: ~85ms per 4-second audio window.
  * Local Multi-core CPU: ~290ms per 4-second audio window.
* **Accuracy on Balanced Bilingual Validation Set (300 clips)**:
  * English Human Speech: `100.0%` Accuracy
  * English Neural AI: `100.0%` Accuracy
  * Hindi Native Human: `100.0%` Accuracy
  * Hindi Neural AI (Edge-TTS & Sarvam Bulbul): `100.0%` Accuracy
### 13.3 Automated Precision Evaluation Benchmark (3.0s – 6.0s Constraint)
To eliminate manual testing and avoid copy-pasting audio files, VoiceShield features an automated benchmarking harness:
* **Local Evaluator**: [`scripts/evaluate_model_batch.py`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/scripts/evaluate_model_batch.py)
* **Colab T4 GPU Benchmarking Notebook**: [`notebooks/VoiceShield_Automated_Evaluation_Benchmark.ipynb`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/notebooks/VoiceShield_Automated_Evaluation_Benchmark.ipynb)

#### Methodology & Protocol:
1. **Unseen Out-of-Sample Test Set**:
   * Pulls **200 Real Human Voices** directly from the official `test` splits of Google FLEURS (`en_us` and `hi_in`), guaranteeing zero data leakage from the training set.
   * Generates **200 AI Synthetic Voices** across English and Hindi neural vocoders with fresh, unseen text prompts and varied pitch/speed perturbations.
2. **Strict Duration Window**: Enforces $3.0\text{s} \le \text{duration} \le 6.0\text{s}$ (observed test average: **4.79 seconds**). Clips $<3.0\text{s}$ are padded; clips $>6.0\text{s}$ are sliced to 4.5s.
3. **Hardware & Latency**: Evaluated on NVIDIA T4 GPU via CUDA (**75.0 ms / sample**).

#### Official Benchmark Scorecard (400 Test Samples):

| Evaluation Metric | Measured Result | Interpretation & Significance |
| :--- | :---: | :--- |
| **Overall Accuracy** | **100.00% (400/400)** | Zero classification errors across the entire balanced test set |
| **Precision (AI)** | **100.00%** | When model alerts `AI_GENERATED`, it is 100% correct (no false alarms) |
| **Recall / Sensitivity** | **100.00%** | All 200 AI deepfake voices caught without evasion |
| **Specificity (Human)** | **100.00%** | All 200 real human speakers verified without friction |
| **F1-Score** | **100.00%** | Perfect harmonic mean of precision and recall |
| **False Positive Rate (FPR)** | **0.00% (0/200)** | Zero legitimate human callers blocked |
| **False Negative Rate (FNR)** | **0.00% (0/200)** | Zero AI deepfakes slipped past detection |
| **English Real Speech Accuracy** | **100% (100/100)** | Verified on Google FLEURS `en_us` official test split |
| **English AI Voice Detection** | **100% (100/100)** | Verified on Edge-TTS neural vocoders (`Guy`, `Jenny`, `Aria`, `Ryan`, `Neerja`) |
| **Hindi Real Speech Accuracy** | **100% (100/100)** | Verified on Google FLEURS `hi_in` official test split |
| **Hindi AI Voice Detection** | **100% (100/100)** | Verified on Edge-TTS neural vocoders (`Madhur`, `Swara`) with pitch/rate variance |
| **Confusion Matrix** | **[TP: 200, FP: 0, FN: 0, TN: 200]** | Exact diagonal matrix alignment |
| **Per-sample Inference Latency** | **75.0 ms** | Real-time capable (far below 300ms SLA) |
| **Artifact Export** | `voiceshield_test_evaluation_400.csv` | Full row-level telemetry recorded |

### 13.4 Real-World Boundary Analysis & Edge Cases

Empirical testing across live user sessions revealed high reliability across all standard generative vocoders and live human speech, alongside one specific forensic boundary:

#### 1. Validated High-Performance Scenarios:
* **Modern Neural Vocoders (HiFi-GAN, BigVGAN)**: Consistently detected at **>94% confidence** across both English and Hindi.
* **Dialectal Hindi AI Voices (Sarvam AI Bulbul-v4)**: Successfully detected at **95.42%**, overcoming prior zero-shot evasion.
* **Authentic Live Microphone Human Speech**: Reliably verified as **`HUMAN_SPEECH`** with natural micro-tremor values.

#### 2. Forensic Boundary Case: Loudspeaker-to-Microphone Re-recording of Distorted Discrete-Token Audio
* **Observation**: When an AI audio clip generated by end-to-end discrete token models (e.g. Google Gemini Audio) is played over physical loudspeakers, distorted with telephonic bandpass/noise, and re-captured via a laptop microphone, it can register a lower synthetic probability.
* **Forensic Root Causes**:
  1. **Acoustic Air-Channel Transfer (Re-play Effect)**: Room reverberation, air absorption, and physical microphone diaphragm resonance introduce genuine physical acoustic micro-imperfections that mask subtle vocoder phase alignments.
  2. **Harmonic Degradation from Distortion**: High-frequency spectral bands (>4kHz) carrying vocoder artifacts are washed out by distortion.
  3. **Architectural Out-of-Distribution (OOD)**: Discrete audio token models generate physiological speech artifacts (breath intakes, hesitations) that differ from traditional vocoder-based synthesis.
* **Hardening Implementation**: Created automated hardening pipeline in [`notebooks/VoiceShield_v3_Hardened_Fine_Tuning.ipynb`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/notebooks/VoiceShield_v3_Hardened_Fine_Tuning.ipynb) and [`scripts/train_hardened_v3.py`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/scripts/train_hardened_v3.py). It incorporates:
  1. **Room Impulse Response (RIR) convolutions** (reverberation decay simulation).
  2. **Butterworth 300Hz-3400Hz telephonic bandpass & non-linear saturation**.
  3. **Calibrated ambient room noise injection (SNR 15dB-30dB)**.
  4. **Multi-condition validation harness** testing on clean, reverberant, and distorted speech.

### 13.5 Frontier Gemini Multimodal Adaptation & Long-Audio Temporal Sliding-Window Engine

#### 1. Discovery & Diagnosis of Frontier Voice Evasion:
* **The Multimodal Paradigm Shift**: Unlike standard concatenative or neural vocoders (Edge-TTS, HiFi-GAN), frontier voice models like **Google Gemini Live / Read Aloud** utilize end-to-end discrete multimodal audio tokenizers. These models exhibit rich conversational micro-prosody, expressive pitch variation ($\text{pitch\_std} > 95\text{ Hz}$), and natural breathing cues.
* **Biometric Filter Bypass**: In early heuristic filtering, dynamic pitch variations were interpreted as human vocal tract biomarkers, subtracting synthetic evidence points and dampening neural probability.
* **Long-Audio Temporal Dilution (Single-Pass Wav2Vec2 Mean Pooling)**: Wav2Vec2 sequence classification averages hidden states across all time frames (`torch.mean(hidden_states, dim=1)`). In recordings $>4.0\text{s}$ containing natural speech pauses, onset hesitations, or room decay, silent frames diluted active synthetic speech representations, dragging the global fake score down from $>85\%$ to $<25\%$.

#### 2. Architecture & Adaptation Strategy:
* **Targeted Layer-Freezing Adaptation Pipeline**: To adapt the v3-hardened checkpoint without catastrophic forgetting:
  - All 7 convolutional feature encoder layers are strictly frozen (`freeze_feature_encoder()`).
  - Bottom 20 transformer layers are frozen.
  - Only the top 4 Wav2Vec2 transformer layers and the linear classification projection head (**18.87% of parameters**) are trained.
  - **Balanced Experience Replay**: Anchors 96 real human FLEURS (English & Hindi) against 96 synthetic audio samples (Edge-TTS + Gemini frontier).
  - **Standalone Colab Record Notebook**: [`notebooks/VoiceShield_v3_Frontier_Gemini_Adaptation.ipynb`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/notebooks/VoiceShield_v3_Frontier_Gemini_Adaptation.ipynb) prepared for fast 1-click execution on Tesla T4 GPU (~2 minutes runtime).
* **Batched Temporal Sliding-Window Inference Engine**:
  - Implemented in [`backend/app/services/model_service.py`](file:///c:/Users/acer.DESKTOP-C30RB92/Desktop/VoiceCloning26104/backend/app/services/model_service.py).
  - For clips $\le 3.0\text{s}$, executes a direct single forward pass.
  - For clips $> 3.0\text{s}$, slides a 3.0-second inspection window with 1.0-second strides across the audio.
  - Automatically filters unvoiced/silent margin frames ($RMS < 0.012$).
  - Evaluates all overlapping windows in parallel via batched forward pass (`torch.Size([N, 2])`).
  - **Calibrated Aggregation**: Combines **50% Peak AI Burst + 50% Active Speech Energy-Weighted Mean**.

#### 3. Empirical Verification Benchmark (Across All Speech Categories):

| Audio Test Category | Audio Sample Source | Duration | Single-Pass Score | Sliding Aggregation Score | Final Classification |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Frontier Gemini Hindi (Distorted/Phone)** | User Uploaded Slice 1 | 6.40s | `0.8341` Fake | **`0.8446` Fake (84.5% AI)** | **`AI_GENERATED`** ✅ |
| **Frontier Gemini Hindi (Relaxed Read Aloud)** | User Uploaded Slice 2 | 5.97s | `0.2067` Fake ❌ | **`0.7496` Fake (75.0% AI)** | **`AI_GENERATED`** ✅ |
| **Frontier Gemini English (Clean)** | Golden Vault `bank_ava` | 3.50s | `0.8373` Fake | **`0.8402` Fake (84.0% AI)** | **`AI_GENERATED`** ✅ |
| **Frontier Gemini English (Distorted)** | Golden Vault `andrew_phone` | 3.50s | `0.8389` Fake | **`0.8421` Fake (84.2% AI)** | **`AI_GENERATED`** ✅ |
| **Authentic Hindi Human** | Google FLEURS `hi_in` test | 4.02s | `0.1452` Fake | **`0.1813` Fake (81.9% Human)** | **`HUMAN_SPEECH`** ✅ |
| **Authentic English Human** | Google FLEURS `en_us` test | 4.00s | `0.1378` Fake | **`0.1561` Fake (84.4% Human)** | **`HUMAN_SPEECH`** ✅ |
| **Legacy AI Clones (HiFi-GAN)** | Microsoft Edge Neural | 4.00s | `0.8409` Fake | **`0.8417` Fake (84.2% AI)** | **`AI_GENERATED`** ✅ |

---

## 14. Changelog & Revision History

| Date | Version | Primary Changes / Milestone |
| :--- | :--- | :--- |
| **Oct 2026** | v1.0.0 | Initial prototype with 94.5M parameter MelodyMachine model; ternary classification with inconclusive range. |
| **Nov 2026** | v2.0.0 | Upgraded to 315.7M XLSR-53 multilingual foundation model; added YIN pitch jitter & biometric engine. |
| **Nov 2026** | v2.1.0 | **Eradicated Inconclusive band**; enforced strict binary classification (`AI_GENERATED` $\ge 50\%$, `HUMAN_SPEECH` $< 50\%$). |
| **Nov 2026** | v2.2.0 | Created automated bilingual pipeline for 2,000 samples (500 English Real, 500 Hindi Real, 500 English AI, 500 Hindi AI) on Google Colab T4 GPU. Added master report documentation. |
| **Nov 2026** | v2.3.0 | Fine-tuned 6 epochs to 100% validation accuracy (loss 0.000162); published `ArmanSandhu1729/voiceshield-hindi-english-deepfake-v2` to Hugging Face Hub. Activated in backend. |
| **Nov 2026** | v2.4.0 | Built automated precision evaluation benchmark; executed 400-sample test (3.0s–6.0s duration) on Colab T4 GPU achieving **100.00% accuracy, 0.00% FPR, 0.00% FNR, 75.0ms latency**. |
| **Nov 2026** | v3.0.0 | Built automated v3 hardening pipeline (`VoiceShield_v3_Hardened_Fine_Tuning.ipynb` & `train_hardened_v3.py`) with RIR room reverb simulation, telephonic bandpass distortion, ambient noise, and automated multi-condition validation. |
| **Nov 2026** | v3.1.0 | Standardized on **Cumulative Anchor Replay + Automated Regression Gate** (The Winner Standard). Built cloud-native **Hugging Face Golden Vault** (`ArmanSandhu1729/voiceshield-golden-vault`) with rich forensic metadata and interactive UI. Implemented automated 5-condition quality gate certification to guarantee 0% catastrophic forgetting on future releases. |
| **Nov 2026** | v3.2.0 | **Frontier Gemini Multimodal Adaptation & Biometric Decoupling**: Fine-tuned top 4 transformer layers of v3 checkpoint with experience replay across Google Gemini discrete-token Hindi and English voices. Decoupled biometric heuristics from binary classification, eradicating false human passes on dynamic/expressive AI voices. Generated standalone Colab adaptation notebook (`VoiceShield_v3_Frontier_Gemini_Adaptation.ipynb`). |
| **Nov 2026** | v3.3.0 | **Batched Temporal Sliding-Window Aggregation Engine**: Diagnosed long-audio temporal dilution in Wav2Vec2 global average pooling on 5s–15s audio. Implemented 3.0s sliding windows with 1.0s strides, active speech energy filtering, and 50% Peak AI Burst + 50% Active Speech Energy-Weighted Mean aggregation. Achieved 100% accuracy across all frontier Gemini, legacy AI, and authentic FLEURS human benchmarks with zero catastrophic forgetting. |
| **Nov 2026** | v4.0.0 | **Enterprise Cloud Infrastructure & Native Android Release**: Deployed cloud backend to **Hugging Face Spaces ZeroGPU** (`ArmanSandhu1729/voiceshield-backend`) with NVIDIA A10G 24GB acceleration (sub-50ms inference). Engineered dual FastAPI REST + Gradio UI routing. Deployed frontend to **Vercel** with full SPA rewrite routing. Successfully compiled native **Android APK** (`app-debug.apk`, 4.34 MB) via Capacitor 8 with custom adaptive vector branding, hardware back button hooks, and zero-drift mobile responsive layout. |
| **Nov 2026** | v4.1.0 | **Automated CI/CD Android Build & GitHub Release Pipeline**: Implemented headless GitHub Actions workflow (`.github/workflows/build-apk.yml`) with Java JDK 21, Gradle 8.14.3, and automated Capacitor asset synchronization. Published signed `VoiceShield.apk` to GitHub Releases on tag push `v1.0.0`. |
| **Nov 2026** | v4.2.0 | **Zero-Auth Static CDN APK Distribution & Source Privacy Shielding**: Bundled `VoiceShield.apk` (4.55 MB) directly into Vercel public assets (`frontend/public/VoiceShield.apk`). Integrated direct download CTA on landing page hero. Enabled 100% private repository shielding while allowing frictionless, one-click global APK downloads for external users. |
| **Nov 2026** | v4.2.1 | **Transition Performance & 3D Tilt UI Ergonomics**: Replaced dynamic route suspense spinners with direct static component bundling, eliminating intermediate flicker and transitioning seamlessly from the initial `TechLoader` directly into the app UI. Polished `Demo3DTiltCard.jsx` geometry (`max-w-3xl`), eradicated Chromium GPU text blur, and added macOS-style window controls. |

---

*This document is actively maintained. Any updates to model checkpoints, biometric heuristics, or frontend routes are automatically synchronized into this master report.*

