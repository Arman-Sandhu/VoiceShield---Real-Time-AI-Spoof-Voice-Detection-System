import sys
import os
from pathlib import Path

# Add backend to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.services.audio_service import process_audio
from app.services.model_service import model_service
from app.services.speech_intelligence_service import speech_intelligence

def run_benchmark():
    test_cases = [
        {
            "category": "Real Hindi",
            "file": "samples_golden_vault/hi_human/hi_real_440.wav",
            "expected_pred": "HUMAN_SPEECH",
            "expected_lang": "Hindi"
        },
        {
            "category": "Real English",
            "file": "samples_golden_vault/en_human/en_real_124.wav",
            "expected_pred": "HUMAN_SPEECH",
            "expected_lang": "English"
        },
        {
            "category": "AI Hindi (Synthesized Madhur)",
            "file": "samples_golden_vault/gemini_frontier/gemini_hi_otp_madhur_clean.wav",
            "expected_pred": "AI_GENERATED",
            "expected_lang": "Hindi"
        },
        {
            "category": "AI English (Synthesized Brian)",
            "file": "samples_golden_vault/gemini_frontier/gemini_en_neural_brian_clean.wav",
            "expected_pred": "AI_GENERATED",
            "expected_lang": "English"
        },
        {
            "category": "AI Hindi (Direct Sample)",
            "file": "samples_golden_vault/hi_ai/hi_ai_99.wav",
            "expected_pred": "AI_GENERATED",
            "expected_lang": "Hindi"
        },
        {
            "category": "AI English (Direct Sample)",
            "file": "samples_golden_vault/en_ai/en_ai_309.wav",
            "expected_pred": "AI_GENERATED",
            "expected_lang": "English"
        },
        {
            "category": "Real Human (Reverb / Room Acoustic)",
            "file": "samples_golden_vault/reverb_replay/rev_real_236.wav",
            "expected_pred": "HUMAN_SPEECH",
            "expected_lang": "English"
        },
        {
            "category": "Real Human (Phone Line Audio)",
            "file": "samples_golden_vault/phone_distorted/dist_real_99.wav",
            "expected_pred": "HUMAN_SPEECH",
            "expected_lang": "English"
        }
    ]

    print("=" * 85)
    print("  VOICESHIELD 4-QUADRANT BENCHMARK VERIFICATION REPORT (4.0s - 7.0s CLIPS)")
    print("=" * 85)
    print(f"{'Category':<35} | {'Duration':<8} | {'Lang':<8} | {'Prediction':<13} | {'Human%':<7} | {'Fake%':<7} | {'Status'}")
    print("-" * 85)

    all_passed = True
    for tc in test_cases:
        p = Path(tc["file"])
        if not p.exists():
            print(f"File not found: {tc['file']}")
            continue

        with open(p, "rb") as f:
            file_bytes = f.read()

        audio_data, duration, rms = process_audio(file_bytes, filename=p.name)
        lang_res = speech_intelligence.detect_language(audio_data)
        model_res = model_service.predict(audio_data, duration, rms)

        is_pred_correct = (model_res["prediction"] == tc["expected_pred"])
        # Language check
        detected_lang = lang_res["language"]
        is_lang_correct = tc["expected_lang"].lower() in detected_lang.lower()

        status_str = "PASS" if is_pred_correct else "FAIL"
        if not is_pred_correct:
            all_passed = False

        print(
            f"{tc['category']:<35} | "
            f"{duration:.1f}s    | "
            f"{detected_lang[:7]:<8} | "
            f"{model_res['prediction']:<13} | "
            f"{model_res['real_score']*100:5.1f}% | "
            f"{model_res['fake_score']*100:5.1f}% | "
            f"{status_str}"
        )

    print("=" * 85)
    if all_passed:
        print("  ALL BENCHMARK TESTS PASSED WITH 100% ACCURACY!")
    else:
        print("  SOME BENCHMARK TESTS FAILED.")
    print("=" * 85)

if __name__ == "__main__":
    run_benchmark()
