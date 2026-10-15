import math
from typing import Dict, Iterable, List, Mapping, Optional


TagVector = Dict[str, float]
PreferenceProfile = Dict[str, Dict[str, float]]
Candidate = Mapping[str, object]
RankedCandidate = Dict[str, object]

MEDIA_TYPES = ("video", "audio", "text")


def cosine_similarity(
    vector_a: TagVector,
    vector_b: TagVector,
) -> float:
    """
    Calculate cosine similarity between two tag-weight vectors.

    Returns:
        float between 0.0 and 1.0

    Examples:
        Identical vectors -> 1.0
        No shared tags    -> 0.0
        Partial overlap   -> between 0.0 and 1.0
    """

    if not vector_a or not vector_b:
        return 0.0

    # Use every tag that exists in either user's profile.
    all_tags = set(vector_a) | set(vector_b)

    dot_product = sum(
        vector_a.get(tag, 0.0)
        * vector_b.get(tag, 0.0)
        for tag in all_tags
    )

    magnitude_a = math.sqrt(
        sum(
            value ** 2
            for value in vector_a.values()
        )
    )

    magnitude_b = math.sqrt(
        sum(
            value ** 2
            for value in vector_b.values()
        )
    )

    if magnitude_a == 0.0 or magnitude_b == 0.0:
        return 0.0

    similarity = (
        dot_product
        / (magnitude_a * magnitude_b)
    )

    # Protect against tiny floating-point errors such as
    # 1.0000000000000002.
    return max(
        0.0,
        min(1.0, similarity),
    )


def calculate_media_similarity(
    profile_a: PreferenceProfile,
    profile_b: PreferenceProfile,
    media_type: str,
) -> float:
    """
    Calculate similarity for one media category.

    Valid media types:
        video
        audio
        text
    """

    if media_type not in MEDIA_TYPES:
        raise ValueError(
            f"Invalid media type: {media_type}"
        )

    vector_a = profile_a.get(
        media_type,
        {},
    )

    vector_b = profile_b.get(
        media_type,
        {},
    )

    return cosine_similarity(
        vector_a,
        vector_b,
    )


def calculate_overall_similarity(
    profile_a: PreferenceProfile,
    profile_b: PreferenceProfile,
) -> float:
    """
    Calculate an overall similarity score.

    Rule:

    - If BOTH users have no data for a category,
      ignore that category.
    - If one user has data and the other does not,
      that category receives a similarity of 0.
    - Average all active categories.
    - If neither user has preference data,
      return 0.
    """

    category_scores = []

    for media_type in MEDIA_TYPES:

        vector_a = profile_a.get(
            media_type,
            {},
        )

        vector_b = profile_b.get(
            media_type,
            {},
        )

        # If neither user uses this media category,
        # it should not reduce their overall score.
        if not vector_a and not vector_b:
            continue

        score = cosine_similarity(
            vector_a,
            vector_b,
        )

        category_scores.append(score)

    if not category_scores:
        return 0.0

    return sum(category_scores) / len(
        category_scores
    )


def calculate_user_similarity(
    profile_a: PreferenceProfile,
    profile_b: PreferenceProfile,
) -> Dict[str, float]:
    """
    Calculate the complete Friend Recommendation
    similarity result between two users.

    Returns:
        {
            "overall": ...,
            "video": ...,
            "audio": ...,
            "text": ...
        }
    """

    video_score = calculate_media_similarity(
        profile_a,
        profile_b,
        "video",
    )

    audio_score = calculate_media_similarity(
        profile_a,
        profile_b,
        "audio",
    )

    text_score = calculate_media_similarity(
        profile_a,
        profile_b,
        "text",
    )

    overall_score = calculate_overall_similarity(
        profile_a,
        profile_b,
    )

    return {
        "overall": overall_score,
        "video": video_score,
        "audio": audio_score,
        "text": text_score,
    }


def rank_candidates(
    user_profile: PreferenceProfile,
    candidates: Iterable[Candidate],
    current_user_id: Optional[int] = None,
    limit: Optional[int] = None,
) -> List[RankedCandidate]:
    """Score and rank candidates from highest to lowest overall similarity.

    Each candidate must contain a positive integer ``user_id`` and a
    ``preferences`` mapping in the same format as ``user_profile``. Other
    candidate fields are preserved in the returned record, except the
    preference vectors themselves.
    """
    if current_user_id is not None and (
        isinstance(current_user_id, bool)
        or not isinstance(current_user_id, int)
        or current_user_id < 1
    ):
        raise ValueError("current_user_id must be a positive integer")

    if limit is not None and (
        isinstance(limit, bool)
        or not isinstance(limit, int)
        or limit < 0
    ):
        raise ValueError("limit must be a non-negative integer")

    ranked: List[RankedCandidate] = []
    seen_user_ids = set()

    for candidate in candidates:
        candidate_id = candidate.get("user_id")
        if (
            isinstance(candidate_id, bool)
            or not isinstance(candidate_id, int)
            or candidate_id < 1
        ):
            raise ValueError("Each candidate must have a positive integer user_id")
        if candidate_id in seen_user_ids:
            raise ValueError(f"Duplicate candidate user_id: {candidate_id}")
        seen_user_ids.add(candidate_id)

        if candidate_id == current_user_id:
            continue

        preferences = candidate.get("preferences")
        if not isinstance(preferences, dict):
            raise ValueError(
                f"Candidate {candidate_id} must have a preferences mapping"
            )

        scores = calculate_user_similarity(
            user_profile,
            preferences,
        )
        result = {
            key: value
            for key, value in candidate.items()
            if key != "preferences"
        }
        result["similarity_score"] = scores["overall"]
        result["scores"] = scores
        ranked.append(result)

    ranked.sort(
        key=lambda candidate: (
            -float(candidate["similarity_score"]),
            int(candidate["user_id"]),
        )
    )
    if limit is not None:
        return ranked[:limit]
    return ranked