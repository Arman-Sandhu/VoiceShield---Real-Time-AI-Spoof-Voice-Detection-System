import os
import json
import sqlite3
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

from app.core.config import settings

logger = logging.getLogger("voiceshield.history_service")

class HistoryService:
    def __init__(self):
        self.supabase: Optional[Client] = None
        self._init_supabase()
        self._init_sqlite()

    def _init_supabase(self):
        """Initializes Supabase client if URL and service key are provided and reachable."""
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                import urllib.parse
                import socket
                parsed = urllib.parse.urlparse(settings.SUPABASE_URL)
                host = parsed.hostname
                port = parsed.port or (443 if parsed.scheme == "https" else 80)
                
                # Fast 1.5s DNS/socket check to prevent startup hangs when offline
                if host:
                    try:
                        sock = socket.create_connection((host, port), timeout=1.5)
                        sock.close()
                    except (socket.timeout, socket.gaierror, OSError) as net_err:
                        logger.warning(
                            f"Supabase host '{host}' unreachable ({net_err}). "
                            "Using local SQLite database for history storage."
                        )
                        self.supabase = None
                        return

                self.supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                logger.info(f"Supabase client configured with endpoint: {settings.SUPABASE_URL}")
            except Exception as e:
                logger.warning(f"Could not connect to Supabase: {e}. Fallback to local SQLite is active.")
                self.supabase = None
        else:
            logger.info("Supabase credentials not configured. Using local SQLite database.")

    def _init_sqlite(self):
        """Ensures local SQLite analysis_history table exists with the proper schema."""
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS analysis_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        event_id TEXT NOT NULL UNIQUE,
                        user_id TEXT NOT NULL,
                        mode TEXT NOT NULL,
                        duration REAL,
                        model_name TEXT,
                        fake_score REAL,
                        real_score REAL,
                        prediction TEXT,
                        context_risk TEXT,
                        final_risk TEXT,
                        risk_explanation TEXT,
                        created_at TEXT NOT NULL
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_hist_user_id ON analysis_history(user_id);")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_hist_created_at ON analysis_history(created_at DESC);")
                conn.commit()
                logger.info(f"Local SQLite database initialized at: {settings.SQLITE_DB_PATH}")
        except Exception as e:
            logger.error(f"Failed to initialize SQLite database: {e}")

    def save_analysis(
        self,
        event_id: str,
        user_id: str,
        mode: str,
        duration: float,
        model_name: str,
        fake_score: float,
        real_score: float,
        prediction: str,
        context_risk: Dict[str, Any],
        final_risk: str,
        risk_explanation: str
    ) -> Dict[str, Any]:
        """
        Saves analysis record. Attempts Supabase first, falls back to SQLite if Supabase is offline.
        """
        created_at_iso = datetime.now(timezone.utc).isoformat()
        saved_record = {
            "event_id": event_id,
            "user_id": user_id,
            "mode": mode,
            "duration": round(duration, 2),
            "model_name": model_name,
            "fake_score": round(fake_score, 4),
            "real_score": round(real_score, 4),
            "prediction": prediction,
            "context_risk": context_risk,
            "final_risk": final_risk,
            "risk_explanation": risk_explanation,
            "created_at": created_at_iso
        }

        # Attempt Supabase
        if self.supabase:
            try:
                res = self.supabase.table("analysis_history").insert(saved_record).execute()
                if res.data:
                    logger.info(f"Record {event_id} stored in Supabase successfully.")
                    return saved_record
            except Exception as e:
                logger.warning(f"Supabase insert failed ({e}). Falling back to SQLite.")

        # SQLite persistence
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO analysis_history (
                        event_id, user_id, mode, duration, model_name,
                        fake_score, real_score, prediction, context_risk,
                        final_risk, risk_explanation, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event_id,
                    user_id,
                    mode,
                    round(duration, 2),
                    model_name,
                    round(fake_score, 4),
                    round(real_score, 4),
                    prediction,
                    json.dumps(context_risk),
                    final_risk,
                    risk_explanation,
                    created_at_iso
                ))
                conn.commit()
                logger.info(f"Record {event_id} saved to SQLite store.")
                return saved_record
        except Exception as e:
            logger.error(f"Failed to save record to SQLite: {e}")
            raise RuntimeError(f"Database persistence failure: {e}")

    def get_user_history(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieves analysis history strictly for the authenticated user ID.
        """
        # Attempt Supabase
        if self.supabase:
            try:
                res = (
                    self.supabase.table("analysis_history")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("created_at", desc=True)
                    .limit(limit)
                    .execute()
                )
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Supabase select failed ({e}). Falling back to SQLite.")

        # SQLite retrieval
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM analysis_history
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (user_id, limit))
                rows = cursor.fetchall()
                results = []
                for row in rows:
                    item = dict(row)
                    if isinstance(item.get("context_risk"), str):
                        try:
                            item["context_risk"] = json.loads(item["context_risk"])
                        except Exception:
                            pass
                    results.append(item)
                return results
        except Exception as e:
            logger.error(f"Failed to fetch user history from SQLite: {e}")
            return []

    def get_analysis_by_id(self, event_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a single record by event_id, ensuring user ownership.
        """
        if self.supabase:
            try:
                res = (
                    self.supabase.table("analysis_history")
                    .select("*")
                    .eq("event_id", event_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase lookup failed ({e}). Falling back to SQLite.")

        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM analysis_history
                    WHERE event_id = ? AND user_id = ?
                """, (event_id, user_id))
                row = cursor.fetchone()
                if row:
                    item = dict(row)
                    if isinstance(item.get("context_risk"), str):
                        try:
                            item["context_risk"] = json.loads(item["context_risk"])
                        except Exception:
                            pass
                    return item
                return None
        except Exception as e:
            logger.error(f"Failed to lookup record in SQLite: {e}")
            return None

    def delete_analysis(self, event_id: str, user_id: str) -> bool:
        """
        Deletes a record owned by the authenticated user.
        """
        deleted = False
        if self.supabase:
            try:
                res = (
                    self.supabase.table("analysis_history")
                    .delete()
                    .eq("event_id", event_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if res.data:
                    deleted = True
            except Exception as e:
                logger.warning(f"Supabase delete failed ({e}). Falling back to SQLite.")

        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    DELETE FROM analysis_history
                    WHERE event_id = ? AND user_id = ?
                """, (event_id, user_id))
                conn.commit()
                if cursor.rowcount > 0:
                    deleted = True
        except Exception as e:
            logger.error(f"Failed to delete record from SQLite: {e}")

        return deleted

history_service = HistoryService()
