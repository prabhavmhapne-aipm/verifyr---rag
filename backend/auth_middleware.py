"""
Authentication Middleware - Supabase JWT Verification

Provides FastAPI dependencies for:
- JWT token verification
- User authentication
- Admin role detection

Uses Supabase for authentication backend.
"""

import os
from typing import Optional
from dataclasses import dataclass

from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ENABLE_SIGNUP = os.getenv("ENABLE_SIGNUP", "true").lower() == "true"

# Extract JWT secret from Supabase URL (project reference)
# Supabase JWT secret is derived from the project reference
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Security scheme for Bearer token
security = HTTPBearer(auto_error=False)


@dataclass
class AuthUser:
    """Authenticated user information."""
    id: str
    email: str
    is_admin: bool = False
    raw_token: Optional[str] = None


def get_supabase_jwt_secret() -> str:
    """
    Get the JWT secret for Supabase token verification.

    Supabase uses the project's JWT secret which can be found in:
    Project Settings > API > JWT Secret

    For local development, you can also use the anon key to decode tokens
    with audience verification disabled.
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

    try:
        # Decode the JWT token
        # Supabase tokens use HS256 algorithm
        # Note: In production, verify with proper JWT secret from Supabase dashboard
        jwt_secret = get_supabase_jwt_secret()

        # Decode and verify the JWT token
        # SECURITY: Always verify signature - never skip verification
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
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

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
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
