#!/usr/bin/env python3
"""
VoiceShield Automated Model Evaluation Benchmark
=================================================
Automates precision testing of VoiceShield deepfake detection model on 
balanced test voices (Real Human vs. AI Synthetic) strictly between 3.0 to 6.0 seconds.

Features:
- Slices all audio strictly to [3.0s, 6.0s] duration.
- Computes Accuracy, Precision, Recall, Specificity, F1-Score, FPR, FNR.
- Compares English vs. Hindi performance.
- Exports row-level predictions to CSV and summary report to JSON.
"""

import os
import sys
import time
import glob
import json
import csv
import argparse
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import numpy as np
import soundfile as sf
import librosa
from app.services.audio_service import process_audio
from app.services.model_service import model_service

def validate_and_slice_audio(audio_data: np.ndarray, sr: int = 16000, min_sec: float = 3.0, max_sec: float = 6.0):
    """
    Ensures audio is strictly within [min_sec, max_sec].
    If longer than max_sec, crops to max_sec.
    If shorter than min_sec, returns None.
    """
    duration = len(audio_data) / sr
    if duration < min_sec:
        return None, duration
    
    # Crop to max_sec if longer
    target_samples = int(max_sec * sr)
    if len(audio_data) > target_samples:
        audio_data = audio_data[:target_samples]
        duration = max_sec
        
    return audio_data, duration

def run_evaluation(test_dir: str = "dataset_test", target_count: int = 200, output_csv: str = "evaluation_predictions.csv"):
    """
    Evaluates audio files in test_dir (structured as dataset_test/real and dataset_test/fake).
    """
    real_dir = os.path.join(test_dir, "real")
    fake_dir = os.path.join(test_dir, "fake")
    
    real_files = sorted(glob.glob(os.path.join(real_dir, "*.wav")) + glob.glob(os.path.join(real_dir, "*.mp3")))
    fake_files = sorted(glob.glob(os.path.join(fake_dir, "*.wav")) + glob.glob(os.path.join(fake_dir, "*.mp3")))
    
    if target_count:
        real_files = real_files[:target_count]
        fake_files = fake_files[:target_count]
        
    total_samples = len(real_files) + len(fake_files)
    if total_samples == 0:
        print(f"No audio files found in {test_dir}/real or {test_dir}/fake.")
        print(f"Please place test audio in {test_dir} or run the automated dataset generator.")
        return
    
    print("=" * 80)
    print(f"VOICESHIELD AUTOMATED BENCHMARK: {len(real_files)} REAL + {len(fake_files)} FAKE (Total: {total_samples})")
    print(f"Constraint: Audio strictly validated between 3.0s and 6.0s duration")
    print(f"Active Model: {model_service.model_name}")
    print("=" * 80)
    
    records = []
    tp, tn, fp, fn = 0, 0, 0, 0
    en_total, en_correct = 0, 0
    hi_total, hi_correct = 0, 0
    latencies = []
    
    all_items = [(f, "real") for f in real_files] + [(f, "fake") for f in fake_files]
    
    for idx, (fpath, ground_truth) in enumerate(all_items, 1):
        fname = os.path.basename(fpath)
        lang = "hindi" if any(k in fname.lower() for k in ["hi_", "hindi", "bulbul", "swara", "madhur"]) else "english"
        
        try:
            with open(fpath, "rb") as f:
                file_bytes = f.read()
            audio_data, raw_duration, rms = process_audio(file_bytes, filename=fname)
            
            # Slicing strictly to 3.0s - 6.0s
            audio_data, duration = validate_and_slice_audio(audio_data, sr=16000, min_sec=3.0, max_sec=6.0)
            if audio_data is None:
                continue
                
            t0 = time.time()
            res = model_service.predict(audio_data, duration, rms)
            latency_ms = (time.time() - t0) * 1000.0
            latencies.append(latency_ms)
            
            prediction = res["prediction"]
            conf = res["confidence"]
            fake_prob = res.get("raw_fake_prob", res.get("fake_score", 0.0))
            
            is_correct = False
            if ground_truth == "fake":
                if prediction == "AI_GENERATED":
                    tp += 1
                    is_correct = True
                else:
                    fn += 1
            else:
                if prediction == "HUMAN_SPEECH":
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
                
            records.append({
                "filename": fname,
                "language": lang,
                "ground_truth": ground_truth,
                "prediction": prediction,
                "is_correct": is_correct,
                "confidence": round(conf, 4),
                "fake_probability": round(fake_prob, 4),
                "duration_sec": round(duration, 2),
                "latency_ms": round(latency_ms, 1)
            })
            
            if idx % 25 == 0 or idx == len(all_items):
                curr_acc = ((tp + tn) / len(records)) * 100.0 if records else 0
                print(f"[{idx}/{len(all_items)}] Processed {fname[:30]} | Acc so far: {curr_acc:.1f}%")
                
        except Exception as e:
            print(f"Error evaluating {fname}: {e}")
            
    # Calculate Statistical Performance Metrics
    total_eval = len(records)
    if total_eval == 0:
        print("No valid audio clips matched duration constraint (3.0s - 6.0s).")
        return
        
    accuracy = ((tp + tn) / total_eval) * 100.0
    precision = (tp / (tp + fp) * 100.0) if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn) * 100.0) if (tp + fn) > 0 else 0.0
    specificity = (tn / (tn + fp) * 100.0) if (tn + fp) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    fpr = (fp / (fp + tn) * 100.0) if (fp + tn) > 0 else 0.0
    fnr = (fn / (fn + tp) * 100.0) if (fn + tp) > 0 else 0.0
    
    en_acc = (en_correct / en_total * 100.0) if en_total > 0 else 0.0
    hi_acc = (hi_correct / hi_total * 100.0) if hi_total > 0 else 0.0
    avg_latency = np.mean(latencies) if latencies else 0.0
    
    print("\n" + "=" * 80)
    print("📊 EMPIRICAL MODEL EVALUATION SCORECARD")
    print("=" * 80)
    print(f"Total Evaluated Audio Samples: {total_eval}")
    print(f"Audio Duration Window:         3.00s to 6.00s")
    print(f"Average Inference Latency:     {avg_latency:.1f} ms per sample")
    print("-" * 80)
    print(f"🎯 Overall Accuracy:           {accuracy:.2f}% ({tp+tn}/{total_eval})")
    print(f"🔍 Precision (AI):             {precision:.2f}%")
    print(f"📈 Recall / Sensitivity (AI):   {recall:.2f}%")
    print(f"🛡️ Specificity (Human):        {specificity:.2f}%")
    print(f"⚡ F1-Score:                   {f1:.2f}%")
    print(f"⚠️ False Positive Rate (FPR):   {fpr:.2f}% (Human falsely flagged as AI)")
    print(f"⚠️ False Negative Rate (FNR):   {fnr:.2f}% (AI voice missed as Human)")
    print("-" * 80)
    print(f"🌐 English Accuracy:           {en_acc:.2f}% ({en_correct}/{en_total})")
    print(f"🌐 Hindi Accuracy:             {hi_acc:.2f}% ({hi_correct}/{hi_total})")
    print("-" * 80)
    print(f"Confusion Matrix: [TP: {tp}, FP: {fp}, FN: {fn}, TN: {tn}]")
    print("=" * 80)
    
    # Save CSV
    if records:
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=records[0].keys())
            writer.writeheader()
            writer.writerows(records)
        print(f"✅ Row-level evaluation log exported to: {output_csv}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="VoiceShield Automated Model Evaluator")
    parser.add_argument("--test-dir", default="dataset_test", help="Directory with real/ and fake/ subfolders")
    parser.add_argument("--target-count", type=int, default=200, help="Clips per category (default: 200)")
    parser.add_argument("--output-csv", default="evaluation_predictions.csv", help="CSV export file path")
    args = parser.parse_args()
    
    run_evaluation(test_dir=args.test_dir, target_count=args.target_count, output_csv=args.output_csv)

