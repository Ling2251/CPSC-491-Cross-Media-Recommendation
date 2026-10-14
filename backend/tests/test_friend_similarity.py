import pytest

from app.friend_recommendation.similarity import rank_candidates
from app.friend_recommendation.similarity_test_data import (
    USER_A,
    USER_B,
    USER_C,
    USER_D,
    USER_EMPTY,
)


def test_candidates_are_ranked_by_overall_similarity():
    ranked = rank_candidates(
        USER_A["preferences"],
        [USER_D, USER_C, USER_B],
        current_user_id=USER_A["user_id"],
    )

    assert [candidate["user_id"] for candidate in ranked] == [2, 4, 3]
    assert ranked[0]["similarity_score"] == pytest.approx(1.0)
    assert ranked[1]["similarity_score"] > ranked[2]["similarity_score"]
    assert "preferences" not in ranked[0]
    assert ranked[0]["scores"]["video"] == pytest.approx(1.0)


def test_ranking_excludes_current_user_and_applies_limit():
    ranked = rank_candidates(
        USER_A["preferences"],
        [USER_A, USER_B, USER_C],
        current_user_id=USER_A["user_id"],
        limit=1,
    )

    assert len(ranked) == 1
    assert ranked[0]["user_id"] == USER_B["user_id"]


def test_ranking_is_deterministic_for_equal_scores():
    ranked = rank_candidates(
        USER_A["preferences"],
        [USER_EMPTY, USER_C],
    )

    assert [candidate["user_id"] for candidate in ranked] == [3, 8]
    assert ranked[0]["similarity_score"] == ranked[1]["similarity_score"]


def test_empty_preferences_rank_with_zero_similarity():
    ranked = rank_candidates(
        USER_EMPTY["preferences"],
        [USER_A, USER_B],
    )

    assert all(candidate["similarity_score"] == 0.0 for candidate in ranked)


@pytest.mark.parametrize("limit", [-1, True, 1.5])
def test_invalid_limit_is_rejected(limit):
    with pytest.raises(ValueError):
        rank_candidates(USER_A["preferences"], [], limit=limit)


def test_duplicate_candidate_ids_are_rejected():
    with pytest.raises(ValueError, match="Duplicate candidate"):
        rank_candidates(USER_A["preferences"], [USER_B, USER_B])


def test_missing_candidate_profile_is_rejected():
    with pytest.raises(ValueError, match="preferences mapping"):
        rank_candidates(
            USER_A["preferences"],
            [{"user_id": 20}],
        )
