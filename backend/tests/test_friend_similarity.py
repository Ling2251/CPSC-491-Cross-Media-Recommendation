import pytest

from app.friend_recommendation.similarity import rank_candidates
from app.friend_recommendation.similarity_test_data import (
    USER_AUDIO_ONLY,
    USER_A,
    USER_B,
    USER_C,
    USER_D,
    USER_EMPTY,
    USER_TEXT_ONLY,
    USER_VIDEO_ONLY,
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
    assert ranked[0]["shared_tags"] == ["adventure", "fantasy", "rock", "sci-fi"]
    assert ranked[1]["shared_tags"] == ["sci-fi"]
    assert ranked[2]["shared_tags"] == []


def test_shared_tags_ignore_zero_weight_preferences():
    user_profile = {
        "video": {"sci-fi": 0.0, "adventure": 0.8},
        "audio": {"rock": 0.5},
        "text": {},
    }
    candidate = {
        "user_id": 9,
        "preferences": {
            "video": {"sci-fi": 1.0, "adventure": 0.0},
            "audio": {"rock": 0.0},
            "text": {},
        },
    }

    ranked = rank_candidates(user_profile, [candidate])

    assert ranked[0]["shared_tags"] == []


@pytest.mark.parametrize(
    ("media_type", "source_user"),
    [
        ("video", USER_VIDEO_ONLY),
        ("audio", USER_AUDIO_ONLY),
        ("text", USER_TEXT_ONLY),
    ],
)
def test_single_media_type_profiles_are_ranked_and_share_interests(
    media_type,
    source_user,
):
    source_preferences = source_user["preferences"][media_type]
    user_profile = {
        category: source_preferences if category == media_type else {}
        for category in ("video", "audio", "text")
    }
    candidates = [
        {
            "user_id": 20,
            "preferences": {
                category: dict(source_preferences)
                if category == media_type
                else {}
                for category in ("video", "audio", "text")
            },
        },
        {
            "user_id": 21,
            "preferences": {
                category: {"unrelated": 1.0}
                if category == media_type
                else {}
                for category in ("video", "audio", "text")
            },
        },
        {
            "user_id": 22,
            "preferences": {"video": {}, "audio": {}, "text": {}},
        },
    ]

    ranked = rank_candidates(
        user_profile,
        candidates,
        current_user_id=19,
    )

    assert [candidate["user_id"] for candidate in ranked] == [20, 21, 22]
    assert [candidate["similarity_score"] for candidate in ranked] == pytest.approx(
        [1.0, 0.0, 0.0]
    )
    assert ranked[0]["scores"][media_type] == pytest.approx(1.0)
    assert ranked[0]["shared_tags"] == sorted(source_preferences)
    assert ranked[1]["shared_tags"] == []
    assert ranked[2]["shared_tags"] == []


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
