"""Profile management endpoints for WealthWise."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user_id
from database import get_db_connection

router = APIRouter(prefix="/profile", tags=["profile"])

class ProfileUpdate(BaseModel):
    """Request model for updating profile information."""
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    theme: Optional[str] = None


@router.get("/")
def get_profile(user_id: str = Depends(get_current_user_id)):
    """Get the current user's profile information."""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT user_id, name, email, avatar_url, theme
                    FROM user_profiles
                    WHERE user_id = %s
                    """,
                    (user_id,),
                )
                row = cur.fetchone()

                if not row:
                    cur.execute(
                        """
                        INSERT INTO user_profiles (user_id, name, theme)
                        VALUES (%s, %s, %s)
                        RETURNING user_id, name, email, avatar_url, theme
                        """,
                        (user_id, "User", "light"),
                    )
                    conn.commit()
                    row = cur.fetchone()

                return {
                    "user_id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "avatar_url": row[3],
                    "theme": row[4] or "light",
                }
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load profile: {str(exc)}",
        )


@router.put("/")
def update_profile(
    profile_data: ProfileUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update the current user's profile information."""
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM user_profiles WHERE user_id = %s",
                    (user_id,),
                )
                exists = cur.fetchone() is not None

                if not exists:
                    cur.execute(
                        """
                        INSERT INTO user_profiles (user_id, name, email, avatar_url, theme)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING user_id, name, email, avatar_url, theme
                        """,
                        (
                            user_id,
                            profile_data.name or "User",
                            profile_data.email,
                            profile_data.avatar_url,
                            profile_data.theme or "light",
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()
                else:
                    cur.execute(
                        """
                        UPDATE user_profiles
                        SET name = COALESCE(%s, name),
                            email = COALESCE(%s, email),
                            avatar_url = COALESCE(%s, avatar_url),
                            theme = COALESCE(%s, theme),
                            updated_at = NOW()
                        WHERE user_id = %s
                        RETURNING user_id, name, email, avatar_url, theme
                        """,
                        (
                            profile_data.name,
                            profile_data.email,
                            profile_data.avatar_url,
                            profile_data.theme,
                            user_id,
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()

                return {
                    "user_id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "avatar_url": row[3],
                    "theme": row[4] or "light",                }
        finally:
            conn.close()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(exc)}",
        )


@router.get("/stats")
def get_profile_stats(user_id: str = Depends(get_current_user_id)):
    """Get user's financial statistics for profile display."""
    # Return default stats - actual stats on Dashboard page
    return {
        "transaction_count": 0,
        "budget_count": 0,
        "goal_count": 0,
        "total_income": 0,
        "total_expenses": 0,
        "net_savings": 0,
        "account_created": None
    }