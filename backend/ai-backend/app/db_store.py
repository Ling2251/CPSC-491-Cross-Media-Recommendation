from dataclasses import dataclass
from typing import List, Optional

import psycopg
from pydantic import ValidationError

from app.preferences import PreferenceInput


@dataclass(frozen=True)
class CandidateMedia:
    media_id: int
    title: str
    media_type: str
    genres: List[str]


def user_exists(conn: psycopg.Connection, user_id: int) -> bool:
    row = conn.execute("SELECT 1 FROM users WHERE id = %s", (user_id,)).fetchone()
    return row is not None


def get_preferences(conn: psycopg.Connection, user_id: int) -> Optional[PreferenceInput]:
    row = conn.execute(
        """
        SELECT favorite_genres, preferred_languages, content_types, rating_threshold, discovery_interest
        FROM user_preferences
        WHERE user_id = %s
        """,
        (user_id,),
    ).fetchone()
    if row is None:
        return None
    genres, languages, content_types, threshold, discovery = row
    try:
        return PreferenceInput(
            favorite_genres=list(genres),
            preferred_languages=list(languages),
            content_types=list(content_types),
            rating_threshold=float(threshold),
            discovery_interest=bool(discovery),
        )
    except ValidationError:
        return None


def save_preferences(conn: psycopg.Connection, user_id: int, preferences: PreferenceInput) -> None:
    conn.execute(
        """
        INSERT INTO user_preferences (
            user_id, favorite_genres, preferred_languages, content_types,
            rating_threshold, discovery_interest, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, now())
        ON CONFLICT (user_id) DO UPDATE SET
            favorite_genres = EXCLUDED.favorite_genres,
            preferred_languages = EXCLUDED.preferred_languages,
            content_types = EXCLUDED.content_types,
            rating_threshold = EXCLUDED.rating_threshold,
            discovery_interest = EXCLUDED.discovery_interest,
            updated_at = now()
        """,
        (
            user_id,
            preferences.favorite_genres,
            preferences.preferred_languages,
            preferences.content_types,
            preferences.rating_threshold,
            preferences.discovery_interest,
        ),
    )


def candidate_media(
    conn: psycopg.Connection, user_id: int, content_types: List[str]
) -> List[CandidateMedia]:
    rows = conn.execute(
        """
        SELECT m.id, m.title, m.media_type,
               COALESCE(
                   array_agg(DISTINCT t.name)
                       FILTER (WHERE t.category = 'genre' AND mt.status = 'approved'),
                   '{}'
               ) AS genres
        FROM media m
        LEFT JOIN media_tags mt ON mt.media_id = m.id
        LEFT JOIN tag_taxonomy t ON t.id = mt.tag_id
        WHERE m.media_type = ANY(%s)
          AND NOT EXISTS (
              SELECT 1 FROM user_media_interactions i
              WHERE i.user_id = %s
                AND i.media_id = m.id
                AND i.interaction_type IN ('rated', 'consumed')
          )
        GROUP BY m.id, m.title, m.media_type
        ORDER BY m.id
        """,
        (content_types, user_id),
    ).fetchall()
    return [CandidateMedia(media_id=r[0], title=r[1], media_type=r[2], genres=list(r[3])) for r in rows]
