#!/usr/bin/env python3
"""
VoiceShield Golden Vault Comprehensive Evaluation Script
=========================================================
Tests VoiceShield model on the 1,818 golden vault benchmark audios
from Hugging Face repo: ArmanSandhu1729/voiceshield-golden-vault
"""

import os
import sys
import time
import json
import csv
import argparse
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import soundfile as sf
import torch
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
from huggingface_hub import HfApi, hf_hub_download

MODEL_ID = "ArmanSandhu1729/voiceshield-hindi-english-deepfake-v3-hardened"
REPO_ID = "ArmanSandhu1729/voiceshield-golden-vault"

def evaluate_golden_vault(limit: int = 50, device_str: str = "auto", output_dir: str = "reports"):
    os.makedirs(output_dir, exist_ok=True)
    
    if device_str == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_str)
        
    print("=" * 80)
    print(f"VOICESHIELD GOLDEN VAULT EVALUATION BENCHMARK")
    print(f"Model: {MODEL_ID}")
    print(f"Device: {device}")
    print(f"Dataset: {REPO_ID}")
    print("=" * 80)
    
    print("\n[1/4] Loading model and feature extractor...")
    extractor = AutoFeatureExtractor.from_pretrained(MODEL_ID)
    model = AutoModelForAudioClassification.from_pretrained(MODEL_ID).to(device)
    model.eval()
    
    # Resolve fake class index
    id2label = getattr(model.config, "id2label", {0: "fake", 1: "real"})
    fake_idx = 0
    for idx, lbl in id2label.items():
        if "fake" in str(lbl).lower() or "ai" in str(lbl).lower() or str(idx) == "1":
            fake_idx = int(idx)
            break
    real_idx = 1 - fake_idx
    print(f"Model labels: {id2label} | fake_idx: {fake_idx}, real_idx: {real_idx}")
    
    print("\n[2/4] Indexing golden vault files...")
    api = HfApi()
    all_files = api.list_repo_files(REPO_ID, repo_type="dataset")
    reals = [f for f in all_files if f.startswith("test-Bi-new-2k-01/real/") and f.endswith(".wav")]
    fakes = [f for f in all_files if f.startswith("test-Bi-new-2k-01/fake/") and f.endswith(".wav")]
    print(f"Found {len(reals)} real files and {len(fakes)} fake files in golden vault.")
    
    if limit and limit > 0:
        half = limit // 2
        reals = reals[:half]
        fakes = fakes[:half]
        print(f"Sampling subset for rapid evaluation: {len(reals)} real + {len(fakes)} fake = {len(reals)+len(fakes)} total")
        
    items = [(f, "real") for f in reals] + [(f, "fake") for f in fakes]
    np.random.seed(42)
    np.random.shuffle(items)
    
    print("\n[3/4] Running inference...")
    results = []
    tp, tn, fp, fn = 0, 0, 0, 0
    en_total, en_correct = 0, 0
    hi_total, hi_correct = 0, 0
    
    t_start = time.time()
    
    for idx, (hf_path, ground_truth) in enumerate(items, 1):
        fname = os.path.basename(hf_path)
        lang = "hindi" if "hi_" in fname else "english"
        
        # Download file to local cache
        local_path = hf_hub_download(repo_id=REPO_ID, filename=hf_path, repo_type="dataset")
        speech, sr = sf.read(local_path)
        if len(speech.shape) > 1:
            speech = np.mean(speech, axis=-1)
        if sr != 16000:
            import librosa
            speech = librosa.resample(speech, orig_sr=sr, target_sr=16000)
            sr = 16000
            
        dur = len(speech) / sr
        
        # Direct feature inference (no zero-padding chunking)
        inputs = extractor(speech, sampling_rate=16000, return_tensors="pt")
        input_values = inputs.input_values.to(device)
        
        with torch.no_grad():
            logits = model(input_values).logits.squeeze()
            probs = torch.softmax(logits, dim=-1).cpu().tolist()
            if isinstance(probs, float):
                probs = [probs, 1.0 - probs]
                
        fake_prob = float(probs[fake_idx])
        real_prob = float(probs[real_idx])
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
            
        results.append({
            "filename": fname,
            "language": lang,
            "ground_truth": ground_truth,
            "prediction": pred,
            "is_correct": is_correct,
            "fake_score": round(fake_prob, 4),
            "real_score": round(real_prob, 4),
            "duration_sec": round(dur, 2)
        })
        
        if idx % 10 == 0 or idx == len(items):
            current_acc = ((tp + tn) / idx) * 100.0
            print(f"[{idx:3d}/{len(items)}] {fname[:32]:32s} | Pred: {pred:14s} (Real={real_prob*100:5.1f}%, Fake={fake_prob*100:5.1f}%) | Acc: {current_acc:5.2f}%")
            
    total_time = time.time() - t_start
    total_evaluated = len(results)
    accuracy = ((tp + tn) / total_evaluated) * 100.0 if total_evaluated > 0 else 0.0
    precision = (tp / (tp + fp)) * 100.0 if (tp + fp) > 0 else 0.0
    recall = (tp / (tp + fn)) * 100.0 if (tp + fn) > 0 else 0.0
    specificity = (tn / (tn + fp)) * 100.0 if (tn + fp) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    fpr = (fp / (fp + tn)) * 100.0 if (fp + tn) > 0 else 0.0
    fnr = (fn / (fn + tp)) * 100.0 if (fn + tp) > 0 else 0.0
    
    hi_acc = (hi_correct / hi_total * 100.0) if hi_total > 0 else 0.0
    en_acc = (en_correct / en_total * 100.0) if en_total > 0 else 0.0
    
    print("\n" + "=" * 80)
    print("VOICESHIELD GOLDEN VAULT EVALUATION SUMMARY REPORT")
    print("=" * 80)
    print(f"Total Evaluated: {total_evaluated} files ({total_time:.1f}s, {total_time/total_evaluated*1000:.1f}ms/file)")
    print(f"Overall Accuracy:  {accuracy:6.2f}%")
    print(f"Precision:         {precision:6.2f}%")
    print(f"Recall (Sensitivity): {recall:6.2f}%")
    print(f"Specificity:       {specificity:6.2f}%")
    print(f"F1-Score:          {f1:6.2f}%")
    print(f"False Positive Rate: {fpr:6.2f}%")
    print(f"False Negative Rate: {fnr:6.2f}%")
    print("-" * 80)
    print(f"Hindi Accuracy:    {hi_acc:6.2f}% ({hi_correct}/{hi_total})")
    print(f"English Accuracy:  {en_acc:6.2f}% ({en_correct}/{en_total})")
    print("-" * 80)
    print(f"Confusion Matrix:  TP={tp}, TN={tn}, FP={fp}, FN={fn}")
    print("=" * 80)
    
    summary = {
        "model_id": MODEL_ID,
        "dataset_repo": REPO_ID,
        "total_evaluated": total_evaluated,
        "duration_seconds": round(total_time, 2),
        "overall_accuracy_pct": round(accuracy, 2),
        "precision_pct": round(precision, 2),
        "recall_pct": round(recall, 2),
        "specificity_pct": round(specificity, 2),
        "f1_score_pct": round(f1, 2),
        "false_positive_rate_pct": round(fpr, 2),
        "false_negative_rate_pct": round(fnr, 2),
        "hindi_accuracy_pct": round(hi_acc, 2),
        "english_accuracy_pct": round(en_acc, 2),
        "confusion_matrix": {"tp": tp, "tn": tn, "fp": fp, "fn": fn}
    }
    
    json_path = os.path.join(output_dir, "golden_vault_evaluation_summary.json")
    csv_path = os.path.join(output_dir, "golden_vault_predictions.csv")
    
    with open(json_path, "w") as f:
        json.dump(summary, f, indent=2)
        
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "language", "ground_truth", "prediction", "is_correct", "real_score", "fake_score", "duration_sec"])
        writer.writeheader()
        writer.writerows(results)
        
    print(f"Saved summary report to: {json_path}")
    print(f"Saved row-level predictions to: {csv_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50, help="Number of files to evaluate (0 for all)")
    parser.add_argument("--device", type=str, default="auto", help="'cuda', 'cpu', or 'auto'")
    parser.add_argument("--outdir", type=str, default="reports", help="Output directory")
    args = parser.parse_args()
    
    evaluate_golden_vault(limit=args.limit, device_str=args.device, output_dir=args.outdir)
