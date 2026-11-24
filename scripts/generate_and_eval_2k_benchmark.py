#!/usr/bin/env python3
"""
VoiceShield: Automated 2,000-Sample Mixed Bilingual Benchmark Pipeline
======================================================================
Automates the creation and evaluation of 2,000 brand-new, unseen audio samples:
- 1,000 Real Human Voices (500 English + 500 Hindi from FLEURS test split)
- 1,000 AI Synthetic Voices (500 English + 500 Hindi across neural vocoders)
- Realistic Acoustic Channel Perturbations: Phone Bandpass (300-3400Hz), Room Reverb (RIR), Ambient Noise
- Strict Duration Constraint: [3.0s, 6.0s]
- Quality Gate: If Accuracy >= 88% and Precision >= 85%, exports to 'test-Bi-new-2k-01'
"""

import os
import sys
import glob
import time
import json
import csv
import math
import asyncio
import argparse
from pathlib import Path

import numpy as np
import soundfile as sf
import librosa
from scipy import signal
import torch

# Ensure backend root is accessible if running locally
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# =====================================================
# ACOUSTIC AUGMENTATION OPERATORS (REALISTIC HARDENING)
# =====================================================

def apply_phone_bandpass(audio: np.ndarray, sr: int = 16000, lowcut: float = 300.0, highcut: float = 3400.0) -> np.ndarray:
    """Simulates 300Hz-3400Hz telephonic narrowband filter with subtle dynamic range compression."""
    nyq = 0.5 * sr
    low = max(lowcut / nyq, 0.01)
    high = min(highcut / nyq, 0.99)
    b, a = signal.butter(4, [low, high], btype='band')
    filtered = signal.lfilter(b, a, audio)
    # Mild non-linear compression (simulating GSM/VoIP codec)
    compressed = np.tanh(filtered * 1.4)
    max_val = np.max(np.abs(compressed))
    if max_val > 0:
        compressed = compressed / max_val * 0.9
    return compressed.astype(np.float32)

def apply_room_reverb(audio: np.ndarray, sr: int = 16000, rt60: float = 0.35) -> np.ndarray:
    """Convolves audio with synthetic room impulse response simulating loudspeaker-to-mic replay."""
    length = int(sr * rt60)
    decay = np.exp(-3.0 * np.linspace(0, 1, length))
    noise = np.random.normal(0, 1, length)
    rir = decay * noise
    rir[0] = 1.0  # Direct path
    rir = rir / np.sqrt(np.sum(rir ** 2))
    reverbed = signal.convolve(audio, rir, mode='same')
    max_val = np.max(np.abs(reverbed))
    if max_val > 0:
        reverbed = reverbed / max_val * 0.9
    return reverbed.astype(np.float32)

def apply_ambient_noise(audio: np.ndarray, snr_db: float = 24.0) -> np.ndarray:
    """Injects subtle calibrated ambient background air noise."""
    signal_power = np.mean(audio ** 2)
    if signal_power <= 0:
        return audio
    noise_power = signal_power / (10 ** (snr_db / 10.0))
    noise = np.random.normal(0, np.sqrt(noise_power), len(audio))
    noisy = audio + noise
    max_val = np.max(np.abs(noisy))
    if max_val > 0:
        noisy = noisy / max_val * 0.9
    return noisy.astype(np.float32)

def bound_duration(audio: np.ndarray, sr: int = 16000, min_sec: float = 3.0, max_sec: float = 6.0) -> np.ndarray:
    """Enforces audio duration to be strictly within [min_sec, max_sec]."""
    dur = len(audio) / sr
    if dur > max_sec:
        audio = audio[:int(sr * max_sec)]
    elif dur < min_sec:
        pad_len = int(sr * (min_sec + 0.2 - dur))
        audio = np.pad(audio, (0, pad_len), mode='constant')
    return audio.astype(np.float32)

# =====================================================
# INGESTION & SYNTHESIS LOGIC
# =====================================================

EN_PROMPTS = [
    "Security notification: an unrecognized login was detected on your registered checking account. Press one to authorize.",
    "This is an automated verification call from your credit union regarding recent recurring charges. Please confirm your details.",
    "Your package delivery has been delayed due to an incorrect postal code. Update your dispatch address through our automated portal.",
    "Please do not disclose your six-digit verification PIN or one-time password to anyone claiming to represent customer care.",
    "We noticed an unusual international transfer attempt originating from an overseas IP address. Immediate confirmation is required.",
    "Your monthly health insurance premium invoice has been generated and dispatched to your primary electronic mail inbox.",
    "Thank you for contacting our customer assistance desk. All representatives are actively engaged with other valued customers.",
    "Artificial intelligence audio synthesis allows deep learning networks to capture subtle prosodic cues and vocal resonances.",
    "Please confirm your identity by stating your registered surname after the sound of the tone.",
    "The airline schedule change notice indicates your connecting flight departure has been shifted by forty-five minutes.",
    "Attention: your telecommunications subscription plan will expire within forty-eight hours unless an active renewal is scheduled.",
    "Our biometric fraud prevention engine continuously monitors speech patterns to ensure authentic caller verification."
]

HI_PROMPTS = [
    "नमस्ते, यह आपके बैंक के सुरक्षा विभाग से एक स्वचालित कॉल है। कृपया हाल के लेनदेन की पुष्टि करें।",
    "आपके खाते में एक नए अज्ञात उपकरण से लॉग इन करने का प्रयास किया गया था। यदि यह आप नहीं हैं तो तुरंत शून्य दबाएं।",
    "कृपया ध्यान दें कि बैंक का कोई भी प्रतिनिधि आपसे कभी भी आपका गोपनीय एटीएम पिन या ओटीपी पासवर्ड नहीं मांगता है।",
    "ग्राहक सहायता केंद्र में आपका स्वागत है। हमारे सभी सेवा अधिकारी वर्तमान में अन्य कॉलों में व्यस्त हैं, कृपया प्रतीक्षा करें।",
    "आपके पंजीकृत मोबाइल नंबर पर छह अंकों का सुरक्षा सत्यापन कोड भेजा गया है। इसे किसी के साथ साझा न करें।",
    "साइबर सुरक्षा नियमों का पालन करना आपके वित्तीय और व्यक्तिगत डेटा को इंटरनेट पर सुरक्षित रखने के लिए आवश्यक है।",
    "आपकी नई चेकबुक और डेबिट कार्ड आपके पते पर भेज दिया गया है, जो अगले दो कार्य दिवसों में प्राप्त हो जाएगा।",
    "अज्ञात कॉलर द्वारा आपातकालीन धन हस्तांतरण का अनुरोध मिलने पर हमेशा अपने परिजनों से प्रत्यक्ष संपर्क करें।"
]

EN_VOICES = ["en-US-GuyNeural", "en-US-JennyNeural", "en-US-AriaNeural", "en-GB-RyanNeural", "en-IN-NeerjaNeural", "en-US-ChristopherNeural"]
HI_VOICES = ["hi-IN-MadhurNeural", "hi-IN-SwaraNeural"]

async def synthesize_all_ai(output_fake_dir: str, target_count: int = 1000):
    """Synthesizes AI voices with diverse rate, pitch, and realistic acoustic perturbations."""
    import edge_tts
    os.makedirs(output_fake_dir, exist_ok=True)
    sem = asyncio.Semaphore(12)
    
    half = target_count // 2
    tasks = []
    
    async def _worker(prompt, voice, out_base, category, rate="+0%", pitch="+0Hz", condition="clean"):
        wav_path = f"{out_base}.wav"
        if os.path.exists(wav_path):
            return
        async with sem:
            mp3_tmp = f"{out_base}.mp3"
            for attempt in range(3):
                try:
                    comm = edge_tts.Communicate(prompt, voice, rate=rate, pitch=pitch)
                    await comm.save(mp3_tmp)
                    y, sr = librosa.load(mp3_tmp, sr=16000)
                    y = bound_duration(y, sr=16000, min_sec=3.0, max_sec=5.5)
                    
                    # Apply condition
                    if condition == "phone":
                        y = apply_phone_bandpass(y, 16000)
                    elif condition == "reverb":
                        y = apply_room_reverb(y, 16000)
                    elif condition == "ambient":
                        y = apply_ambient_noise(y, snr_db=22.0)
                        
                    sf.write(wav_path, y, 16000)
                    if os.path.exists(mp3_tmp):
                        os.remove(mp3_tmp)
                    break
                except Exception:
                    await asyncio.sleep(1.0)
    
    # 500 English AI
    for i in range(half):
        v = EN_VOICES[i % len(EN_VOICES)]
        p = EN_PROMPTS[i % len(EN_PROMPTS)]
        r = f"{((i % 7) - 3) * 4:+d}%"
        pi = f"{((i % 5) - 2) * 6:+d}Hz"
        
        # Distribution of conditions: 60% clean, 15% phone, 15% reverb, 10% ambient
        cond = "clean"
        if i % 6 == 0: cond = "phone"
        elif i % 6 == 1: cond = "reverb"
        elif i % 6 == 2: cond = "ambient"
        
        out_name = os.path.join(output_fake_dir, f"en_ai_{cond}_{i:04d}")
        tasks.append(_worker(p, v, out_name, "en_ai", rate=r, pitch=pi, condition=cond))
        
    # 500 Hindi AI
    for i in range(half):
        v = HI_VOICES[i % len(HI_VOICES)]
        p = HI_PROMPTS[i % len(HI_PROMPTS)]
        r = f"{((i % 5) - 2) * 4:+d}%"
        pi = f"{((i % 5) - 2) * 8:+d}Hz"
        
        cond = "clean"
        if i % 6 == 0: cond = "phone"
        elif i % 6 == 1: cond = "reverb"
        elif i % 6 == 2: cond = "ambient"
        
        out_name = os.path.join(output_fake_dir, f"hi_ai_{cond}_{i:04d}")
        tasks.append(_worker(p, v, out_name, "hi_ai", rate=r, pitch=pi, condition=cond))
        
    print(f"🚀 Generating {len(tasks)} AI Synthetic audio samples in parallel...")
    await asyncio.gather(*tasks)
    print(f"✅ Finished generating AI audio dataset in: {output_fake_dir}")

def ingest_real_fleurs(output_real_dir: str, target_count: int = 1000):
    """Streams 1,000 Real human audio clips from Google FLEURS test splits."""
    from datasets import load_dataset
    os.makedirs(output_real_dir, exist_ok=True)
    half = target_count // 2
    
    print(f"📥 Streaming {half} Real English clips from Google FLEURS (test split)...")
    en_count = len(glob.glob(os.path.join(output_real_dir, "en_real_*.wav")))
    if en_count < half:
        ds_en = load_dataset("google/fleurs", "en_us", split="test", streaming=True)
        # Skip the first 100 used in prior tests for strict zero-leakage
        skipped = 0
        for item in ds_en:
            if skipped < 100:
                skipped += 1
                continue
            if en_count >= half:
                break
            arr = item["audio"]["array"]
            sr = item["audio"]["sampling_rate"]
            if sr != 16000:
                arr = librosa.resample(arr, orig_sr=sr, target_sr=16000)
            arr = bound_duration(arr, sr=16000, min_sec=3.0, max_sec=5.5)
            
            # Channel conditions for realistic variance (20% phone, 10% reverb)
            cond = "clean"
            if en_count % 8 == 0:
                arr = apply_phone_bandpass(arr, 16000)
                cond = "phone"
            elif en_count % 8 == 1:
                arr = apply_room_reverb(arr, 16000)
                cond = "reverb"
                
            out_file = os.path.join(output_real_dir, f"en_real_{cond}_{en_count:04d}.wav")
            sf.write(out_file, arr, 16000)
            en_count += 1
            if en_count % 100 == 0:
                print(f"   [EN Real] {en_count}/{half} downloaded...")
                
    print(f"📥 Streaming {half} Real Hindi clips from Google FLEURS (test split)...")
    hi_count = len(glob.glob(os.path.join(output_real_dir, "hi_real_*.wav")))
    if hi_count < half:
        ds_hi = load_dataset("google/fleurs", "hi_in", split="test", streaming=True)
        skipped = 0
        for item in ds_hi:
            if skipped < 100:
                skipped += 1
                continue
            if hi_count >= half:
                break
            arr = item["audio"]["array"]
            sr = item["audio"]["sampling_rate"]
            if sr != 16000:
                arr = librosa.resample(arr, orig_sr=sr, target_sr=16000)
            arr = bound_duration(arr, sr=16000, min_sec=3.0, max_sec=5.5)
            
            cond = "clean"
            if hi_count % 8 == 0:
                arr = apply_phone_bandpass(arr, 16000)
                cond = "phone"
            elif hi_count % 8 == 1:
                arr = apply_room_reverb(arr, 16000)
                cond = "reverb"
                
            out_file = os.path.join(output_real_dir, f"hi_real_{cond}_{hi_count:04d}.wav")
            sf.write(out_file, arr, 16000)
            hi_count += 1
            if hi_count % 100 == 0:
                print(f"   [HI Real] {hi_count}/{half} downloaded...")
                
    print(f"✅ Ingested {en_count} English + {hi_count} Hindi real clips in: {output_real_dir}")

# =====================================================
# MODEL EVALUATION HARNESS
# =====================================================

def evaluate_model(test_dir: str, model_id: str, output_csv: str = "benchmark_2k_results.csv"):
    """Runs batch inference and computes comprehensive performance metrics."""
    from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
    
    real_files = sorted(glob.glob(os.path.join(test_dir, "real", "*.wav")))
    fake_files = sorted(glob.glob(os.path.join(test_dir, "fake", "*.wav")))
    
    total_samples = len(real_files) + len(fake_files)
    if total_samples == 0:
        print("❌ Error: No audio clips found to evaluate.")
        return None
        
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("\n" + "=" * 80)
    print(f"🧪 VOICESHIELD 2,000-SAMPLE RIGOROUS BENCHMARK")
    print(f"Model Under Test: {model_id}")
    print(f"Inference Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")
    print(f"Dataset Size:     {len(real_files)} Real Human + {len(fake_files)} AI Synthetic (Total: {total_samples})")
    print("=" * 80)
    
    print(f"Loading feature extractor and model weights...")
    extractor = AutoFeatureExtractor.from_pretrained(model_id)
    model = AutoModelForAudioClassification.from_pretrained(model_id).to(device)
    model.eval()
    
    # Resolve fake index
    id2label = getattr(model.config, "id2label", {0: "fake", 1: "real"})
    fake_idx = 0
    for idx, lbl in id2label.items():
        if "fake" in str(lbl).lower() or "ai" in str(lbl).lower() or str(idx) == "1":
            fake_idx = int(idx)
            break
            
    all_items = [(f, "real") for f in real_files] + [(f, "fake") for f in fake_files]
    np.random.seed(42)
    np.random.shuffle(all_items)
    
    records = []
    tp, tn, fp, fn = 0, 0, 0, 0
    en_total, en_correct = 0, 0
    hi_total, hi_correct = 0, 0
    cond_stats = {}
    latencies = []
    
    t_start = time.time()
    with torch.no_grad():
        for idx, (fpath, ground_truth) in enumerate(all_items, 1):
            fname = os.path.basename(fpath)
            lang = "hindi" if "hi_" in fname else "english"
            
            # Detect condition tag
            cond = "clean"
            if "phone" in fname: cond = "phone_bandpass"
            elif "reverb" in fname: cond = "reverb_replay"
            elif "ambient" in fname: cond = "ambient_noise"
            
            speech, sr = sf.read(fpath)
            dur = len(speech) / sr
            
            t0 = time.time()
            inputs = extractor(speech, sampling_rate=16000, return_tensors="pt").to(device)
            logits = model(**inputs).logits.squeeze()
            probs = torch.softmax(logits / 2.0, dim=-1).cpu().tolist()
            lat_ms = (time.time() - t0) * 1000.0
            latencies.append(lat_ms)
            
            fake_prob = probs[fake_idx]
            pred = "AI_GENERATED" if fake_prob >= 0.50 else "HUMAN_SPEECH"
            
            is_correct = False
            if ground_truth == "fake":
                if pred == "AI_GENERATED":
                    tp += 1
                    is_correct = True
                else:
                    fn += 1
            else:
                if pred == "HUMAN_SPEECH":
                    tn += 1
                    is_correct = True
                else:
                    fp += 1
                    
            if lang == "hindi":
                hi_total += 1
                if is_correct: hi_correct += 1
            else:
                en_total += 1
                if is_correct: en_correct += 1
                
            if cond not in cond_stats:
                cond_stats[cond] = {"total": 0, "correct": 0}
            cond_stats[cond]["total"] += 1
            if is_correct: cond_stats[cond]["correct"] += 1
            
            records.append({
                "filename": fname,
                "language": lang,
                "condition": cond,
                "ground_truth": ground_truth,
                "prediction": pred,
                "is_correct": is_correct,
                "fake_probability": round(fake_prob, 4),
                "duration_sec": round(dur, 2),
                "latency_ms": round(lat_ms, 1)
            })
            
            if idx % 100 == 0 or idx == len(all_items):
                acc = ((tp + tn) / len(records)) * 100.0
                print(f"[{idx:4d}/{len(all_items)}] Inferred: {fname[:35]:35s} | Acc: {acc:5.1f}% | Avg Latency: {np.mean(latencies):.1f}ms")
                
    total_time = time.time() - t_start
    total = len(records)
    accuracy = ((tp + tn) / total) * 100.0
    precision = (tp / (tp + fp) * 100.0) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn) * 100.0) if (tp + fn) > 0 else 0.0
    specificity = (tn / (tn + fp) * 100.0) if (tn + fp) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    fpr = (fp / (fp + tn) * 100.0) if (fp + tn) > 0 else 0.0
    fnr = (fn / (fn + tp) * 100.0) if (fn + tp) > 0 else 0.0
    
    en_acc = (en_correct / en_total * 100.0) if en_total > 0 else 0.0
    hi_acc = (hi_correct / hi_total * 100.0) if hi_total > 0 else 0.0
    avg_latency = np.mean(latencies)
    
    print("\n" + "=" * 80)
    print("📊 2,000-SAMPLE EMPIRICAL SCORECARD")
    print("=" * 80)
    print(f"Total Evaluated Samples:     {total}")
    print(f"Total Evaluation Time:       {total_time:.1f} seconds")
    print(f"Average Inference Latency:   {avg_latency:.1f} ms / sample")
    print("-" * 80)
    print(f"🎯 Overall Accuracy:         {accuracy:.2f}%  ({tp+tn}/{total})")
    print(f"🔍 Precision (AI):           {precision:.2f}%")
    print(f"📈 Recall / Sensitivity:     {recall:.2f}%")
    print(f"🛡️ Specificity (Human):      {specificity:.2f}%")
    print(f"⚡ F1-Score:                 {f1:.2f}%")
    print(f"⚠️ False Positive Rate (FPR): {fpr:.2f}% (Human incorrectly flagged as AI)")
    print(f"⚠️ False Negative Rate (FNR): {fnr:.2f}% (AI voice slipped past as Human)")
    print("-" * 80)
    print(f"🌐 English Accuracy:         {en_acc:.2f}% ({en_correct}/{en_total})")
    print(f"🌐 Hindi Accuracy:           {hi_acc:.2f}% ({hi_correct}/{hi_total})")
    print("-" * 80)
    print("Acoustic Channel Stress Breakdown:")
    for cond_name, stats in cond_stats.items():
        c_acc = (stats["correct"] / stats["total"]) * 100.0 if stats["total"] > 0 else 0.0
        print(f"  • {cond_name:18s}: {c_acc:5.2f}% ({stats['correct']}/{stats['total']})")
    print(f"Confusion Matrix: [TP: {tp}, FP: {fp}, FN: {fn}, TN: {tn}]")
    print("=" * 80)
    
    # Save CSV
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)
    print(f"📁 Row-level predictions exported to: {output_csv}")
    
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "total": total,
        "tp": tp, "fp": fp, "fn": fn, "tn": tn
    }

# =====================================================
# MAIN PIPELINE RUNNER
# =====================================================

def main():
    parser = argparse.ArgumentParser(description="VoiceShield 2k Sample Automated Benchmark")
    parser.add_argument("--dataset-dir", default="dataset_2k_benchmark", help="Directory to save test audio")
    parser.add_argument("--count", type=int, default=2000, help="Total audio clips (default: 2000)")
    parser.add_argument("--model-id", default="ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened", help="Hugging Face Model ID")
    parser.add_argument("--csv-output", default="voiceshield_2k_benchmark_predictions.csv", help="CSV report path")
    parser.add_argument("--vault-output", default="samples_golden_vault/test-Bi-new-2k-01", help="Golden Vault folder destination")
    args = parser.parse_args()
    
    real_dir = os.path.join(args.dataset_dir, "real")
    fake_dir = os.path.join(args.dataset_dir, "fake")
    
    half = args.count // 2
    
    # Ingest Real Data
    ingest_real_fleurs(real_dir, target_count=half * 2)
    
    # Synthesize AI Data
    asyncio.run(synthesize_all_ai(fake_dir, target_count=half * 2))
    
    # Run Evaluation
    results = evaluate_model(args.dataset_dir, args.model_id, args.csv_output)
    
    # Quality Gate
    if results and results["accuracy"] >= 88.0 and results["precision"] >= 85.0:
        print("\n🎉 MODEL PASSED THE QUALITY GATE! (Accuracy >= 88% and Precision >= 85%)")
        print(f"📦 Packaging dataset into Golden Vault destination: {args.vault_output}...")
        
        vault_real = os.path.join(args.vault_output, "real")
        vault_fake = os.path.join(args.vault_output, "fake")
        os.makedirs(vault_real, exist_ok=True)
        os.makedirs(vault_fake, exist_ok=True)
        
        import shutil
        print(f"Copying evaluated files to {args.vault_output}...")
        for rf in glob.glob(os.path.join(real_dir, "*.wav")):
            shutil.copy2(rf, vault_real)
        for ff in glob.glob(os.path.join(fake_dir, "*.wav")):
            shutil.copy2(ff, vault_fake)
            
        # Write metadata
        summary_file = os.path.join(args.vault_output, "benchmark_summary.json")
        with open(summary_file, "w") as f:
            json.dump({
                "name": "test-Bi-new-2k-01",
                "total_samples": results["total"],
                "accuracy": round(results["accuracy"], 2),
                "precision": round(results["precision"], 2),
                "recall": round(results["recall"], 2),
                "f1": round(results["f1"], 2),
                "model_tested": args.model_id,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }, f, indent=2)
            
        print(f"✅ Successfully archived 2,000 clips in Golden Vault: {args.vault_output}")
    else:
        print("\n⚠️ Model did not meet the certification threshold. Review predictions in CSV before archiving.")

if __name__ == "__main__":
    main()

