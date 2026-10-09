import math
from typing import Dict


def normalize_tag_weights(
    tag_weights: Dict[str, float],
) -> Dict[str, float]:
    """
    Normalize a dictionary of tag weights using L2 normalization.

    Example:

        {
            "sci-fi": 4.0,
            "fantasy": 3.0
        }

    becomes approximately:

        {
            "sci-fi": 0.8,
            "fantasy": 0.6
        }

    Args:
        tag_weights:
            Mapping of tag names to accumulated weights.

    Returns:
        Dict[str, float]:
            Normalized tag weights.
    """

    if not tag_weights:
        return {}

    magnitude = math.sqrt(
        sum(
            weight ** 2
            for weight in tag_weights.values()
        )
    )

    if magnitude == 0:
        return {
            tag: 0.0
            for tag in tag_weights
        }

    return {
        tag: weight / magnitude
        for tag, weight in tag_weights.items()
    }


def normalize_media_preferences(
    preferences: Dict[str, Dict[str, float]],
) -> Dict[str, Dict[str, float]]:
    """
    Normalize video, audio, and text separately.

    This prevents a user who consumes much more of one media
    category from automatically overwhelming the others.
    """

    normalized = {}

    for media_type in ("video", "audio", "text"):
        media_preferences = preferences.get(
            media_type,
            {}
        )

        normalized[media_type] = normalize_tag_weights(
            media_preferences
        )

    return normalized