import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin
cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', './firebase-admin.json')
try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        print(f"Warning: Firebase credentials not found at {cred_path}. Auth will fail until provided.")
except Exception as e:
    print(f"Error initializing Firebase admin: {e}")

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verify the Firebase ID token from the Bearer header.
    Returns the decoded token dictionary.
    """
    token = credentials.credentials
    try:
        # In a real app, verify_id_token checks expiration, signature, etc.
        decoded_token = auth.verify_id_token(token)
        # Check email verification if required by rules
        if not decoded_token.get('email_verified', False):
            # We enforce email verified true
            raise HTTPException(status_code=403, detail="Email not verified")
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication credentials: {e}")

async def verify_ws_token(token: str):
    """
    Verify the Firebase ID token for websockets
    """
    try:
        decoded_token = auth.verify_id_token(token)
        if not decoded_token.get('email_verified', False):
            return None
        return decoded_token
    except Exception:
        return None
