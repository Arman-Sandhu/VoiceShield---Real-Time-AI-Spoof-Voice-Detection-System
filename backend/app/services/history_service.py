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
                if "detected_language" not in existing_cols:
                    cursor.execute("ALTER TABLE analysis_history ADD COLUMN detected_language TEXT DEFAULT 'English';")
                if "transcript" not in existing_cols:
                    cursor.execute("ALTER TABLE analysis_history ADD COLUMN transcript TEXT DEFAULT '';")
                
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

    def is_email_taken(self, email: str, exclude_user_id: Optional[str] = None) -> bool:
        clean_email = (email or "").strip().lower()
        if not clean_email:
            return False

        if self.supabase:
            try:
                res = self.supabase.table("users").select("user_id").ilike("email", clean_email).execute()
                if res.data:
                    for u in res.data:
                        if u.get("user_id") != exclude_user_id:
                            return True
            except Exception:
                pass

        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = ?", (clean_email,))
                rows = cursor.fetchall()
                for r in rows:
                    if r[0] != exclude_user_id:
                        return True
        except Exception:
            pass

        try:
            from firebase_admin import auth as fb_admin_auth
            fb_user = fb_admin_auth.get_user_by_email(clean_email)
            if fb_user and fb_user.uid != exclude_user_id:
                return True
        except Exception:
            pass

        return False

    def _send_email_otp(self, to_email: str, otp: str, purpose: str = "password") -> bool:
        """
        Dispatches a 6-digit OTP email using SMTP if configured in environment variables.
        Gracefully logs OTP and returns False if SMTP credentials are not configured or on network error.
        """
        import os, smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        smtp_host = os.environ.get("SMTP_HOST")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        smtp_from = os.environ.get("SMTP_FROM", smtp_user or "noreply@voiceshield.ai")

        subject_action = "Set or Change Account Password" if purpose == "password" else "Verify Email Address"
        subject = f"[VoiceShield] Your Verification Code: {otp}"

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
    .header {{ text-align: center; margin-bottom: 24px; }}
    .logo {{ font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #00d4ff; }}
    .logo span {{ color: #ffffff; }}
    .title {{ font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 12px; }}
    .otp-box {{ background: #1e293b; border: 2px dashed #00d4ff; border-radius: 12px; text-align: center; padding: 18px; margin: 24px 0; }}
    .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #00d4ff; }}
    .warning {{ font-size: 13px; color: #94a3b8; line-height: 1.6; margin-top: 20px; border-top: 1px solid #1f2937; padding-top: 16px; }}
    .footer {{ text-align: center; margin-top: 24px; font-size: 11px; color: #64748b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">VOICE<span>SHIELD</span></div>
      <div class="title">{subject_action}</div>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      You requested a verification code to <strong>{subject_action.lower()}</strong> on your VoiceShield account.
    </p>
    <div class="otp-box">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
      <div class="otp-code">{otp}</div>
    </div>
    <p style="font-size: 13px; color: #94a3b8; text-align: center;">
      This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
    </p>
    <div class="warning">
      <strong>Security Notice:</strong> VoiceShield staff will never ask for your password or verification code. If you did not initiate this request, you can safely ignore this email.
    </div>
    <div class="footer">
      &copy; VoiceShield AI Cyber Defense System. All rights reserved.
    </div>
  </div>
</body>
</html>"""
        text_body = f"VoiceShield Verification Code\n\nYour 6-digit verification code to {subject_action.lower()} is: {otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email."

        if not (smtp_host and smtp_user and smtp_password):
            logger.info(f"[EmailOTP] SMTP not configured. OTP generated for {to_email}: {otp}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"VoiceShield Security <{smtp_from}>"
            msg["To"] = to_email
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_from, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                    try:
                        server.starttls()
                    except Exception:
                        pass
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_from, [to_email], msg.as_string())
            logger.info(f"[EmailOTP] Successfully dispatched OTP email to {to_email}")
            return True
        except Exception as e:
            logger.warning(f"[EmailOTP] Failed to send email via SMTP: {e}. OTP was: {otp}")
            return False

    def generate_email_otp(self, user_id: str, new_email: str) -> str:
        import secrets, time
        clean_email = new_email.strip().lower()
        otp = str(secrets.randbelow(900000) + 100000)
        if not hasattr(self, "_email_otp_cache"):
            self._email_otp_cache = {}
        self._email_otp_cache[user_id] = {
            "email": clean_email,
            "otp": otp,
            "expires_at": time.time() + 600
        }
        logger.info(f"[EmailChangeOTP] Generated OTP for user {user_id} -> {clean_email}: {otp}")
        self._send_email_otp(to_email=clean_email, otp=otp, purpose="email")
        return otp

    def generate_password_otp(self, user_id: str, email: str) -> str:
        import secrets, time
        clean_email = email.strip().lower()
        otp = str(secrets.randbelow(900000) + 100000)
        if not hasattr(self, "_password_otp_cache"):
            self._password_otp_cache = {}
        self._password_otp_cache[user_id] = {
            "email": clean_email,
            "otp": otp,
            "expires_at": time.time() + 600
        }
        logger.info(f"[PasswordOTP] Generated OTP for user {user_id} -> {clean_email}: {otp}")
        self._send_email_otp(to_email=clean_email, otp=otp, purpose="password")
        return otp

    def verify_password_otp(self, user_id: str, email: str, otp: str) -> bool:
        import time
        if not hasattr(self, "_password_otp_cache"):
            return False
        record = self._password_otp_cache.get(user_id)
        if not record:
            return False
        if time.time() > record["expires_at"]:
            del self._password_otp_cache[user_id]
            return False
        if record["email"] != email.strip().lower() or record["otp"] != otp.strip():
            return False

        del self._password_otp_cache[user_id]
        return True

    def update_user_password(self, user_id: str, new_password: str) -> Dict[str, Any]:
        clean_pw = (new_password or "").strip()
        if len(clean_pw) < 6:
            raise ValueError("Password must be at least 6 characters long.")

        try:
            from firebase_admin import auth as fb_admin_auth
            fb_admin_auth.update_user(user_id, password=clean_pw)
            logger.info(f"[PasswordUpdate] Successfully updated password for user {user_id}")
            return {"status": "success", "message": "Password updated successfully."}
        except Exception as e:
            logger.error(f"[PasswordUpdate] Error updating password for user {user_id}: {e}")
            raise

    def verify_email_otp(self, user_id: str, new_email: str, otp: str) -> bool:
        import time
        if not hasattr(self, "_email_otp_cache"):
            return False
        record = self._email_otp_cache.get(user_id)
        if not record:
            return False
        if time.time() > record["expires_at"]:
            del self._email_otp_cache[user_id]
            return False
        if record["email"] != new_email.strip().lower() or record["otp"] != otp.strip():
            return False

        del self._email_otp_cache[user_id]
        return True

    def update_email(self, user_id: str, new_email: str) -> Dict[str, Any]:
        clean_email = (new_email or "").strip().lower()
        if not clean_email:
            raise ValueError("Email cannot be empty.")

        if self.supabase:
            try:
                self.supabase.table("users").update({"email": clean_email}).eq("user_id", user_id).execute()
                self.supabase.table("analysis_history").update({"user_email": clean_email}).eq("user_id", user_id).execute()
                logger.info(f"Supabase: Updated email to '{clean_email}' for user {user_id}")
            except Exception as e:
                logger.warning(f"Supabase update_email error: {e}")

        try:
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE users SET email = ? WHERE user_id = ?", (clean_email, user_id))
                cursor.execute("UPDATE analysis_history SET user_email = ? WHERE user_id = ?", (clean_email, user_id))
                conn.commit()
                logger.info(f"SQLite: Updated email to '{clean_email}' for user {user_id}")
        except Exception as e:
            logger.error(f"SQLite update_email error: {e}")

        try:
            from firebase_admin import auth as fb_admin_auth
            fb_admin_auth.update_user(user_id, email=clean_email)
            logger.info(f"Firebase Admin: Updated email to '{clean_email}' for user {user_id}")
        except Exception as fb_err:
            logger.debug(f"Firebase Admin email update notice: {fb_err}")

        return {"user_id": user_id, "email": clean_email}

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
        detected_language: str = "English",
        transcript: str = "",
        is_flagged: bool = False
    ) -> Dict[str, Any]:
        created_at_iso = datetime.now(timezone.utc).isoformat()
        is_spoof = (prediction == "AI_GENERATED" or fake_score >= 0.5)
        is_recorded = (mode == "record")
        norm_duration = max(0.0, round(duration, 2))

        effective_username = (username or "").strip()
        if not effective_username:
            effective_username = self.get_user_username(user_id)

        resolved_email = user_email or f"{user_id}@voiceshield.internal"

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
            "detected_language": detected_language,
            "transcript": transcript,
            "is_flagged": is_flagged,
            "created_at": created_at_iso
        }

        # Attempt Supabase
        if self.supabase:
            try:
                supabase_record = {
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
                    "language": detected_language,
                    "is_flagged": is_flagged,
                    "created_at": created_at_iso
                }
                res = self.supabase.table("analysis_history").insert(supabase_record).execute()
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
                        final_risk, risk_explanation, file_name, username, user_email,
                        detected_language, transcript, is_flagged, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    detected_language,
                    transcript,
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
                    for row in res.data:
                        if not row.get("detected_language") and row.get("language"):
                            row["detected_language"] = row["language"]
                        if not row.get("transcript"):
                            row["transcript"] = ""
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
                    item["detected_language"] = item.get("detected_language") or "English"
                    item["transcript"] = item.get("transcript") or ""
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
                    if not item.get("detected_language") and item.get("language"):
                        item["detected_language"] = item["language"]
                    if not item.get("transcript"):
                        item["transcript"] = ""
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

