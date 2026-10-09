from dataclasses import dataclass, field
from typing import List, Optional


VALID_MEDIA_TYPES = {
    "video",
    "audio",
    "text",
}

VALID_INTERACTION_TYPES = {
    "consumed",
    "saved",
    "rated",
}


@dataclass
class MediaInteraction:
    """
    Represents an existing user interaction with a media item.

    The Friend Recommendation system does not create the media,
    tags, ratings, or saved/consumed records.

    It receives that information from other project subsystems.
    """

    media_id: int
    media_type: str
    interaction_type: str
    tags: List[str] = field(default_factory=list)

    rating: Optional[int] = None

    def validate(self) -> None:
        """
        Validate the interaction before preference calculation.

        Raises:
            ValueError: If required fields contain invalid data.
        """

        if not isinstance(self.media_id, int):
            raise ValueError("media_id must be an integer")

        if self.media_type not in VALID_MEDIA_TYPES:
            raise ValueError(
                f"Invalid media_type: {self.media_type}"
            )

        if self.interaction_type not in VALID_INTERACTION_TYPES:
            raise ValueError(
                f"Invalid interaction_type: "
                f"{self.interaction_type}"
            )

        if not isinstance(self.tags, list):
            raise ValueError("tags must be a list")

        if self.interaction_type == "rated":
            if self.rating is None:
                raise ValueError(
                    "Rated interactions must include a rating"
                )

            if not isinstance(self.rating, int):
                raise ValueError(
                    "rating must be an integer"
                )

            if self.rating < 1 or self.rating > 5:
                raise ValueError(
                    "rating must be between 1 and 5"
                )