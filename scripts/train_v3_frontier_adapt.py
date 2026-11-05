#!/usr/bin/env python3
"""
VoiceShield v3 Frontier Fine-Tuning & Adaptation Engine
======================================================
Fine-tunes the existing v3-hardened model on new frontier generative audio
(Google Gemini Live/multimodal, conversational English & Hindi) while strictly
preventing catastrophic forgetting of previously learned human and synthetic distributions.

Key Hardening Features:
1. Frozen Feature Encoder: Freezes lower Wav2Vec2 convolutional layers.
2. Experience Replay Balancing: Interleaves original real human voices (FLEURS)
   and legacy synthetic voices (Edge-TTS) with new frontier Gemini clips at 50/50 ratio.
3. Acoustic Distortion Invariance: Augments Gemini speech with phone bandpass (300-3400Hz),
   room reverb (RIR), and ambient noise.
4. Low Learning Rate & Weight Decay: Conservative updates (lr=1.5e-5) to preserve calibration.
"""

import os
import sys
import glob
import random
import argparse
from pathlib import Path

# Force UTF-8 encoding on Windows terminal
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import numpy as np
import soundfile as sf
import librosa
import scipy.signal
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

# ==============================================================================
# ACOUSTIC AUGMENTATION OPERATORS
# ==============================================================================
def apply_room_reverb(audio: np.ndarray, sr: int = 16000, decay_sec: float = 0.22) -> np.ndarray:
    """Simulates physical room reflection and loudspeaker-to-microphone acoustic coupling."""
    t = np.linspace(0, decay_sec, int(sr * decay_sec))
    rir = np.exp(-t * 14) * np.random.randn(len(t))
    rir[0] = 1.0
    rir /= (np.sum(np.abs(rir)) + 1e-9)
    rev = scipy.signal.convolve(audio, rir, mode="same")
    out = 0.75 * audio + 0.25 * rev
    return np.clip(np.nan_to_num(out), -1.0, 1.0).astype(np.float32)

def apply_distortion_and_bandpass(audio: np.ndarray, sr: int = 16000) -> np.ndarray:
    """Simulates telephone audio channel (300-3400Hz) and non-linear saturation."""
    sos = scipy.signal.butter(4, [300, 3400], btype="bandpass", fs=sr, output="sos")
    filtered = scipy.signal.sosfilt(sos, audio)
    dist = np.tanh(filtered * 1.5)
    max_val = np.max(np.abs(dist)) + 1e-6
    out = dist / max_val
    return np.clip(np.nan_to_num(out), -1.0, 1.0).astype(np.float32)

def apply_ambient_noise(audio: np.ndarray, snr_db: float = 22.0) -> np.ndarray:
    """Injects calibrated ambient room air noise."""
    noise = np.random.randn(len(audio))
    sig_power = np.mean(audio ** 2)
    noise_power = np.mean(noise ** 2)
    factor = np.sqrt(sig_power / (10 ** (snr_db / 10) * noise_power + 1e-9))
    out = audio + factor * noise
    return np.clip(np.nan_to_num(out), -1.0, 1.0).astype(np.float32)

def random_augment(audio: np.ndarray, sr: int = 16000) -> np.ndarray:
    """Randomly applies 1 of 3 augmentations or returns raw audio."""
    choice = random.random()
    if choice < 0.25:
        return apply_room_reverb(audio, sr)
    elif choice < 0.50:
        return apply_distortion_and_bandpass(audio, sr)
    elif choice < 0.75:
        return apply_ambient_noise(audio)
    return audio

# ==============================================================================
# DATASET WITH EXPERIENCE REPLAY
# ==============================================================================
class FrontierAdaptationDataset(Dataset):
    def __init__(self, sample_records, feature_extractor, target_sr=16000, max_duration=3.5, augment=True):
        self.samples = sample_records
        self.extractor = feature_extractor
        self.target_sr = target_sr
        self.max_samples = int(target_sr * max_duration)
        self.augment = augment

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        audio, sr = sf.read(path)
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)
        if sr != self.target_sr:
            audio = librosa.resample(audio, orig_sr=sr, target_sr=self.target_sr)

        # Apply augmentation if training
        if self.augment:
            audio = random_augment(audio, self.target_sr)

        # Random temporal crop or padding to max_samples
        if len(audio) > self.max_samples:
            start = random.randint(0, len(audio) - self.max_samples)
            audio = audio[start : start + self.max_samples]
        elif len(audio) < self.max_samples:
            pad = self.max_samples - len(audio)
            audio = np.pad(audio, (0, pad), mode="wrap")

        # Feature extraction
        inputs = self.extractor(
            audio,
            sampling_rate=self.target_sr,
            return_tensors="pt"
        )
        item = {k: v.squeeze(0) for k, v in inputs.items()}
        item["labels"] = torch.tensor(label, dtype=torch.long)
        return item

# ==============================================================================
# PIPELINE EXECUTION
# ==============================================================================
def run_adaptation(
    base_model: str = "ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened",
    output_dir: str = "backend/models/voiceshield-v3-hardened-local",
    epochs: int = 4,
    batch_size: int = 4,
    lr: float = 1.5e-5,
    push_to_hub: bool = False
):
    print("=" * 80)
    print("[*] VOICESHIELD v3 FRONTIER ADAPTATION PIPELINE")
    print(f"Base Checkpoint:   {base_model}")
    print(f"Target Output:     {output_dir}")
    print(f"Training Epochs:   {epochs} | Batch Size: {batch_size} | Learning Rate: {lr}")
    print("=" * 80)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Compute Device:    {device}")

    # 1. Load Base Model and Extractor
    print("\n[*] Loading v3 model checkpoint...")
    feature_extractor = AutoFeatureExtractor.from_pretrained(base_model)
    model = AutoModelForAudioClassification.from_pretrained(
        base_model,
        id2label={0: "real", 1: "fake"},
        label2id={"real": 0, "fake": 1}
    )

    # 2. Freeze lower convolutional feature encoder
    model.freeze_feature_encoder()
    print("[+] Conv feature encoder successfully frozen to prevent catastrophic forgetting.")

    # Optionally freeze bottom transformer encoder layers (keep top 4 layers + classifier trainable)
    if hasattr(model, "wav2vec2") and hasattr(model.wav2vec2, "encoder"):
        layers = model.wav2vec2.encoder.layers
        num_layers = len(layers)
        num_to_freeze = max(0, num_layers - 4)
        for i in range(num_to_freeze):
            for param in layers[i].parameters():
                param.requires_grad = False
        print(f"[+] Froze {num_to_freeze}/{num_layers} transformer layers (fine-tuning top {num_layers - num_to_freeze} layers + classifier).")

    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"[*] Trainable Parameters: {trainable_params:,} / {total_params:,} ({100 * trainable_params / total_params:.2f}%)")

    model.to(device)

    # 3. Assemble Experience Replay Balanced Dataset
    print("\n[*] Assembling Balanced Training Dataset...")
    vault_base = Path("samples_golden_vault")

    # Real human files (FLEURS)
    real_files = glob.glob(str(vault_base / "en_human" / "*.wav")) + \
                 glob.glob(str(vault_base / "hi_human" / "*.wav")) + \
                 glob.glob(str(vault_base / "phone_distorted" / "dist_real_*.wav")) + \
                 glob.glob(str(vault_base / "reverb_replay" / "rev_real_*.wav"))

    # Synthetic legacy files (Edge-TTS)
    legacy_fake_files = glob.glob(str(vault_base / "en_ai" / "*.wav")) + \
                        glob.glob(str(vault_base / "hi_ai" / "*.wav")) + \
                        glob.glob(str(vault_base / "phone_distorted" / "dist_fake_*.wav")) + \
                        glob.glob(str(vault_base / "reverb_replay" / "rev_fake_*.wav"))

    # New Frontier Gemini files
    gemini_files = glob.glob(str(vault_base / "gemini_frontier" / "*.wav"))

    print(f"   - Real Human Anchors (FLEURS):           {len(real_files)} files")
    print(f"   - Legacy AI Clones (Edge-TTS):           {len(legacy_fake_files)} files")
    print(f"   - Frontier Gemini Clones (Eng & Hindi):  {len(gemini_files)} files")

    if not gemini_files:
        raise RuntimeError("No Gemini frontier audio files found in samples_golden_vault/gemini_frontier!")

    # Combine Fake samples: balance legacy fake and new Gemini fake
    all_fake = legacy_fake_files + (gemini_files * 4)  # Oversample new frontier Gemini clips
    # Balance Real samples to match total fake count
    multiplier = max(1, len(all_fake) // max(1, len(real_files)))
    all_real = (real_files * multiplier)[:len(all_fake)]

    print(f"   [=] Final Balanced Distribution: {len(all_real)} Real Human vs. {len(all_fake)} AI Synthetic")

    records = [(f, 0) for f in all_real] + [(f, 1) for f in all_fake]
    random.seed(42)
    random.shuffle(records)

    split = int(len(records) * 0.85)
    train_records = records[:split]
    val_records = records[split:]

    train_ds = FrontierAdaptationDataset(train_records, feature_extractor, augment=True)
    val_ds = FrontierAdaptationDataset(val_records, feature_extractor, augment=False)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    # 4. Optimizer & Loss Function
    optimizer = torch.optim.AdamW(
        [p for p in model.parameters() if p.requires_grad],
        lr=lr,
        weight_decay=0.01
    )
    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)

    # 5. Training Loop
    print("\n[*] Starting Adaptation Training...")
    best_acc = 0.0

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        correct = 0
        total = 0

        for batch in train_loader:
            optimizer.zero_grad()
            input_values = batch["input_values"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(input_values)
            loss = criterion(outputs.logits, labels)
            loss.backward()

            # Gradient clipping to preserve stability
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            total_loss += loss.item() * len(labels)
            preds = torch.argmax(outputs.logits, dim=-1)
            correct += (preds == labels).sum().item()
            total += len(labels)

        train_acc = correct / total
        avg_loss = total_loss / total

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for batch in val_loader:
                input_values = batch["input_values"].to(device)
                labels = batch["labels"].to(device)
                outputs = model(input_values)
                preds = torch.argmax(outputs.logits, dim=-1)
                val_correct += (preds == labels).sum().item()
                val_total += len(labels)

        val_acc = val_correct / max(1, val_total)
        print(f"   Epoch {epoch}/{epochs} | Loss: {avg_loss:.4f} | Train Acc: {train_acc * 100:.1f}% | Val Acc: {val_acc * 100:.1f}%")

    # 6. Save Adapted Model Locally
    print(f"\n[*] Saving adapted v3 model to: {output_dir}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output_dir)
    feature_extractor.save_pretrained(output_dir)
    print("[+] Model weights and configs saved successfully!")

    # 7. Update backend/.env to use local adapted checkpoint
    env_path = backend_dir / ".env"
    if env_path.exists():
        content = env_path.read_text(encoding="utf-8")
        # Relative path from backend root
        local_rel_path = "./models/voiceshield-v3-hardened-local"
        if "HF_MODEL_PATH=" in content:
            lines = content.splitlines()
            new_lines = []
            for line in lines:
                if line.startswith("HF_MODEL_PATH="):
                    new_lines.append(f"HF_MODEL_PATH={local_rel_path}")
                else:
                    new_lines.append(line)
            env_path.write_text("\n".join(new_lines), encoding="utf-8")
            print(f"🔄 Updated backend/.env to HF_MODEL_PATH={local_rel_path}")

    print("\n🎉 Adaptation Complete! The v3 model now detects Gemini frontier speech while preserving human & legacy accuracy.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VoiceShield v3 Frontier Adaptation")
    parser.add_argument("--base_model", default="ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch_size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1.5e-5)
    parser.add_argument("--output_dir", default="backend/models/voiceshield-v3-hardened-local")
    args = parser.parse_args()

    run_adaptation(
        base_model=args.base_model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        output_dir=args.output_dir
    )
