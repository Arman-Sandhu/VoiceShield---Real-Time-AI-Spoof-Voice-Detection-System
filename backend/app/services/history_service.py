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
        """Ensures local SQLite users and analysis_history tables exist with the proper schema and migrations."""
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                
                # 1. Users table for user subspace & telemetry
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        user_id TEXT PRIMARY KEY,
                        username TEXT DEFAULT '',
                        email TEXT,
                        joined_at TEXT NOT NULL,
                        last_active_at TEXT NOT NULL,
                        total_audios_analyzed INTEGER DEFAULT 0 NOT NULL,
                        total_time_analyzed REAL DEFAULT 0.0 NOT NULL,
                        total_recorded INTEGER DEFAULT 0 NOT NULL,
                        total_uploaded INTEGER DEFAULT 0 NOT NULL,
                        total_spoofs_detected INTEGER DEFAULT 0 NOT NULL
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);")

                # Dynamic migration check for users table
                cursor.execute("PRAGMA table_info(users)")
                user_cols = [col[1] for col in cursor.fetchall()]
                if "username" not in user_cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN username TEXT DEFAULT '';")

                # 2. Analysis history table partitioned by user subspace
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
                        file_name TEXT DEFAULT '',
                        username TEXT DEFAULT '',
                        user_email TEXT DEFAULT '',
                        is_flagged BOOLEAN DEFAULT 0,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_hist_user_id ON analysis_history(user_id);")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_hist_created_at ON analysis_history(created_at DESC);")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_hist_user_mode ON analysis_history(user_id, mode);")
                
                # Dynamic migration check for analysis_history table
                cursor.execute("PRAGMA table_info(analysis_history)")
                existing_cols = [col[1] for col in cursor.fetchall()]
                if "is_flagged" not in existing_cols:
                    cursor.execute("ALTER TABLE analysis_history ADD COLUMN is_flagged BOOLEAN DEFAULT 0;")
                if "file_name" not in existing_cols:
                    cursor.execute("ALTER TABLE analysis_history ADD COLUMN file_name TEXT DEFAULT '';")
                if "username" not in existing_cols:
                    cursor.execute("ALTER TABLE analysis_history ADD COLUMN username TEXT DEFAULT '';")
                if "user_email" not in existing_cols:
                    cursor.execute("ALTER TABLE analysis_history ADD COLUMN user_email TEXT DEFAULT '';")
                
                # Backfill users in SQLite from any historical records
                cursor.execute("""
                    INSERT OR IGNORE INTO users (
                        user_id, username, email, joined_at, last_active_at, 
                        total_audios_analyzed, total_time_analyzed, 
                        total_recorded, total_uploaded, total_spoofs_detected
                    )
                    SELECT 
                        user_id,
                        '',
                        user_id || '@voiceshield.internal',
                        MIN(created_at),
                        MAX(created_at),
                        COUNT(*),
                        COALESCE(SUM(duration), 0.0),
                        SUM(CASE WHEN mode = 'record' THEN 1 ELSE 0 END),
                        SUM(CASE WHEN mode != 'record' THEN 1 ELSE 0 END),
                        SUM(CASE WHEN prediction = 'AI_GENERATED' OR fake_score >= 0.5 THEN 1 ELSE 0 END)
                    FROM analysis_history
                    WHERE user_id NOT IN (SELECT user_id FROM users)
                    GROUP BY user_id
                """)

                conn.commit()
                logger.info(f"Local SQLite database initialized at: {settings.SQLITE_DB_PATH}")
        except Exception as e:
            logger.error(f"Failed to initialize SQLite database: {e}")

    def ensure_user(self, user_id: str, email: Optional[str] = None, username: Optional[str] = None) -> Dict[str, Any]:
        """
        Ensures a user subspace record exists in Supabase and SQLite.
        Records their join timestamp if new, and updates last active time and username if provided.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        resolved_email = email or f"{user_id}@voiceshield.internal"
        clean_username = (username or "").strip()

        # 1. Supabase check & upsert
        if self.supabase:
            try:
                res = self.supabase.table("users").select("*").eq("user_id", user_id).execute()
                if res.data and len(res.data) > 0:
                    update_payload = {
                        "last_active_at": now_iso,
                        "email": resolved_email
                    }
                    if clean_username:
                        update_payload["username"] = clean_username
                    self.supabase.table("users").update(update_payload).eq("user_id", user_id).execute()
                    row = res.data[0]
                    if clean_username:
                        row["username"] = clean_username
                    return row
                else:
                    new_user = {
                        "user_id": user_id,
                        "username": clean_username,
                        "email": resolved_email,
                        "joined_at": now_iso,
                        "last_active_at": now_iso,
                        "total_audios_analyzed": 0,
                        "total_time_analyzed": 0.0,
                        "total_recorded": 0,
                        "total_uploaded": 0,
                        "total_spoofs_detected": 0
                    }
                    inserted = self.supabase.table("users").insert(new_user).execute()
                    logger.info(f"Created new user subspace in Supabase for user {user_id}")
                    if inserted.data:
                        return inserted.data[0]
            except Exception as e:
                logger.warning(f"Supabase ensure_user notice ({e}). Falling back to SQLite.")

        # 2. SQLite check & upsert
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                row = cursor.fetchone()
                if row:
                    if clean_username:
                        cursor.execute("""
                            UPDATE users SET last_active_at = ?, email = COALESCE(?, email), username = ?
                            WHERE user_id = ?
                        """, (now_iso, resolved_email, clean_username, user_id))
                    else:
                        cursor.execute("""
                            UPDATE users SET last_active_at = ?, email = COALESCE(?, email)
                            WHERE user_id = ?
                        """, (now_iso, resolved_email, user_id))
                    conn.commit()
                    return dict(row)
                else:
                    cursor.execute("""
                        INSERT INTO users (
                            user_id, username, email, joined_at, last_active_at,
                            total_audios_analyzed, total_time_analyzed,
                            total_recorded, total_uploaded, total_spoofs_detected
                        ) VALUES (?, ?, ?, ?, ?, 0, 0.0, 0, 0, 0)
                    """, (user_id, clean_username, resolved_email, now_iso, now_iso))
                    conn.commit()
                    logger.info(f"Created new user subspace in SQLite for user {user_id}")
                    return {
                        "user_id": user_id,
                        "username": clean_username,
                        "email": resolved_email,
                        "joined_at": now_iso,
                        "last_active_at": now_iso,
                        "total_audios_analyzed": 0,
                        "total_time_analyzed": 0.0,
                        "total_recorded": 0,
                        "total_uploaded": 0,
                        "total_spoofs_detected": 0
                    }
        except Exception as e:
            logger.error(f"Failed to ensure user in SQLite: {e}")
            return {
                "user_id": user_id,
                "username": clean_username,
                "email": resolved_email,
                "joined_at": now_iso,
                "last_active_at": now_iso
            }

    def get_user_username(self, user_id: str) -> str:
        """Retrieves user's stored username from Supabase or SQLite."""
        if self.supabase:
            try:
                res = self.supabase.table("users").select("username").eq("user_id", user_id).execute()
                if res.data and len(res.data) > 0:
                    val = res.data[0].get("username")
                    if val:
                        return val.strip()
            except Exception as e:
                logger.debug(f"Supabase get_user_username notice: {e}")

        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT username FROM users WHERE user_id = ?", (user_id,))
                row = cursor.fetchone()
                if row and row[0]:
                    return row[0].strip()
        except Exception as e:
            logger.debug(f"SQLite get_user_username notice: {e}")

        return ""

    def update_username(self, user_id: str, username: str) -> Dict[str, Any]:
        """
        Updates the username for a user in the 'users' table and all historical records in 'analysis_history'
        in Supabase and SQLite. Also syncs with Firebase Admin user profile if available.
        """
        clean_username = (username or "").strip()

        # 1. Supabase update
        if self.supabase:
            try:
                self.supabase.table("users").update({"username": clean_username}).eq("user_id", user_id).execute()
                self.supabase.table("analysis_history").update({"username": clean_username}).eq("user_id", user_id).execute()
                logger.info(f"Supabase: Updated username to '{clean_username}' for user {user_id}")
            except Exception as e:
                logger.warning(f"Supabase update_username error: {e}")

        # 2. SQLite update
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE users SET username = ? WHERE user_id = ?", (clean_username, user_id))
                cursor.execute("UPDATE analysis_history SET username = ? WHERE user_id = ?", (clean_username, user_id))
                conn.commit()
                logger.info(f"SQLite: Updated username to '{clean_username}' for user {user_id}")
        except Exception as e:
            logger.error(f"SQLite update_username error: {e}")

        # 3. Firebase Admin profile sync (best effort)
        try:
            from firebase_admin import auth as fb_admin_auth
            fb_admin_auth.update_user(user_id, display_name=clean_username)
        except Exception as fb_err:
            logger.debug(f"Firebase Admin display_name update (optional): {fb_err}")

        return {"user_id": user_id, "username": clean_username}

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
        risk_explanation: str,
        file_name: str = "",
        username: Optional[str] = None,
        user_email: Optional[str] = None,
        is_flagged: bool = False
    ) -> Dict[str, Any]:
        """
        Saves analysis record in the user's isolated subspace and updates aggregate metrics.
        Attempts Supabase first, falls back to SQLite if Supabase is offline.
        """
        created_at_iso = datetime.now(timezone.utc).isoformat()
        is_spoof = (prediction == "AI_GENERATED" or fake_score >= 0.5)
        is_recorded = (mode == "record")
        norm_duration = max(0.0, round(duration, 2))

        # Resolve username: use provided or fetch from users table
        effective_username = (username or "").strip()
        if not effective_username:
            effective_username = self.get_user_username(user_id)

        resolved_email = user_email or f"{user_id}@voiceshield.internal"

        # Ensure user subspace exists first (fulfilling foreign key constraint)
        self.ensure_user(user_id=user_id, email=resolved_email, username=effective_username)

        saved_record = {
            "event_id": event_id,
            "user_id": user_id,
            "mode": mode,
            "duration": norm_duration,
            "model_name": model_name,
            "fake_score": round(fake_score, 4),
            "real_score": round(real_score, 4),
            "prediction": prediction,
            "context_risk": context_risk,
            "final_risk": final_risk,
            "risk_explanation": risk_explanation,
            "file_name": file_name,
            "username": effective_username,
            "user_email": resolved_email,
            "is_flagged": is_flagged,
            "created_at": created_at_iso
        }

        # Attempt Supabase
        if self.supabase:
            try:
                res = self.supabase.table("analysis_history").insert(saved_record).execute()
                if res.data:
                    logger.info(f"Record {event_id} stored in Supabase under user subspace {user_id}.")
                    
                    # Also update user subspace counters explicitly if trigger is absent
                    try:
                        u_res = self.supabase.table("users").select("*").eq("user_id", user_id).execute()
                        if u_res.data and len(u_res.data) > 0:
                            curr_u = u_res.data[0]
                            self.supabase.table("users").update({
                                "last_active_at": created_at_iso,
                                "total_audios_analyzed": curr_u.get("total_audios_analyzed", 0) + 1,
                                "total_time_analyzed": round(curr_u.get("total_time_analyzed", 0.0) + norm_duration, 2),
                                "total_recorded": curr_u.get("total_recorded", 0) + (1 if is_recorded else 0),
                                "total_uploaded": curr_u.get("total_uploaded", 0) + (1 if not is_recorded else 0),
                                "total_spoofs_detected": curr_u.get("total_spoofs_detected", 0) + (1 if is_spoof else 0)
                            }).eq("user_id", user_id).execute()
                    except Exception as counter_err:
                        logger.debug(f"User aggregate update in Supabase (may be handled by trigger): {counter_err}")

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
                        final_risk, risk_explanation, file_name, username, user_email, is_flagged, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event_id,
                    user_id,
                    mode,
                    norm_duration,
                    model_name,
                    round(fake_score, 4),
                    round(real_score, 4),
                    prediction,
                    json.dumps(context_risk),
                    final_risk,
                    risk_explanation,
                    file_name,
                    effective_username,
                    resolved_email,
                    1 if is_flagged else 0,
                    created_at_iso
                ))

                # Update user subspace counters in SQLite
                cursor.execute("""
                    UPDATE users SET
                        last_active_at = ?,
                        total_audios_analyzed = total_audios_analyzed + 1,
                        total_time_analyzed = total_time_analyzed + ?,
                        total_recorded = total_recorded + ?,
                        total_uploaded = total_uploaded + ?,
                        total_spoofs_detected = total_spoofs_detected + ?
                    WHERE user_id = ?
                """, (
                    created_at_iso,
                    norm_duration,
                    1 if is_recorded else 0,
                    1 if not is_recorded else 0,
                    1 if is_spoof else 0,
                    user_id
                ))

                conn.commit()
                logger.info(f"Record {event_id} saved to SQLite store in user subspace {user_id}.")
                return saved_record
        except Exception as e:
            logger.error(f"Failed to save record to SQLite: {e}")
            raise RuntimeError(f"Database persistence failure: {e}")

    def get_user_stats(self, user_id: str, email: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves user subspace metrics: join time, total audios analyzed,
        cumulative duration analyzed, recorded count, uploaded count, and spoof count.
        """
        # Ensure user exists
        user_info = self.ensure_user(user_id=user_id, email=email)

        # Attempt Supabase
        if self.supabase:
            try:
                res = self.supabase.table("users").select("*").eq("user_id", user_id).execute()
                if res.data and len(res.data) > 0:
                    item = res.data[0]
                    return {
                        "user_id": item.get("user_id", user_id),
                        "username": item.get("username", ""),
                        "email": item.get("email", email or ""),
                        "joined_at": item.get("joined_at"),
                        "last_active_at": item.get("last_active_at"),
                        "total_audios_analyzed": item.get("total_audios_analyzed", 0),
                        "total_time_analyzed": round(float(item.get("total_time_analyzed", 0.0)), 2),
                        "total_recorded": item.get("total_recorded", 0),
                        "total_uploaded": item.get("total_uploaded", 0),
                        "total_spoofs_detected": item.get("total_spoofs_detected", 0)
                    }
            except Exception as e:
                logger.warning(f"Supabase get_user_stats failed ({e}). Falling back to SQLite.")

        # SQLite retrieval
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
                row = cursor.fetchone()
                if row:
                    item = dict(row)
                    return {
                        "user_id": item.get("user_id", user_id),
                        "username": item.get("username", ""),
                        "email": item.get("email", email or ""),
                        "joined_at": item.get("joined_at"),
                        "last_active_at": item.get("last_active_at"),
                        "total_audios_analyzed": item.get("total_audios_analyzed", 0),
                        "total_time_analyzed": round(float(item.get("total_time_analyzed", 0.0)), 2),
                        "total_recorded": item.get("total_recorded", 0),
                        "total_uploaded": item.get("total_uploaded", 0),
                        "total_spoofs_detected": item.get("total_spoofs_detected", 0)
                    }
        except Exception as e:
            logger.error(f"Failed to fetch user stats from SQLite: {e}")

        return {
            "user_id": user_id,
            "username": user_info.get("username", ""),
            "email": email or "",
            "joined_at": user_info.get("joined_at"),
            "last_active_at": user_info.get("last_active_at"),
            "total_audios_analyzed": 0,
            "total_time_analyzed": 0.0,
            "total_recorded": 0,
            "total_uploaded": 0,
            "total_spoofs_detected": 0
        }

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
                    item["is_flagged"] = bool(item.get("is_flagged", 0))
                    item["file_name"] = item.get("file_name", "")
                    item["username"] = item.get("username", "")
                    item["user_email"] = item.get("user_email", "")
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
                    item = res.data[0]
                    item["is_flagged"] = bool(item.get("is_flagged", False))
                    item["file_name"] = item.get("file_name", "")
                    return item
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
                    item["is_flagged"] = bool(item.get("is_flagged", 0))
                    item["file_name"] = item.get("file_name", "")
                    return item
                return None
        except Exception as e:
            logger.error(f"Failed to lookup record in SQLite: {e}")
            return None

    def toggle_flag(self, event_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Toggles the is_flagged status for a specific analysis record belonging to the user.
        Returns {'event_id': event_id, 'is_flagged': bool} on success, or None if record not found.
        """
        new_flag_state = None

        # SQLite update
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT is_flagged FROM analysis_history
                    WHERE event_id = ? AND user_id = ?
                """, (event_id, user_id))
                row = cursor.fetchone()
                if row is not None:
                    current_flag = bool(row[0])
                    new_flag = 0 if current_flag else 1
                    cursor.execute("""
                        UPDATE analysis_history
                        SET is_flagged = ?
                        WHERE event_id = ? AND user_id = ?
                    """, (new_flag, event_id, user_id))
                    conn.commit()
                    new_flag_state = bool(new_flag)
                    logger.info(f"Toggled flag for record {event_id} in SQLite to {new_flag_state}")
        except Exception as e:
            logger.error(f"Failed to toggle flag in SQLite: {e}")

        # Supabase update if configured
        if self.supabase:
            try:
                if new_flag_state is None:
                    res = self.supabase.table("analysis_history").select("is_flagged").eq("event_id", event_id).eq("user_id", user_id).execute()
                    if res.data and len(res.data) > 0:
                        current = bool(res.data[0].get("is_flagged", False))
                        new_flag_state = not current
                
                if new_flag_state is not None:
                    self.supabase.table("analysis_history").update({"is_flagged": new_flag_state}).eq("event_id", event_id).eq("user_id", user_id).execute()
                    logger.info(f"Updated flag in Supabase for {event_id} to {new_flag_state}")
            except Exception as e:
                logger.warning(f"Failed to update flag in Supabase ({e})")

        if new_flag_state is not None:
            return {"event_id": event_id, "is_flagged": new_flag_state}
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

    def rename_analysis(self, event_id: str, user_id: str, file_name: str) -> Optional[Dict[str, Any]]:
        """
        Renames the file_name for an analysis record belonging to the authenticated user.
        Updates both SQLite and Supabase persistence stores.
        Returns {'event_id': event_id, 'file_name': clean_file_name} on success, or None if record not found.
        """
        clean_name = (file_name or "").strip()
        if not clean_name:
            return None

        updated = False

        # 1. Update SQLite
        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE analysis_history
                    SET file_name = ?
                    WHERE event_id = ? AND user_id = ?
                """, (clean_name, event_id, user_id))
                conn.commit()
                if cursor.rowcount > 0:
                    updated = True
                    logger.info(f"Updated file_name for record '{event_id}' in SQLite to '{clean_name}'")
        except Exception as e:
            logger.error(f"Failed to update file_name in SQLite: {e}")

        # 2. Update Supabase if configured
        if self.supabase:
            try:
                res = (
                    self.supabase.table("analysis_history")
                    .update({"file_name": clean_name})
                    .eq("event_id", event_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    updated = True
                    logger.info(f"Updated file_name for record '{event_id}' in Supabase to '{clean_name}'")
            except Exception as e:
                logger.warning(f"Failed to update file_name in Supabase ({e})")

        # 3. Fallback verification if rowcount check was bypassed
        if not updated:
            existing = self.get_analysis_by_id(event_id=event_id, user_id=user_id)
            if existing:
                updated = True

        if updated:
            return {"event_id": event_id, "file_name": clean_name}
        return None

history_service = HistoryService()

