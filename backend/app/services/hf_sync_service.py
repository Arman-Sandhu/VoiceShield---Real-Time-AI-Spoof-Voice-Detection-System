import os
import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from huggingface_hub import HfApi

from app.core.config import settings

logger = logging.getLogger("voiceshield.hf_sync_service")

DATASET_REPO_ID = os.getenv("HF_DATASET_REPO_ID", "ArmanSandhu1729/voiceshield-telemetry-vault")
HF_TOKEN = os.getenv("HF_TOKEN") or getattr(settings, "HF_TOKEN", None)

class HfSyncService:
    def __init__(self):
        self.api = HfApi(token=HF_TOKEN)
        self.repo_id = DATASET_REPO_ID
        self._ensure_repo()

    def _ensure_repo(self):
        """Ensures the Hugging Face dataset repository exists."""
        try:
            self.api.create_repo(
                repo_id=self.repo_id,
                repo_type="dataset",
                exist_ok=True,
                private=False
            )
        except Exception as e:
            logger.warning(f"Could not verify/create dataset repo {self.repo_id}: {e}")

    def sync_record(
        self,
        event_id: str,
        audio_bytes: Optional[bytes],
        file_name: str,
        user_id: str,
        username: str,
        mode: str,
        duration: float,
        prediction: str,
        fake_score: float,
        real_score: float,
        final_risk: str,
        risk_explanation: str,
        is_flagged: bool = False,
        created_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Uploads an analyzed speech audio sample to the Hugging Face Dataset repository
        and records its metadata in 'metadata.jsonl'.
        """
        timestamp = created_at or datetime.now(timezone.utc).isoformat()
        clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', file_name or "audio.wav")
        audio_repo_path = f"audios/{event_id}_{clean_name}"
        if not audio_repo_path.lower().endswith(('.wav', '.mp3', '.ogg', '.flac')):
            audio_repo_path += ".wav"

        audio_url = None
        # 1. Upload audio file if bytes provided
        if audio_bytes and len(audio_bytes) > 0:
            try:
                self.api.upload_file(
                    path_or_fileobj=audio_bytes,
                    path_in_repo=audio_repo_path,
                    repo_id=self.repo_id,
                    repo_type="dataset",
                    commit_message=f"feat(audit): store forensic audio for {event_id} ({prediction})"
                )
                audio_url = f"https://huggingface.co/datasets/{self.repo_id}/resolve/main/{audio_repo_path}"
                logger.info(f"Audio for {event_id} synced to HF Dataset at {audio_repo_path}")
            except Exception as e:
                logger.warning(f"Failed to upload audio to HF dataset: {e}")

        # 2. Append metadata to metadata.jsonl
        meta_entry = {
            "event_id": event_id,
            "user_id": user_id,
            "username": username,
            "file_name": clean_name,
            "audio_file": audio_repo_path if audio_url else None,
            "audio_url": audio_url,
            "mode": mode,
            "duration_seconds": round(duration, 2),
            "prediction": prediction,
            "fake_score": round(fake_score, 4),
            "real_score": round(real_score, 4),
            "final_risk": final_risk,
            "risk_explanation": risk_explanation,
            "is_flagged": is_flagged,
            "created_at": timestamp
        }

        try:
            line = json.dumps(meta_entry) + "\n"
            # Read existing metadata.jsonl if present
            existing_content = ""
            try:
                raw_bytes = self.api.hf_hub_download(
                    repo_id=self.repo_id,
                    repo_type="dataset",
                    filename="metadata.jsonl"
                )
                with open(raw_bytes, "r", encoding="utf-8") as f:
                    existing_content = f.read()
            except Exception:
                existing_content = ""

            # Check if event_id already exists to prevent duplicates
            lines = [l for l in existing_content.splitlines() if l.strip()]
            updated_lines = []
            found = False
            for l in lines:
                try:
                    parsed = json.loads(l)
                    if parsed.get("event_id") == event_id:
                        updated_lines.append(json.dumps(meta_entry))
                        found = True
                    else:
                        updated_lines.append(l)
                except Exception:
                    updated_lines.append(l)

            if not found:
                updated_lines.append(json.dumps(meta_entry))

            new_content = "\n".join(updated_lines) + "\n"

            self.api.upload_file(
                path_or_fileobj=new_content.encode("utf-8"),
                path_in_repo="metadata.jsonl",
                repo_id=self.repo_id,
                repo_type="dataset",
                commit_message=f"chore(telemetry): record audit event {event_id}"
            )
            logger.info(f"Metadata for {event_id} successfully recorded in HF Dataset metadata.jsonl")
        except Exception as e:
            logger.warning(f"Failed to update metadata.jsonl in HF dataset: {e}")

        return {
            "status": "synced",
            "repo_id": self.repo_id,
            "audio_url": audio_url,
            "event_id": event_id
        }

    def update_flag(self, event_id: str, is_flagged: bool) -> bool:
        """Updates the is_flagged field for a record in the Hugging Face dataset."""
        try:
            raw_bytes = self.api.hf_hub_download(
                repo_id=self.repo_id,
                repo_type="dataset",
                filename="metadata.jsonl"
            )
            with open(raw_bytes, "r", encoding="utf-8") as f:
                content = f.read()

            lines = [l for l in content.splitlines() if l.strip()]
            updated_lines = []
            found = False
            for l in lines:
                try:
                    parsed = json.loads(l)
                    if parsed.get("event_id") == event_id:
                        parsed["is_flagged"] = is_flagged
                        updated_lines.append(json.dumps(parsed))
                        found = True
                    else:
                        updated_lines.append(l)
                except Exception:
                    updated_lines.append(l)

            if found:
                new_content = "\n".join(updated_lines) + "\n"
                self.api.upload_file(
                    path_or_fileobj=new_content.encode("utf-8"),
                    path_in_repo="metadata.jsonl",
                    repo_id=self.repo_id,
                    repo_type="dataset",
                    commit_message=f"chore(flag): update flag status to {is_flagged} for {event_id}"
                )
                logger.info(f"Flag status updated to {is_flagged} for {event_id} in HF dataset")
                return True
        except Exception as e:
            logger.warning(f"Could not update flag status in HF dataset: {e}")
        return False

hf_sync_service = HfSyncService()
