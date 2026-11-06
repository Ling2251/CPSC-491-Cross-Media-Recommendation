import pytest

from app.friend_recommendation import recommendation_service
from app.friend_recommendation.database_service import UserNotFoundError
from app.friend_recommendation.similarity import rank_candidates
from app.friend_recommendation.similarity_test_data import (
    USER_A,
    USER_B,
    USER_C,
    USER_D,
    USER_EMPTY,
)


def test_service_returns_controlled_candidates_ranked_by_similarity_descending(
    monkeypatch,
):
    profiles = {
        candidate["user_id"]: candidate["preferences"]
        for candidate in (USER_A, USER_B, USER_C, USER_D)
    }
    monkeypatch.setattr(
        recommendation_service,
        "load_active_user_preference_profiles",
        lambda connection_factory: profiles,
    )
    monkeypatch.setattr(
        recommendation_service,
        "load_recommendation_excluded_ids",
        lambda user_id, connection_factory=None: set(),
    )
    monkeypatch.setattr(
        recommendation_service,
        "save_similarity_scores",
        lambda *args, **kwargs: None,
    )

    ranked = recommendation_service.recalculate_friend_recommendations(
        USER_A["user_id"]
    )

    assert [candidate["user_id"] for candidate in ranked] == [2, 4, 3]
    assert ranked[0]["similarity_score"] == pytest.approx(1.0)
    assert ranked[0]["shared_tags"] == [
        "adventure",
        "fantasy",
        "rock",
        "sci-fi",
    ]
    assert ranked[1]["similarity_score"] > ranked[2]["similarity_score"]
    assert ranked[2]["similarity_score"] == pytest.approx(0.0)


def test_get_recommendations_accepts_account_name_and_returns_ranked_pairs(
    monkeypatch,
):
    monkeypatch.setattr(
        recommendation_service,
        "load_active_user_names",
        lambda connection_factory: {1: "user_a", 2: "user_b", 3: "user_c"},
    )
    recalculated_user_ids = []
    supplied_opt_out_ids = []

    def fake_recalculate(
        user_id,
        connection_factory=None,
        opted_out_user_ids=None,
    ):
        recalculated_user_ids.append(user_id)
        supplied_opt_out_ids.extend(opted_out_user_ids or [])
        return [
            {"user_id": 2, "similarity_score": 1.0},
            {"user_id": 3, "similarity_score": 0.0},
        ]

    monkeypatch.setattr(
        recommendation_service,
        "recalculate_friend_recommendations",
        fake_recalculate,
    )

    recommendations = recommendation_service.get_recommendations(
        user_id="user_a",
        opted_out_user_ids=[42],
    )

    assert recalculated_user_ids == [1]
    assert supplied_opt_out_ids == [42]
    assert recommendations == [("user_b", 1.0), ("user_c", 0.0)]


def test_get_recommendations_rejects_unknown_account_name(monkeypatch):
    monkeypatch.setattr(
        recommendation_service,
        "load_active_user_names",
        lambda connection_factory: {1: "user_a"},
    )

    with pytest.raises(UserNotFoundError, match="user_b"):
        recommendation_service.get_recommendations(user_id="user_b")


def test_equal_scores_are_broken_by_user_id_independent_of_input_order():
    candidates = [USER_EMPTY, USER_C]

    first_ranking = rank_candidates(USER_A["preferences"], candidates)
    second_ranking = rank_candidates(
        USER_A["preferences"],
        list(reversed(candidates)),
    )

    assert [candidate["user_id"] for candidate in first_ranking] == [3, 8]
    assert [candidate["user_id"] for candidate in second_ranking] == [3, 8]
    assert first_ranking[0]["similarity_score"] == first_ranking[1][
        "similarity_score"
    ]


def test_shared_tags_are_combined_across_media_types():
    profile = {
        "video": {"adventure": 0.8, "sci-fi": 0.7},
        "audio": {"rock": 0.9},
        "text": {"fantasy": 0.6},
    }

    ranked = rank_candidates(
        profile,
        [{"user_id": 20, "preferences": profile}],
    )

    assert ranked[0]["shared_tags"] == [
        "adventure",
        "fantasy",
        "rock",
        "sci-fi",
    ]


def test_shared_tags_require_positive_weights_in_both_profiles():
    user_profile = {
        "video": {"adventure": 0.8, "sci-fi": 0.0},
        "audio": {"rock": 0.5},
        "text": {},
    }
    candidate_profile = {
        "video": {"adventure": 0.0, "sci-fi": 1.0},
        "audio": {"rock": 0.0},
        "text": {},
    }

    ranked = rank_candidates(
        user_profile,
        [{"user_id": 20, "preferences": candidate_profile}],
    )

    assert ranked[0]["shared_tags"] == []


def test_shared_tags_are_capped_at_four_and_sorted_deterministically():
    profile = {
        "video": {"zeta": 1.0, "beta": 1.0},
        "audio": {"gamma": 1.0, "alpha": 1.0},
        "text": {"epsilon": 1.0},
    }

    ranked = rank_candidates(
        profile,
        [{"user_id": 20, "preferences": profile}],
    )

    assert ranked[0]["shared_tags"] == ["alpha", "beta", "epsilon", "gamma"]
    assert len(ranked[0]["shared_tags"]) == 4


def test_shared_tags_below_cap_are_not_truncated():
    ranked = rank_candidates(
        USER_A["preferences"],
        [USER_B],
    )

    assert ranked[0]["shared_tags"] == [
        "adventure",
        "fantasy",
        "rock",
        "sci-fi",
    ]


def test_candidates_without_shared_tags_return_an_empty_list():
    ranked = rank_candidates(
        USER_A["preferences"],
        [USER_C],
    )

    assert ranked[0]["shared_tags"] == []


def test_current_user_is_excluded_and_limit_applies_after_ranking():
    ranked = rank_candidates(
        USER_A["preferences"],
        [USER_A, USER_C, USER_B],
        current_user_id=USER_A["user_id"],
        limit=1,
    )

    assert [candidate["user_id"] for candidate in ranked] == [2]
    assert all(
        candidate["user_id"] != USER_A["user_id"]
        for candidate in ranked
    )


def test_duplicate_candidate_records_are_rejected_without_duplicate_results():
    duplicate_candidates = [
        {
            "user_id": 20,
            "username": "candidate",
            "preferences": USER_B["preferences"],
        },
        {
            "user_id": 20,
            "username": "duplicate",
            "preferences": USER_C["preferences"],
        },
    ]

    with pytest.raises(ValueError, match="Duplicate candidate user_id: 20"):
        rank_candidates(USER_A["preferences"], duplicate_candidates)


def test_recommendation_result_is_empty_when_all_candidates_are_filtered(
    monkeypatch,
):
    profiles = {
        USER_A["user_id"]: USER_A["preferences"],
        USER_B["user_id"]: USER_B["preferences"],
        USER_C["user_id"]: USER_C["preferences"],
    }
    saved_candidates = []
    monkeypatch.setattr(
        recommendation_service,
        "load_active_user_preference_profiles",
        lambda connection_factory: profiles,
    )
    monkeypatch.setattr(
        recommendation_service,
        "load_recommendation_excluded_ids",
        lambda user_id, connection_factory=None: set(),
    )
    monkeypatch.setattr(
        recommendation_service,
        "save_similarity_scores",
        lambda user_id, candidates, **kwargs: saved_candidates.extend(
            candidates
        ),
    )

    recommendations = recommendation_service.recalculate_friend_recommendations(
        USER_A["user_id"],
        opted_out_user_ids=[USER_B["user_id"], USER_C["user_id"]],
    )

    assert recommendations == []
    assert saved_candidates == []


def test_ranking_preserves_candidate_metadata_without_preference_vectors():
    ranked = rank_candidates(
        USER_A["preferences"],
        [
            {
                "user_id": 20,
                "username": "candidate",
                "preferences": USER_B["preferences"],
            }
        ],
    )

    assert ranked[0]["username"] == "candidate"
    assert "preferences" not in ranked[0]
    assert ranked[0]["similarity_score"] == pytest.approx(1.0)
    assert ranked[0]["shared_tags"] == [
        "adventure",
        "fantasy",
        "rock",
        "sci-fi",
    ]
