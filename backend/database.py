import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")

if url and key:
    supabase: Client = create_client(url, key)
else:
    supabase = None
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Database operations will fail.")

def init_db():
    # Database initialization is now handled directly in Supabase (running the schema SQL)
    pass

def log_event(event_id, user_id, mode, duration, voice_score, language, context_risk, final_risk):
    if not supabase:
        print("Error: Supabase client not initialized.")
        return
        
    try:
        data, count = supabase.table('analysis_history').insert({
            "event_id": event_id,
            "user_id": user_id,
            "mode": mode,
            "duration": duration,
            "voice_score": voice_score,
            "language": language,
            "context_risk": context_risk,
            "final_risk": final_risk
        }).execute()
        return data
    except Exception as e:
        print(f"Error logging to Supabase: {e}")
        return None

def get_history(user_id=None):
    if not supabase:
        print("Error: Supabase client not initialized.")
        return []
        
    try:
        query = supabase.table('analysis_history').select('*').order('created_at', desc=True).limit(100)
        
        if user_id:
            query = query.eq('user_id', user_id)
            
        result = query.execute()
        return result.data
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
        return []
