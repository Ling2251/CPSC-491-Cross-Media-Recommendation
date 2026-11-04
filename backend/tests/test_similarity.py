import json
import math
from pathlib import Path

import pytest

from app.friend_recommendation.similarity import (
    CosineSimilarity,
    SimilarityContext,
    calculate_media_similarity,
    calculate_user_similarity,
    cosine_similarity,
)


@pytest.fixture(scope="module")
def similarity_users():
    """
    Load the controlled TEST-FR-01 dataset.

    This fixture performs no network, database, or API calls.
    """

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


# ============================================================
# TEST-FR-02
# Cosine Similarity Unit Tests
# ============================================================


def test_identical_profiles_return_one(
    similarity_users,
):
    """
    Identical normalized video preference vectors
    should have cosine similarity 1.0.
    """

    user_a = (
        similarity_users["user_a"]
        ["preferences"]
        ["video"]
    )

    user_b = (
        similarity_users["user_b"]
        ["preferences"]
        ["video"]
    )

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
    """
    Profiles with no shared tags should have
    cosine similarity 0.
    """

    user_a = (
        similarity_users["user_a"]
        ["preferences"]
        ["video"]
    )

    user_c = (
        similarity_users["user_c"]
        ["preferences"]
        ["video"]
    )

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
    """
    USER_A video vector:

        sci-fi     = 0.8
        adventure  = 0.6

    USER_D video vector:

        sci-fi     = 1.0

    Expected cosine similarity = 0.8.
    """

    user_a = (
        similarity_users["user_a"]
        ["preferences"]
        ["video"]
    )

    user_d = (
        similarity_users["user_d"]
        ["preferences"]
        ["video"]
    )

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
    """
    cosine(A, B) must equal cosine(B, A).
    """

    user_a = (
        similarity_users["user_a"]
        ["preferences"]
        ["video"]
    )

    user_d = (
        similarity_users["user_d"]
        ["preferences"]
        ["video"]
    )

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
    """
    Empty vectors should produce a safe zero result.
    """

    empty = (
        similarity_users["empty_user"]
        ["preferences"]
        ["video"]
    )

    user_a = (
        similarity_users["user_a"]
        ["preferences"]
        ["video"]
    )

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
    """
    Verify that the controlled Sprint 2 vector has
    unit L2 magnitude.

    USER_A video:

        sqrt(0.8^2 + 0.6^2) = 1.0
    """

    vector = (
        similarity_users["user_a"]
        ["preferences"]
        ["video"]
    )

    magnitude = math.sqrt(
        sum(
            weight ** 2
            for weight in vector.values()
        )
    )

    assert magnitude == pytest.approx(
        1.0,
        abs=1e-6,
    )


def test_identical_full_profiles_return_all_one(
    similarity_users,
):
    """
    USER_A and USER_B are identical across all
    three media categories.
    """

    profile_a = (
        similarity_users["user_a"]
        ["preferences"]
    )

    profile_b = (
        similarity_users["user_b"]
        ["preferences"]
    )

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


# ============================================================
# TEST-FR-03
# Similarity Edge Cases
# ============================================================


class TestSimilarityEdgeCases:
    """
    Defensive boundary and malformed-input tests.

    Invalid input is handled with controlled ValueError
    exceptions instead of unexpected runtime failures.
    """

    def test_both_empty_vectors_return_zero(
        self,
    ):
        """
        Two completely empty vectors should safely
        produce zero similarity.
        """

        score = cosine_similarity(
            {},
            {},
        )

        assert score == pytest.approx(
            0.0,
            abs=1e-6,
        )


    def test_zero_magnitude_vector_returns_zero(
        self,
    ):
        """
        A vector containing only zero weights has
        zero magnitude and must not cause division
        by zero.
        """

        score = cosine_similarity(
            {
                "sci-fi": 0.0,
            },
            {
                "sci-fi": 1.0,
            },
        )

        assert score == pytest.approx(
            0.0,
            abs=1e-6,
        )


    def test_missing_media_categories_do_not_crash(
        self,
    ):
        """
        Profiles can be partially populated while
        user preferences are being built.

        Missing categories should behave as empty
        categories instead of causing KeyError.
        """

        profile_a = {
            "video": {
                "sci-fi": 1.0,
            },
        }

        profile_b = {
            "video": {
                "sci-fi": 1.0,
            },
        }

        result = calculate_user_similarity(
            profile_a,
            profile_b,
        )

        assert result["video"] == pytest.approx(
            1.0,
            abs=1e-6,
        )

        assert result["audio"] == pytest.approx(
            0.0,
            abs=1e-6,
        )

        assert result["text"] == pytest.approx(
            0.0,
            abs=1e-6,
        )

        # Since both users have no audio or text data,
        # those categories are ignored in the overall
        # average.
        assert result["overall"] == pytest.approx(
            1.0,
            abs=1e-6,
        )


    def test_invalid_media_type_is_rejected_cleanly(
        self,
    ):
        """
        Unsupported media categories should produce
        a controlled ValueError.
        """

        with pytest.raises(
            ValueError,
            match="Invalid media type",
        ):
            calculate_media_similarity(
                {},
                {},
                "game",
            )


    def test_non_dictionary_vector_is_rejected_cleanly(
        self,
    ):
        """
        Malformed vectors should produce ValueError
        rather than AttributeError or TypeError.
        """

        with pytest.raises(
            ValueError,
            match="must be a dictionary",
        ):
            cosine_similarity(
                ["sci-fi"],
                {
                    "sci-fi": 1.0,
                },
            )


    def test_non_numeric_weight_is_rejected_cleanly(
        self,
    ):
        """
        String or otherwise non-numeric weights are
        invalid preference data.
        """

        with pytest.raises(
            ValueError,
            match="weights must be numeric",
        ):
            cosine_similarity(
                {
                    "sci-fi": "high",
                },
                {
                    "sci-fi": 1.0,
                },
            )


    def test_negative_weight_is_rejected_cleanly(
        self,
    ):
        """
        Negative weights are explicitly rejected.

        Sprint 2 produces non-negative preference
        weights, so negative input is considered
        malformed rather than clamped.
        """

        with pytest.raises(
            ValueError,
            match="cannot be negative",
        ):
            cosine_similarity(
                {
                    "sci-fi": -0.5,
                },
                {
                    "sci-fi": 1.0,
                },
            )


    def test_similarity_context_can_swap_strategy(
        self,
    ):
        """
        Verify that SimilarityContext can replace
        its active similarity strategy.

        The isinstance assertions satisfy the
        TEST-FR-03 strategy-swap acceptance
        criterion.
        """

        class AlwaysZeroSimilarity:
            def calculate(
                self,
                vector_a,
                vector_b,
            ):
                return 0.0

        context = SimilarityContext(
            CosineSimilarity()
        )

        assert isinstance(
            context.strategy,
            CosineSimilarity,
        )

        replacement = AlwaysZeroSimilarity()

        context.set_strategy(
            replacement
        )

        assert isinstance(
            context.strategy,
            AlwaysZeroSimilarity,
        )

        score = context.calculate(
            {
                "sci-fi": 1.0,
            },
            {
                "sci-fi": 1.0,
            },
        )

        assert score == pytest.approx(
            0.0,
            abs=1e-6,
        )