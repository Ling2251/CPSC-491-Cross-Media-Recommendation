from .models import MediaInteraction


SAMPLE_USER_INTERACTIONS = [
    MediaInteraction(
        media_id=101,
        media_type="video",
        interaction_type="rated",
        rating=5,
        tags=[
            "Sci-Fi",
            "Space",
            "Drama",
        ],
    ),

    MediaInteraction(
        media_id=102,
        media_type="video",
        interaction_type="consumed",
        tags=[
            "Sci-Fi",
            "Thriller",
        ],
    ),

    MediaInteraction(
        media_id=201,
        media_type="audio",
        interaction_type="saved",
        tags=[
            "Rock",
            "Alternative",
        ],
    ),

    MediaInteraction(
        media_id=202,
        media_type="audio",
        interaction_type="rated",
        rating=4,
        tags=[
            "Rock",
            "Indie",
        ],
    ),

    MediaInteraction(
        media_id=301,
        media_type="text",
        interaction_type="rated",
        rating=5,
        tags=[
            "Fantasy",
            "Adventure",
        ],
    ),

    MediaInteraction(
        media_id=302,
        media_type="text",
        interaction_type="saved",
        tags=[
            "Fantasy",
            "Sci-Fi",
        ],
    ),
]