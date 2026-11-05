"""Build, rank, and persist database-backed friend recommendations."""

from typing import Any, Callable, Dict, Iterable, List, Optional, Set, Tuple, Union

from .database_service import (
    UserNotFoundError,
    load_recommendation_excluded_ids,
    load_active_user_names,
    load_active_user_preference_profiles,
)
from .preference_service import PreferenceProfile
from .score_storage import save_similarity_scores
from .similarity import RankedCandidate, rank_candidates


def get_recommendations(
    user_id: Union[int, str],
    connection_factory: Optional[Callable[[], Any]] = None,
    opted_out_user_ids: Optional[Iterable[int]] = None,
) -> List[Tuple[str, float]]:
    """Return ranked ``(username, similarity_score)`` pairs for a user.

    The user may be identified by their positive numeric ID or exact active
    account name. This convenience entry point recalculates and persists scores
    using the same service as the authenticated API.
    """
    if isinstance(user_id, bool):
        raise ValueError("user_id must be a positive integer or account name")
    if isinstance(user_id, int):
        if user_id < 1:
            raise ValueError(
                "user_id must be a positive integer or account name"
            )
        resolved_user_id = user_id
    elif isinstance(user_id, str) and user_id.strip():
        account_name = user_id.strip()
        resolved_user_id = None
    else:
        raise ValueError("user_id must be a positive integer or account name")

    active_user_names = load_active_user_names(connection_factory)
    if resolved_user_id is None:
        matching_user_ids = [
            active_id
            for active_id, name in active_user_names.items()
            if name == account_name
        ]
        if not matching_user_ids:
            raise UserNotFoundError(
                f"Active user {account_name!r} does not exist"
            )
        if len(matching_user_ids) > 1:
            raise ValueError(
                f"Account name {account_name!r} is not unique"
            )
        resolved_user_id = matching_user_ids[0]

    ranked_candidates = recalculate_friend_recommendations(
        resolved_user_id,
        connection_factory=connection_factory,
        opted_out_user_ids=opted_out_user_ids,
    )
    recommendations = []
    for candidate in ranked_candidates:
        candidate_id = candidate["user_id"]
        if candidate_id not in active_user_names:
            raise RuntimeError(
                f"Active candidate {candidate_id} has no account name"
            )
        recommendations.append(
            (
                active_user_names[candidate_id],
                float(candidate["similarity_score"]),
            )
        )
    return recommendations


def recalculate_friend_recommendations(
    user_id: int,
    connection_factory: Optional[Callable[[], Any]] = None,
    opted_out_user_ids: Optional[Iterable[int]] = None,
) -> List[RankedCandidate]:
    """Rank all other active users for ``user_id`` and persist their scores.

    Profiles are built from each active user's media interactions and approved
    tags. Existing accepted friends, users with pending requests in either
    direction, opted-out users supplied by the profile subsystem, and the
    requesting user are excluded; the remaining ranking is persisted and
    returned.
    """
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id < 1:
        raise ValueError("user_id must be a positive integer")

    opted_out_ids: Set[int] = set()
    if opted_out_user_ids is not None:
        for opted_out_id in opted_out_user_ids:
            if (
                isinstance(opted_out_id, bool)
                or not isinstance(opted_out_id, int)
                or opted_out_id < 1
            ):
                raise ValueError(
                    "opted_out_user_ids must contain positive integers"
                )
            opted_out_ids.add(opted_out_id)

    profiles: Dict[int, PreferenceProfile] = (
        load_active_user_preference_profiles(connection_factory)
    )
    user_profile = profiles.get(user_id)
    if user_profile is None:
        raise UserNotFoundError(f"Active user {user_id} does not exist")

    excluded_user_ids = load_recommendation_excluded_ids(
        user_id,
        connection_factory=connection_factory,
    )
    candidates = [
        {"user_id": candidate_id, "preferences": profile}
        for candidate_id, profile in profiles.items()
        if (
            candidate_id != user_id
            and candidate_id not in excluded_user_ids
            and candidate_id not in opted_out_ids
        )
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