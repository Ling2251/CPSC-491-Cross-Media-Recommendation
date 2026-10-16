import json
import math
from pathlib import Path

import pytest

from app.friend_recommendation.similarity import (
    cosine_similarity,
    calculate_user_similarity,
)


@pytest.fixture(scope="module")
def similarity_users():
    fixture_path = (
        Path(__file__).parent
        / "fixtures"
        / "friend_similarity_users.json"
    )

    with fixture_path.open(
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def test_identical_profiles_return_one(
    similarity_users,
):
    user_a = similarity_users["user_a"]["preferences"]["video"]
    user_b = similarity_users["user_b"]["preferences"]["video"]

    score = cosine_similarity(
        user_a,
        user_b,
    )

    assert score == pytest.approx(
        1.0,
        abs=1e-6,
    )


def test_no_overlapping_tags_return_zero(
    similarity_users,
):
    user_a = similarity_users["user_a"]["preferences"]["video"]
    user_c = similarity_users["user_c"]["preferences"]["video"]

    score = cosine_similarity(
        user_a,
        user_c,
    )

    assert score == pytest.approx(
        0.0,
        abs=1e-6,
    )


def test_partial_overlap_returns_expected_score(
    similarity_users,
):
    user_a = similarity_users["user_a"]["preferences"]["video"]
    user_d = similarity_users["user_d"]["preferences"]["video"]

    score = cosine_similarity(
        user_a,
        user_d,
    )

    assert score == pytest.approx(
        0.8,
        abs=1e-6,
    )


def test_cosine_similarity_is_symmetric(
    similarity_users,
):
    user_a = similarity_users["user_a"]["preferences"]["video"]
    user_d = similarity_users["user_d"]["preferences"]["video"]

    score_a_d = cosine_similarity(
        user_a,
        user_d,
    )

    score_d_a = cosine_similarity(
        user_d,
        user_a,
    )

    assert score_a_d == pytest.approx(
        score_d_a,
        abs=1e-6,
    )


def test_empty_profile_returns_zero(
    similarity_users,
):
    empty = similarity_users["empty_user"]["preferences"]["video"]
    user_a = similarity_users["user_a"]["preferences"]["video"]

    score = cosine_similarity(
        empty,
        user_a,
    )

    assert score == pytest.approx(
        0.0,
        abs=1e-6,
    )


def test_controlled_profile_is_l2_normalized(
    similarity_users,
):
    video_vector = (
        similarity_users["user_a"]
        ["preferences"]
        ["video"]
    )

    magnitude = math.sqrt(
        sum(
            weight ** 2
            for weight in video_vector.values()
        )
    )

    assert magnitude == pytest.approx(
        1.0,
        abs=1e-6,
    )


def test_identical_full_profiles_return_all_one(
    similarity_users,
):
    profile_a = similarity_users["user_a"]["preferences"]
    profile_b = similarity_users["user_b"]["preferences"]

    result = calculate_user_similarity(
        profile_a,
        profile_b,
    )

    assert result["video"] == pytest.approx(
        1.0,
        abs=1e-6,
    )

    assert result["audio"] == pytest.approx(
        1.0,
        abs=1e-6,
    )

    assert result["text"] == pytest.approx(
        1.0,
        abs=1e-6,
    )

    assert result["overall"] == pytest.approx(
        1.0,
        abs=1e-6,
    )