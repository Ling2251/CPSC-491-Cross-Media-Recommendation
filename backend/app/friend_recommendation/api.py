"""HTTP endpoints for authenticated friend recommendations."""

import os
from typing import Dict, List, Optional

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException

from .database_service import UserNotFoundError, connect_database
from .recommendation_service import recalculate_friend_recommendations
from .similarity import rank_candidates
from .similarity_test_data import ALL_TEST_USERS, USER_A


router = APIRouter(
    prefix="/api/friend-recommendations",
    tags=["friend recommendations"],
)


def get_authenticated_user_id(
    authorization: Optional[str] = Header(default=None),
) -> int:
    """Validate the Express API's HS256 bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise HTTPException(
            status_code=500,
            detail="Authentication is not configured",
        )

    try:
        payload = jwt.decode(
            authorization[7:],
            secret,
            algorithms=["HS256"],
        )
    except jwt.InvalidTokenError as error:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        ) from error

    user_id = payload.get("userId")
    if (
        isinstance(user_id, bool)
        or not isinstance(user_id, int)
        or user_id < 1
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication identity",
        )

    return user_id


def _format_recommendations(
    candidates: List[Dict[str, object]],
) -> List[Dict[str, object]]:
    if not candidates:
        return []

    if all("username" in candidate for candidate in candidates):
        names_by_id = {
            candidate["user_id"]: candidate["username"]
            for candidate in candidates
        }
    else:
        candidate_ids = [
            candidate["user_id"] for candidate in candidates
        ]
        connection = connect_database()
        try:
            rows = connection.execute(
                """
                SELECT id, name
                FROM users
                WHERE account_state = 'active' AND id = ANY(%s)
                """,
                (candidate_ids,),
            ).fetchall()
        finally:
            connection.close()

        names_by_id = {row[0]: row[1] for row in rows}

    media_labels = {
        "video": "movies",
        "audio": "music",
        "text": "books",
    }

    formatted = []
    for candidate in candidates:
        user_id = candidate["user_id"]
        username = names_by_id.get(user_id)
        if username is None:
            continue

        candidate_scores = candidate["scores"]
        scores = {
            media_type: candidate_scores[media_type]
            for media_type in media_labels
        }
        formatted.append(
            {
                "user_id": user_id,
                "username": username,
                "similarity_score": candidate["similarity_score"],
                "scores": scores,
                "media_types": [
                    media_labels[media_type]
                    for media_type, score in scores.items()
                    if score > 0
                ],
                "shared_tags": candidate["shared_tags"],
            }
        )

    return formatted


@router.post("/recalculate")
def recalculate_recommendations(
    user_id: int = Depends(get_authenticated_user_id),
) -> Dict[str, object]:
    try:
        candidates = recalculate_friend_recommendations(user_id)
    except UserNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {
        "user_id": user_id,
        "recommendations": _format_recommendations(candidates),
    }


@router.get("/demo")
def get_demo_recommendations() -> Dict[str, object]:
    """Rank the built-in sample profiles for the no-login frontend preview."""
    candidates = rank_candidates(
        USER_A["preferences"],
        ALL_TEST_USERS,
        current_user_id=USER_A["user_id"],
    )
    return {
        "user_id": USER_A["user_id"],
        "recommendations": _format_recommendations(candidates),
    }
