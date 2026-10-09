from collections import defaultdict
from typing import Dict, Iterable

from .models import MediaInteraction
from .normalization import normalize_media_preferences
from .weighting import get_interaction_weight


PreferenceProfile = Dict[str, Dict[str, float]]


def clean_tag(tag: str) -> str:
    """
    Standardize existing tag text for preference calculation.

    This does NOT create new tags or classify media.

    It only ensures that existing tags such as:

        "Sci-Fi"
        " sci-fi "
        "SCI-FI"

    are treated as the same tag.
    """

    if not isinstance(tag, str):
        raise ValueError("Tag must be a string")

    return tag.strip().lower()


def create_empty_profile() -> PreferenceProfile:
    """
    Return the basic profile structure expected by
    the Friend Recommendation system.
    """

    return {
        "video": {},
        "audio": {},
        "text": {},
    }


def aggregate_preferences(
    interactions: Iterable[MediaInteraction],
) -> PreferenceProfile:
    """
    Aggregate weighted tags from all media interactions.

    No normalization occurs in this function.

    Args:
        interactions:
            User's existing media interactions.

    Returns:
        Raw preference weights grouped by media type.
    """

    aggregated = {
        "video": defaultdict(float),
        "audio": defaultdict(float),
        "text": defaultdict(float),
    }

    for interaction in interactions:

        interaction.validate()

        weight = get_interaction_weight(
            interaction.interaction_type,
            interaction.rating,
        )

        # Ignore interactions that contribute no preference weight.
        if weight <= 0:
            continue

        for raw_tag in interaction.tags:

            tag = clean_tag(raw_tag)

            # Ignore blank tag names.
            if not tag:
                continue

            aggregated[
                interaction.media_type
            ][tag] += weight

    return {
        media_type: dict(tags)
        for media_type, tags in aggregated.items()
    }


def build_preference_profile(
    interactions: Iterable[MediaInteraction],
) -> PreferenceProfile:
    """
    Build the final normalized preference profile for one user.

    Process:

        1. Validate interaction data.
        2. Apply interaction weights.
        3. Aggregate repeated tags.
        4. Group preferences by media type.
        5. Normalize video/audio/text independently.

    Returns:

        {
            "video": {
                "sci-fi": 0.8,
                "thriller": 0.6
            },

            "audio": {
                "rock": 1.0
            },

            "text": {
                "fantasy": 0.89,
                "adventure": 0.45
            }
        }
    """

    raw_profile = aggregate_preferences(
        interactions
    )

    return normalize_media_preferences(
        raw_profile
    )


def build_raw_preference_profile(
    interactions: Iterable[MediaInteraction],
) -> PreferenceProfile:
    """
    Return preference scores before normalization.

    Useful for debugging and unit testing.
    """

    return aggregate_preferences(
        interactions
    )