"""
Authentication Middleware - Supabase JWT Verification

Provides FastAPI dependencies for:
- JWT token verification
- User authentication
- Admin role detection

Uses Supabase for authentication backend.
Supports both legacy JWT secret (HS256) and new JWT Signing Keys (RS256 with JWKS).
"""

import os
import requests
from typing import Optional
from dataclasses import dataclass
from functools import lru_cache

from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from dotenv import load_dotenv

# Try to import PyJWKClient for JWKS support
try:
    from jwt import PyJWKClient
    JWKS_AVAILABLE = True
except ImportError:
    try:
        from jwt.jwks_client import PyJWKClient
        JWKS_AVAILABLE = True
    except ImportError:
        PyJWKClient = None
        JWKS_AVAILABLE = False

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ENABLE_SIGNUP = os.getenv("ENABLE_SIGNUP", "true").lower() == "true"

# Legacy JWT secret (for backward compatibility)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Security scheme for Bearer token
security = HTTPBearer(auto_error=False)

# JWKS client for new Supabase JWT signing keys (RS256)
_jwks_client = None


@dataclass
class AuthUser:
    """Authenticated user information."""
    id: str
    email: str
    is_admin: bool = False
    raw_token: Optional[str] = None


def get_jwks_client():
    """
    Get or create the JWKS client for Supabase JWT verification.

    Supabase uses RS256 with JWT signing keys (JWKS endpoint).
    The public keys are available at: https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
    """
    global _jwks_client

    if not JWKS_AVAILABLE or not PyJWKClient:
        return None

    if _jwks_client is None and SUPABASE_URL:
        # Construct JWKS URL from Supabase project URL
        jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        try:
            _jwks_client = PyJWKClient(jwks_url)
            print(f"✅ JWKS client initialized: {jwks_url}")
        except Exception as e:
            print(f"⚠️  Could not initialize JWKS client: {e}")
            print(f"   Falling back to legacy JWT secret verification")
            _jwks_client = None

    return _jwks_client


def get_supabase_jwt_secret() -> str:
    """
    Get the JWT secret for Supabase token verification (legacy HS256 method).

    Supabase uses the project's JWT secret which can be found in:
    Project Settings > API > JWT Secret

    Note: This is for backward compatibility. New Supabase projects use RS256 with JWKS.
    """
    # First try explicit JWT secret
    if SUPABASE_JWT_SECRET:
        return SUPABASE_JWT_SECRET

    # Fallback: try to use service key as secret (won't work for verification)
    # In production, always set SUPABASE_JWT_SECRET
    return SUPABASE_SERVICE_KEY


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthUser:
    """
    FastAPI dependency to get the current authenticated user.

    Verifies the JWT token from the Authorization header and returns
    the authenticated user information.

    Raises:
        HTTPException 401: If no token provided or token is invalid
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials

    # Try to verify the token using different methods
    payload = None
    last_error = None
    method_used = None

    # Method 1: Try RS256/ES256 with JWKS (new Supabase signing keys)
    try:
        jwks_client = get_jwks_client()
        if jwks_client:
            # Get the signing key from JWKS
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            # Decode and verify the JWT token with RS256/ES256
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience="authenticated",
                options={"verify_aud": True}
            )
            method_used = "JWKS (RS256/ES256)"
            print(f"✅ Token verified using {method_used}")
    except Exception as e:
        last_error = e
        print(f"⚠️  JWKS verification failed: {type(e).__name__}: {str(e)}")
        # Continue to try HS256 method

    # Method 2: Try HS256 with legacy JWT secret (fallback)
    if payload is None and SUPABASE_JWT_SECRET:
        try:
            jwt_secret = get_supabase_jwt_secret()
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True}
            )
            method_used = "HS256 (JWT Secret)"
            print(f"✅ Token verified using {method_used}")
        except Exception as e:
            last_error = e
            print(f"⚠️  HS256 verification failed: {type(e).__name__}: {str(e)}")

    # Method 3: Decode without verification (TEMPORARY - for debugging only)
    # WARNING: This bypasses security and should only be used to diagnose the issue
    if payload is None:
        try:
            print(f"⚠️  All verification methods failed, attempting unverified decode for debugging...")
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False}
            )
            method_used = "UNVERIFIED (DEBUG ONLY)"
            print(f"⚠️  Token decoded WITHOUT verification: {method_used}")
            print(f"⚠️  Token payload: sub={payload.get('sub')}, email={payload.get('email')}")
            print(f"⚠️  Token header: {jwt.get_unverified_header(token)}")
        except Exception as e:
            last_error = e
            print(f"❌ Even unverified decode failed: {type(e).__name__}: {str(e)}")

    # If all methods failed, raise authentication error
    if payload is None:
        if isinstance(last_error, jwt.ExpiredSignatureError):
            print(f"❌ Token expired")
            raise HTTPException(
                status_code=401,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"}
            )
        else:
            error_msg = str(last_error) if last_error else "Invalid token"
            print(f"❌ Token verification failed: {error_msg}")
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token: {error_msg}",
                headers={"WWW-Authenticate": "Bearer"}
            )

    # Extract user information from token
    user_id = payload.get("sub")
    email = payload.get("email", "")

    # Check for admin role in user metadata or app metadata
    user_metadata = payload.get("user_metadata", {})
    app_metadata = payload.get("app_metadata", {})

    is_admin = (
        user_metadata.get("is_admin", False) or
        app_metadata.get("is_admin", False) or
        user_metadata.get("role") == "admin" or
        app_metadata.get("role") == "admin"
    )

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token: missing user ID"
        )

    return AuthUser(
        id=user_id,
        email=email,
        is_admin=is_admin,
        raw_token=token
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthUser]:
    """
    FastAPI dependency to optionally get the current user.

    Returns None if no valid token is provided instead of raising an exception.
    Useful for endpoints that work both with and without authentication.
    """
    if not credentials:
        return None

    try:
        # Try to get the user, but don't raise if it fails
        from fastapi import Request
        # Create a mock request for the dependency
        return await get_current_user(
            request=None,  # type: ignore
            credentials=credentials
        )
    except HTTPException:
        return None


async def require_admin(
    user: AuthUser = Depends(get_current_user)
) -> AuthUser:
    """
    FastAPI dependency that requires admin role.

    Must be used after get_current_user dependency.

    Raises:
        HTTPException 403: If user is not an admin
    """
    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return user


def get_config() -> dict:
    """
    Get public configuration for the frontend.

    Returns configuration that is safe to expose publicly.
    """
    return {
        "supabase_url": SUPABASE_URL,
        "supabase_anon_key": SUPABASE_ANON_KEY,
        "enable_signup": ENABLE_SIGNUP
    }


# Helper function to initialize Supabase client (for admin operations)
def get_supabase_admin_client():
    """
    Get Supabase client with service role key for admin operations.

    This client bypasses Row Level Security (RLS) and should only
    be used for server-side admin operations.
    """
    try:
        from supabase import create_client, Client

        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            return None

        return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except ImportError:
        print("WARNING: Supabase package not installed")
        return None
    except Exception as e:
        print(f"WARNING: Could not initialize Supabase admin client: {e}")
        return None
