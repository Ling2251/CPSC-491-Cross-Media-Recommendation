import math
import pytest

from app.friend_recommendation.models import (
    MediaInteraction,
)

from app.friend_recommendation.weighting import (
    get_interaction_weight,
)

from app.friend_recommendation.preference_service import (
    aggregate_preferences,
    build_preference_profile,
    clean_tag,
)


# ============================================================
# WEIGHT TESTS
# ============================================================

def test_consumed_media_weight():
    result = get_interaction_weight(
        "consumed"
    )

    assert result == 1.0


def test_saved_media_weight():
    result = get_interaction_weight(
        "saved"
    )

    assert result == 1.5


def test_rating_five_weight():
    result = get_interaction_weight(
        "rated",
        5,
    )

    assert result == 2.0


def test_rating_four_weight():
    result = get_interaction_weight(
        "rated",
        4,
    )

    assert result == 1.5


def test_rating_three_weight():
    result = get_interaction_weight(
        "rated",
        3,
    )

    assert result == 1.0


def test_rating_two_weight():
    result = get_interaction_weight(
        "rated",
        2,
    )

    assert result == 0.25


def test_rating_one_has_zero_weight():
    result = get_interaction_weight(
        "rated",
        1,
    )

    assert result == 0.0


def test_invalid_rating_raises_error():
    with pytest.raises(ValueError):
        get_interaction_weight(
            "rated",
            6,
        )


def test_missing_rating_raises_error():
    with pytest.raises(ValueError):
        get_interaction_weight(
            "rated"
        )


# ============================================================
# TAG TESTS
# ============================================================

def test_clean_tag():
    assert clean_tag(
        "  Sci-Fi  "
    ) == "sci-fi"


def test_repeated_tags_are_aggregated():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="video",
            interaction_type="consumed",
            tags=["Sci-Fi"],
        ),

        MediaInteraction(
            media_id=2,
            media_type="video",
            interaction_type="saved",
            tags=["Sci-Fi"],
        ),
    ]

    result = aggregate_preferences(
        interactions
    )

    assert result["video"]["sci-fi"] == 2.5


def test_same_tag_case_is_aggregated():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="video",
            interaction_type="consumed",
            tags=["Sci-Fi"],
        ),

        MediaInteraction(
            media_id=2,
            media_type="video",
            interaction_type="consumed",
            tags=["SCI-FI"],
        ),
    ]

    result = aggregate_preferences(
        interactions
    )

    assert result["video"]["sci-fi"] == 2.0


# ============================================================
# MEDIA-TYPE TESTS
# ============================================================

def test_video_audio_text_are_separated():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="video",
            interaction_type="consumed",
            tags=["Sci-Fi"],
        ),

        MediaInteraction(
            media_id=2,
            media_type="audio",
            interaction_type="saved",
            tags=["Rock"],
        ),

        MediaInteraction(
            media_id=3,
            media_type="text",
            interaction_type="rated",
            rating=5,
            tags=["Fantasy"],
        ),
    ]

    result = aggregate_preferences(
        interactions
    )

    assert "sci-fi" in result["video"]
    assert "rock" in result["audio"]
    assert "fantasy" in result["text"]


# ============================================================
# NORMALIZATION TESTS
# ============================================================

def test_video_profile_is_normalized():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="video",
            interaction_type="consumed",
            tags=["Sci-Fi"],
        ),

        MediaInteraction(
            media_id=2,
            media_type="video",
            interaction_type="consumed",
            tags=["Fantasy"],
        ),
    ]

    result = build_preference_profile(
        interactions
    )

    video = result["video"]

    magnitude = math.sqrt(
        sum(
            value ** 2
            for value in video.values()
        )
    )

    assert magnitude == pytest.approx(
        1.0
    )


def test_audio_profile_is_normalized():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="audio",
            interaction_type="saved",
            tags=["Rock"],
        ),

        MediaInteraction(
            media_id=2,
            media_type="audio",
            interaction_type="consumed",
            tags=["Pop"],
        ),
    ]

    result = build_preference_profile(
        interactions
    )

    audio = result["audio"]

    magnitude = math.sqrt(
        sum(
            value ** 2
            for value in audio.values()
        )
    )

    assert magnitude == pytest.approx(
        1.0
    )


def test_text_profile_is_normalized():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="text",
            interaction_type="rated",
            rating=5,
            tags=["Fantasy"],
        ),

        MediaInteraction(
            media_id=2,
            media_type="text",
            interaction_type="saved",
            tags=["Mystery"],
        ),
    ]

    result = build_preference_profile(
        interactions
    )

    text = result["text"]

    magnitude = math.sqrt(
        sum(
            value ** 2
            for value in text.values()
        )
    )

    assert magnitude == pytest.approx(
        1.0
    )


# ============================================================
# EDGE-CASE TESTS
# ============================================================

def test_empty_user_returns_empty_profile():
    result = build_preference_profile(
        []
    )

    assert result == {
        "video": {},
        "audio": {},
        "text": {},
    }


def test_media_with_no_tags_does_not_fail():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="video",
            interaction_type="consumed",
            tags=[],
        )
    ]

    result = build_preference_profile(
        interactions
    )

    assert result["video"] == {}


def test_rating_one_does_not_add_tag_weight():
    interactions = [
        MediaInteraction(
            media_id=1,
            media_type="video",
            interaction_type="rated",
            rating=1,
            tags=["Horror"],
        )
    ]

    result = build_preference_profile(
        interactions
    )

    assert result["video"] == {}


def test_invalid_media_type_raises_error():
    interaction = MediaInteraction(
        media_id=1,
        media_type="game",
        interaction_type="consumed",
        tags=["Adventure"],
    )

    with pytest.raises(ValueError):
        build_preference_profile(
            [interaction]
        )


def test_invalid_interaction_type_raises_error():
    interaction = MediaInteraction(
        media_id=1,
        media_type="video",
        interaction_type="liked",
        tags=["Comedy"],
    )

    with pytest.raises(ValueError):
        build_preference_profile(
            [interaction]
        )


def test_invalid_rating_raises_error():
    interaction = MediaInteraction(
        media_id=1,
        media_type="text",
        interaction_type="rated",
        rating=10,
        tags=["Fantasy"],
    )

    with pytest.raises(ValueError):
        build_preference_profile(
            [interaction]
        )