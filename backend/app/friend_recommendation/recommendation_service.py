"""Build, rank, and persist database-backed friend recommendations."""

from typing import Any, Callable, Dict, List, Optional

from .database_service import (
    UserNotFoundError,
    load_active_user_preference_profiles,
)
from .preference_service import PreferenceProfile
from .score_storage import save_similarity_scores
from .similarity import RankedCandidate, rank_candidates


def recalculate_friend_recommendations(
    user_id: int,
    connection_factory: Optional[Callable[[], Any]] = None,
) -> List[RankedCandidate]:
    """Rank all other active users for ``user_id`` and persist their scores.

    Profiles are built from each active user's media interactions and approved
    tags. Every active user except the requesting user is included as a
    candidate; the complete ranking is persisted and returned.
    """
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id < 1:
        raise ValueError("user_id must be a positive integer")

    profiles: Dict[int, PreferenceProfile] = (
        load_active_user_preference_profiles(connection_factory)
    )
    user_profile = profiles.get(user_id)
    if user_profile is None:
        raise UserNotFoundError(f"Active user {user_id} does not exist")

    candidates = [
        {"user_id": candidate_id, "preferences": profile}
        for candidate_id, profile in profiles.items()
        if candidate_id != user_id
    ]
    ranked_candidates = rank_candidates(
        user_profile,
        candidates,
        current_user_id=user_id,
    )
    save_similarity_scores(
        user_id,
        ranked_candidates,
        connection_factory=connection_factory,
        replace_existing=True,
    )
    return ranked_candidates