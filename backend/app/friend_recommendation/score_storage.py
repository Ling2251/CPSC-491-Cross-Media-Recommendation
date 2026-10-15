"""Persistence helpers for calculated user-to-user similarity scores."""

import math
from typing import Any, Callable, Dict, List, Optional, Sequence

from .database_service import connect_database


_UPSERT_SCORE_SQL = """
    INSERT INTO friend_similarity_scores (
        user_id,
        candidate_user_id,
        overall_score,
        video_score,
        audio_score,
        text_score,
        calculated_at
    )
    VALUES (%s, %s, %s, %s, %s, %s, now())
    ON CONFLICT (user_id, candidate_user_id)
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        video_score = EXCLUDED.video_score,
        audio_score = EXCLUDED.audio_score,
        text_score = EXCLUDED.text_score,
        calculated_at = now()
"""

_DELETE_USER_SCORES_SQL = """
    DELETE FROM friend_similarity_scores
    WHERE user_id = %s
"""

_GET_RANKED_SCORES_SQL = """
    SELECT
        candidate_user_id,
        overall_score,
        video_score,
        audio_score,
        text_score,
        calculated_at
    FROM friend_similarity_scores
    WHERE user_id = %s
    ORDER BY overall_score DESC, candidate_user_id ASC
    LIMIT %s
"""


def _validate_score(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a number between 0 and 1")
    if not math.isfinite(value) or value < 0.0 or value > 1.0:
        raise ValueError(f"{field} must be a number between 0 and 1")
    return float(value)


def _validate_user_id(user_id: Any, field: str) -> int:
    if (
        isinstance(user_id, bool)
        or not isinstance(user_id, int)
        or user_id < 1
    ):
        raise ValueError(f"{field} must be a positive integer")
    return user_id


def save_similarity_scores(
    user_id: int,
    ranked_candidates: Sequence[Dict[str, object]],
    connection_factory: Optional[Callable[[], Any]] = None,
    replace_existing: bool = False,
) -> int:
    """Insert or update scores; optionally replace this user's candidate set."""
    user_id = _validate_user_id(user_id, "user_id")
    validated_rows = []

    for candidate in ranked_candidates:
        candidate_id = _validate_user_id(
            candidate.get("user_id"),
            "candidate user_id",
        )
        if candidate_id == user_id:
            raise ValueError("A user cannot have a similarity score with themselves")

        scores = candidate.get("scores")
        if not isinstance(scores, dict):
            raise ValueError(
                f"Candidate {candidate_id} must include per-category scores"
            )

        validated_rows.append(
            (
                user_id,
                candidate_id,
                _validate_score(
                    candidate.get("similarity_score"),
                    "similarity_score",
                ),
                _validate_score(scores.get("video"), "video score"),
                _validate_score(scores.get("audio"), "audio score"),
                _validate_score(scores.get("text"), "text score"),
            )
        )

    if not validated_rows and not replace_existing:
        return 0

    connect = connection_factory or connect_database
    connection = connect()
    try:
        if replace_existing:
            connection.execute(_DELETE_USER_SCORES_SQL, (user_id,))
        for row in validated_rows:
            connection.execute(_UPSERT_SCORE_SQL, row)
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    return len(validated_rows)


def get_ranked_similarity_scores(
    user_id: int,
    limit: int = 50,
    connection_factory: Optional[Callable[[], Any]] = None,
) -> List[Dict[str, object]]:
    """Return the stored highest-scoring candidates for a user."""
    user_id = _validate_user_id(user_id, "user_id")
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 0:
        raise ValueError("limit must be a non-negative integer")

    connect = connection_factory or connect_database
    connection = connect()
    try:
        rows = connection.execute(
            _GET_RANKED_SCORES_SQL,
            (user_id, limit),
        ).fetchall()
        return [
            {
                "candidate_user_id": row[0],
                "overall_score": float(row[1]),
                "video_score": float(row[2]),
                "audio_score": float(row[3]),
                "text_score": float(row[4]),
                "calculated_at": row[5],
            }
            for row in rows
        ]
    finally:
        connection.close()
