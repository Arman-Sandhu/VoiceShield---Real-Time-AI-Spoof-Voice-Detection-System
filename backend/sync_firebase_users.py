import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

load_dotenv()

import firebase_admin
from firebase_admin import credentials, auth
from app.core.config import settings
from app.services.history_service import history_service

def sync_firebase_users(remove_orphaned_random_users: bool = False):
    """
    Fetches all registered user accounts from Firebase Authentication
    and synchronizes them directly into the Supabase 'users' table with
    their exact email, UID, and real account creation/join timestamp.
    """
    print("=" * 65)
    print(" VoiceShield: Firebase Auth -> Supabase User Subspace Sync")
    print("=" * 65)

    # 1. Initialize Firebase Admin
    if not firebase_admin._apps:
        if settings.FIREBASE_CREDENTIALS_PATH.exists():
            cred = credentials.Certificate(str(settings.FIREBASE_CREDENTIALS_PATH))
            firebase_admin.initialize_app(cred)
            print(f"[+] Firebase Admin initialized from: {settings.FIREBASE_CREDENTIALS_PATH}")
        else:
            print(f"[!] Error: Firebase credentials file not found at {settings.FIREBASE_CREDENTIALS_PATH}")
            return

    # 2. Check Supabase connection
    sb = history_service.supabase
    if not sb:
        print("[!] Warning: Supabase client not initialized. Will sync to local SQLite only.")
    else:
        print(f"[+] Connected to Supabase endpoint: {settings.SUPABASE_URL}")

    # 3. Retrieve all users from Firebase Auth
    firebase_users = []
    try:
        page = auth.list_users()
        while page:
            for u in page.users:
                firebase_users.append(u)
            page = page.get_next_page()
    except Exception as e:
        print(f"[!] Failed to list Firebase users: {e}")
        return

    print(f"\n[+] Found {len(firebase_users)} registered user(s) in Firebase Authentication:")
    for idx, u in enumerate(firebase_users, 1):
        created_dt = (
            datetime.fromtimestamp(u.user_metadata.creation_timestamp / 1000.0, tz=timezone.utc).isoformat()
            if u.user_metadata and u.user_metadata.creation_timestamp
            else datetime.now(timezone.utc).isoformat()
        )
        print(f"  {idx}. Email: {u.email} | UID: {u.uid} | Joined: {created_dt}")

    # 4. Upsert each Firebase user into Supabase and SQLite
    valid_uids = set()
    synced_count = 0

    for u in firebase_users:
        valid_uids.add(u.uid)
        creation_iso = (
            datetime.fromtimestamp(u.user_metadata.creation_timestamp / 1000.0, tz=timezone.utc).isoformat()
            if u.user_metadata and u.user_metadata.creation_timestamp
            else datetime.now(timezone.utc).isoformat()
        )
        last_sign_in_iso = (
            datetime.fromtimestamp(u.user_metadata.last_sign_in_timestamp / 1000.0, tz=timezone.utc).isoformat()
            if u.user_metadata and u.user_metadata.last_sign_in_timestamp
            else creation_iso
        )

        clean_display_name = (u.display_name or "").strip()
        user_payload = {
            "user_id": u.uid,
            "username": clean_display_name,
            "email": u.email or f"{u.uid}@voiceshield.internal",
            "joined_at": creation_iso,
            "last_active_at": last_sign_in_iso
        }

        # Sync to Supabase
        if sb:
            try:
                # Check existing stats in Supabase to preserve them
                existing = sb.table("users").select("*").eq("user_id", u.uid).execute()
                if existing.data and len(existing.data) > 0:
                    update_dict = {
                        "email": u.email,
                        "joined_at": creation_iso,
                        "last_active_at": last_sign_in_iso
                    }
                    if clean_display_name:
                        update_dict["username"] = clean_display_name
                    sb.table("users").update(update_dict).eq("user_id", u.uid).execute()
                else:
                    user_payload.update({
                        "total_audios_analyzed": 0,
                        "total_time_analyzed": 0.0,
                        "total_recorded": 0,
                        "total_uploaded": 0,
                        "total_spoofs_detected": 0
                    })
                    sb.table("users").upsert(user_payload, on_conflict="user_id").execute()
                synced_count += 1
            except Exception as sb_err:
                print(f"[!] Failed to upsert user {u.uid} to Supabase: {sb_err}")

        # Sync to SQLite
        try:
            import sqlite3
            with sqlite3.connect(settings.SQLITE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO users (
                        user_id, username, email, joined_at, last_active_at,
                        total_audios_analyzed, total_time_analyzed,
                        total_recorded, total_uploaded, total_spoofs_detected
                    ) VALUES (?, ?, ?, ?, ?, 0, 0.0, 0, 0, 0)
                    ON CONFLICT(user_id) DO UPDATE SET
                        username = CASE WHEN excluded.username <> '' THEN excluded.username ELSE users.username END,
                        email = excluded.email,
                        joined_at = excluded.joined_at,
                        last_active_at = excluded.last_active_at
                """, (u.uid, clean_display_name, u.email, creation_iso, last_sign_in_iso))
                conn.commit()
        except Exception as sql_err:
            print(f"[!] SQLite sync error for {u.uid}: {sql_err}")

    print(f"\n[+] Successfully synchronized {synced_count} real Firebase user(s) into database.")

    # 5. Clean up random/orphaned test mock users if requested
    if remove_orphaned_random_users and sb:
        try:
            existing_rows = sb.table("users").select("user_id, email").execute()
            if existing_rows.data:
                orphans = [row for row in existing_rows.data if row["user_id"] not in valid_uids]
                if orphans:
                    print(f"\n[*] Found {len(orphans)} mock/test user(s) not in Firebase:")
                    for o in orphans:
                        print(f"    - Deleting mock user: {o['user_id']} ({o.get('email')})")
                        sb.table("users").delete().eq("user_id", o["user_id"]).execute()
                    print("[+] Removed mock/test records from database.")
        except Exception as del_err:
            print(f"[!] Error pruning mock users: {del_err}")

    print("\n" + "=" * 65)
    print(" Sync Completed Successfully!")
    print("=" * 65)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Sync Firebase users to Supabase")
    parser.add_argument(
        "--clean-random", 
        action="store_true", 
        help="Remove mock/random users that do not exist in Firebase Auth"
    )
    args = parser.parse_args()
    sync_firebase_users(remove_orphaned_random_users=args.clean_random)
