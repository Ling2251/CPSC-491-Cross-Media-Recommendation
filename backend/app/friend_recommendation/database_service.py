"""Load a user's media interactions from PostgreSQL for preference building."""

import os
from typing import Any, Callable, Dict, List, Optional

from .models import MediaInteraction
from .preference_service import PreferenceProfile, build_preference_profile


class UserNotFoundError(LookupError):
    """Raised when an active user does not exist in the database."""


MEDIA_TYPE_CASE_SQL = """
    CASE lower(m.media_type)
        WHEN 'video' THEN 'video'
        WHEN 'movie' THEN 'video'
        WHEN 'tv' THEN 'video'
        WHEN 'tv_series' THEN 'video'
        WHEN 'show' THEN 'video'
        WHEN 'game' THEN 'video'
        WHEN 'audio' THEN 'audio'
        WHEN 'music' THEN 'audio'
        WHEN 'podcast' THEN 'audio'
        WHEN 'audiobook' THEN 'audio'
        WHEN 'text' THEN 'text'
        WHEN 'book' THEN 'text'
        WHEN 'ebook' THEN 'text'
        WHEN 'article' THEN 'text'
        ELSE NULL
    END
"""

_USER_EXISTS_SQL = """
    SELECT id
    FROM users
    WHERE id = %s AND account_state = 'active'
"""

_USER_INTERACTIONS_SQL = f"""
    SELECT
        umi.media_id,
        {MEDIA_TYPE_CASE_SQL} AS preference_media_type,
        umi.interaction_type,
        umi.rating,
        COALESCE(
            array_agg(DISTINCT tt.name ORDER BY tt.name)
                FILTER (WHERE tt.name IS NOT NULL),
            ARRAY[]::text[]
        ) AS tags
    FROM user_media_interactions AS umi
    JOIN media AS m ON m.id = umi.media_id
    LEFT JOIN media_tags AS mt
        ON mt.media_id = m.id AND mt.status = 'approved'
    LEFT JOIN tag_taxonomy AS tt ON tt.id = mt.tag_id
    WHERE umi.user_id = %s
      AND {MEDIA_TYPE_CASE_SQL} IS NOT NULL
    GROUP BY umi.id, umi.media_id, m.media_type,
             umi.interaction_type, umi.rating
    ORDER BY umi.id
"""

_ACTIVE_USER_IDS_SQL = """
    SELECT id
    FROM users
    WHERE account_state = 'active'
    ORDER BY id
"""

_ACTIVE_USER_INTERACTIONS_SQL = f"""
    SELECT
        umi.user_id,
        umi.media_id,
        {MEDIA_TYPE_CASE_SQL} AS preference_media_type,
        umi.interaction_type,
        umi.rating,
        COALESCE(
            array_agg(DISTINCT tt.name ORDER BY tt.name)
                FILTER (WHERE tt.name IS NOT NULL),
            ARRAY[]::text[]
        ) AS tags
    FROM user_media_interactions AS umi
    JOIN users AS u
        ON u.id = umi.user_id AND u.account_state = 'active'
    JOIN media AS m ON m.id = umi.media_id
    LEFT JOIN media_tags AS mt
        ON mt.media_id = m.id AND mt.status = 'approved'
    LEFT JOIN tag_taxonomy AS tt ON tt.id = mt.tag_id
    WHERE {MEDIA_TYPE_CASE_SQL} IS NOT NULL
    GROUP BY umi.user_id, umi.id, umi.media_id, m.media_type,
             umi.interaction_type, umi.rating
    ORDER BY umi.user_id, umi.id
"""


def connect_database() -> Any:
    """Open PostgreSQL using DATABASE_URL or the standard PG* variables."""
    import psycopg

    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg.connect(database_url)

    return psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.getenv("PGDATABASE", "cross_media_recommendation"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD"),
    )


def load_user_interactions(
    user_id: int,
    connection_factory: Optional[Callable[[], Any]] = None,
) -> List[MediaInteraction]:
    """Read active user's interactions and approved media tags from PostgreSQL."""
    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id < 1:
        raise ValueError("user_id must be a positive integer")

    connect = connection_factory or connect_database
    connection = connect()
    try:
        user = connection.execute(_USER_EXISTS_SQL, (user_id,)).fetchone()
        if user is None:
            raise UserNotFoundError(
                f"Active user {user_id} does not exist"
            )

        rows = connection.execute(
            _USER_INTERACTIONS_SQL,
            (user_id,),
        ).fetchall()
        return [
            MediaInteraction(
                media_id=row[0],
                media_type=row[1],
                interaction_type=row[2],
                rating=row[3],
                tags=list(row[4] or []),
            )
            for row in rows
        ]
    finally:
        connection.close()


def load_active_user_preference_profiles(
    connection_factory: Optional[Callable[[], Any]] = None,
) -> Dict[int, PreferenceProfile]:
    """Build preference profiles for all active users in the database."""
    connect = connection_factory or connect_database
    connection = connect()
    try:
        user_ids = [
            row[0]
            for row in connection.execute(_ACTIVE_USER_IDS_SQL).fetchall()
        ]
        interactions_by_user: Dict[int, List[MediaInteraction]] = {
            user_id: [] for user_id in user_ids
        }

        rows = connection.execute(
            _ACTIVE_USER_INTERACTIONS_SQL
        ).fetchall()
        for row in rows:
            interactions_by_user[row[0]].append(
                MediaInteraction(
                    media_id=row[1],
                    media_type=row[2],
                    interaction_type=row[3],
                    rating=row[4],
                    tags=list(row[5] or []),
                )
            )

        return {
            user_id: build_preference_profile(interactions)
            for user_id, interactions in interactions_by_user.items()
        }
    finally:
        connection.close()


def build_user_preference_profile(
    user_id: int,
    connection_factory: Optional[Callable[[], Any]] = None,
) -> PreferenceProfile:
    """Build a normalized preference profile from the user's database activity."""
    interactions = load_user_interactions(
        user_id,
        connection_factory=connection_factory,
    )
    return build_preference_profile(interactions)
