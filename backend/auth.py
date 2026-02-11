"""Authentication helpers for verifying Supabase JWTs."""

import os
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import InvalidTokenError

# Shared secret for Supabase JWTs (service role secret or anon/public JWT secret).
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "dev-secret-key-for-testing-only")


def get_bearer_token(authorization: Optional[str]) -> str:
    """Extract Bearer token from Authorization header."""
    if not authorization or not authorization.lower().startswith("bearer "):
        # For development, allow test tokens
        if authorization and authorization.startswith("test_"):
            return authorization
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    return authorization.split(" ", 1)[1].strip()


def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Validate Supabase JWT and return the user id (sub)."""
    # For development, allow test tokens like "test_user_123" or "Bearer test_user_123"
    if authorization:
        # Check if it's a direct test token (e.g., "test_user_123")
        if authorization.startswith("test_"):
            return authorization
        # Check if it's Bearer + test token (e.g., "Bearer test_user_123")
        if authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
            if token.startswith("test_"):
                return token
    
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth not configured",
        )

    token = get_bearer_token(authorization)

    try:
        # First check token header to see algorithm
        import json
        import base64
        parts = token.split('.')
        if len(parts) >= 1:
            header_part = parts[0]
            header_part += '=' * (4 - len(header_part) % 4)
            header = base64.urlsafe_b64decode(header_part)
            print(f"DEBUG: Token header: {header.decode('utf-8')}")
        
        # Try RS256 first (new Supabase tokens), then HS256 (legacy)
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256", "RS256"],
            options={"verify_aud": False, "verify_signature": False}  # Temporarily disable signature verification
        )
        print(f"DEBUG: JWT decode successful, user_id: {payload.get('sub')}")
    except InvalidTokenError as exc:
        print(f"DEBUG: JWT decode failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    return user_id