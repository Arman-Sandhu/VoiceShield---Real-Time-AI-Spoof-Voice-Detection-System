import logging
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth

from app.core.config import settings

logger = logging.getLogger("voiceshield.security")

# Initialize Firebase Admin SDK
_firebase_initialized = False

try:
    if settings.FIREBASE_CREDENTIALS_PATH.exists():
        cred = credentials.Certificate(str(settings.FIREBASE_CREDENTIALS_PATH))
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info(f"Firebase Admin SDK initialized with certificate at: {settings.FIREBASE_CREDENTIALS_PATH}")
    else:
        logger.warning(
            f"Firebase service account file not found at '{settings.FIREBASE_CREDENTIALS_PATH}'. "
            "Backend token verification will fail until credentials are provided."
        )
except ValueError:
    # Already initialized
    _firebase_initialized = True
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {e}")

security_scheme = HTTPBearer(auto_error=False)

def verify_token(credentials_header: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)) -> Dict[str, Any]:
    """
    Verifies Firebase ID token from the Bearer Authorization header.
    Extracts the authenticated user's verified UID.
    """
    if not credentials_header or not credentials_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials_header.credentials

    if not _firebase_initialized:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service unavailable. Firebase Admin credentials not loaded."
        )

    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        email = decoded_token.get("email")
        email_verified = decoded_token.get("email_verified", False)

        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing UID."
            )

        name = decoded_token.get("name") or decoded_token.get("display_name")

        return {
            "uid": uid,
            "email": email,
            "name": name,
            "email_verified": email_verified,
            "decoded": decoded_token
        }
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again."
        )
    except auth.InvalidIdTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}"
        )
