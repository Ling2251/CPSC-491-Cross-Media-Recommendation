from typing import Optional


CONSUMED_WEIGHT = 1.0
SAVED_WEIGHT = 1.5


RATING_WEIGHTS = {
    1: 0.0,
    2: 0.25,
    3: 1.0,
    4: 1.5,
    5: 2.0,
}


def get_interaction_weight(
    interaction_type: str,
    rating: Optional[int] = None,
) -> float:
    """
    Return the weight associated with a user-media interaction.

    Args:
        interaction_type:
            consumed, saved, or rated.

        rating:
            Required when interaction_type is "rated".
            Valid values are 1 through 5.

    Returns:
        float:
            Weight that should be applied to every tag
            associated with the media item.

    Raises:
        ValueError:
            If interaction type or rating is invalid.
    """

    if interaction_type == "consumed":
        return CONSUMED_WEIGHT

    if interaction_type == "saved":
        return SAVED_WEIGHT

    if interaction_type == "rated":
        if rating is None:
            raise ValueError(
                "A rating must be supplied for rated media"
            )

        if rating not in RATING_WEIGHTS:
            raise ValueError(
                "Rating must be between 1 and 5"
            )

        return RATING_WEIGHTS[rating]

    raise ValueError(
        f"Unknown interaction type: {interaction_type}"
    )