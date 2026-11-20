import logging
import os
import time
from pathlib import Path

import jwt
import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import app

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
MIGRATIONS = Path(__file__).resolve().parents[3] / "database" / "migrations"

pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL not set; CI provides a PostgreSQL service",
)

client = TestClient(app, raise_server_exceptions=False)
SECRET = "sprint4-test-secret-not-used-outside-tests"


def _token(user_id):
    now = int(time.time())
    return {"Authorization": "Bearer " + jwt.encode({"userId": user_id, "iat": now, "exp": now + 600}, SECRET, algorithm="HS256")}


@pytest.fixture(scope="module")
def migrated_url():
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
        for migration in sorted(MIGRATIONS.glob("*.sql")):
            conn.execute(migration.read_text(encoding="utf-8"))
    return TEST_DATABASE_URL


@pytest.fixture
def db(migrated_url, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", migrated_url)
    monkeypatch.setenv("JWT_SECRET", SECRET)
    with psycopg.connect(migrated_url, autocommit=True) as conn:
        conn.execute("TRUNCATE users, media, tag_taxonomy, media_tags, user_media_interactions, user_preferences RESTART IDENTITY CASCADE")
        conn.execute(
            "INSERT INTO users (id, name, email, password_hash) VALUES "
            "(1, 'Ann', 'ann@example.test', 'x'), (2, 'Ben', 'ben@example.test', 'x')"
        )
        conn.execute(
            "INSERT INTO media (id, title, media_type) VALUES "
            "(1, 'Dark Drama', 'movie'), (2, 'Laughs', 'movie'), (3, 'Noir Book', 'book'), "
            "(4, 'Pod Talk', 'podcast'), (5, 'Drama Series', 'tv_series')"
        )
        conn.execute(
            "INSERT INTO tag_taxonomy (id, name, category) VALUES "
            "(1, 'Drama', 'genre'), (2, 'Comedy', 'genre'), (3, 'Noir', 'genre'), (4, 'Adult', 'audience')"
        )
        conn.execute(
            "INSERT INTO media_tags (media_id, tag_id, source, status) VALUES "
            "(1, 1, 'manual', 'approved'), (2, 2, 'manual', 'approved'), "
            "(3, 3, 'manual', 'approved'), (3, 1, 'manual', 'approved'), "
            "(4, 2, 'manual', 'approved'), (5, 1, 'manual', 'approved'), "
            "(5, 2, 'manual', 'pending_review'), (2, 4, 'manual', 'approved')"
        )
        conn.execute(
            "INSERT INTO user_media_interactions (user_id, media_id, interaction_type, rating) VALUES "
            "(1, 5, 'rated', 4), (2, 1, 'consumed', NULL)"
        )
    yield migrated_url


def _set_preferences(user_id, **overrides):
    body = {
        "favorite_genres": ["Drama"],
        "preferred_languages": ["English"],
        "content_types": ["movie", "tv_series", "book"],
        "rating_threshold": 5.0,
        "discovery_interest": True,
    }
    body.update(overrides)
    return client.put(f"/preferences/{user_id}", json=body, headers=_token(user_id))


def test_preferences_round_trip_for_owner(db):
    response = _set_preferences(1, favorite_genres=["Comedy"])
    assert response.status_code == 200
    assert response.json()["favorite_genres"] == ["Comedy"]

    read_back = client.get("/preferences/1", headers=_token(1))
    assert read_back.status_code == 200
    assert read_back.json()["favorite_genres"] == ["Comedy"]
    assert read_back.json()["content_types"] == ["movie", "tv_series", "book"]


def test_preferences_update_replaces_previous_values(db):
    _set_preferences(1, favorite_genres=["Comedy"])
    _set_preferences(1, favorite_genres=["Drama", "Noir"], content_types=["book"])

    body = client.get("/preferences/1", headers=_token(1)).json()
    assert body["favorite_genres"] == ["Drama", "Noir"]
    assert body["content_types"] == ["book"]


def test_read_without_saved_preferences_returns_404(db):
    response = client.get("/preferences/2", headers=_token(2))
    assert response.status_code == 404


def test_save_for_unknown_user_returns_404(db):
    response = client.put(
        "/preferences/999",
        json={"favorite_genres": ["Drama"], "preferred_languages": ["English"]},
        headers=_token(999),
    )
    assert response.status_code == 404


def test_save_rejects_unsupported_content_type_at_api_and_db(db):
    response = _set_preferences(1, content_types=["music"])
    assert response.status_code == 422
    with psycopg.connect(db) as conn:
        count = conn.execute("SELECT COUNT(*) FROM user_preferences").fetchone()[0]
    assert count == 0


def test_cannot_save_preferences_for_another_user(db):
    response = client.put(
        "/preferences/2",
        json={"favorite_genres": ["Drama"], "preferred_languages": ["English"]},
        headers=_token(1),
    )
    assert response.status_code == 403


def test_recommendations_use_saved_preferences_and_exclude_rated_and_consumed(db):
    _set_preferences(1, favorite_genres=["Drama"], content_types=["movie", "tv_series", "book"])

    response = client.get("/recommend/1", headers=_token(1))
    assert response.status_code == 200
    body = response.json()
    assert [r["media_id"] for r in body["recommendations"]] == [1, 3]
    assert [r["score"] for r in body["recommendations"]] == [2.0, 2.0]
    assert body["recommendations"][0]["reason"] == "matches your genres (Drama)"


def test_more_matched_genres_rank_higher(db):
    _set_preferences(1, favorite_genres=["Drama", "Noir"], content_types=["movie", "tv_series", "book"])

    body = client.get("/recommend/1", headers=_token(1)).json()
    assert [r["media_id"] for r in body["recommendations"]] == [3, 1]
    assert body["recommendations"][0]["score"] == 4.0


def test_unapproved_tags_do_not_count_as_matches(db):
    _set_preferences(2, favorite_genres=["Comedy"], content_types=["tv_series"])

    body = client.get("/recommend/2", headers=_token(2)).json()
    assert body["recommendations"] == []


def test_consumed_media_is_excluded_from_recommendations(db):
    _set_preferences(2, favorite_genres=["Drama"], content_types=["movie"])

    body = client.get("/recommend/2", headers=_token(2)).json()
    assert body["recommendations"] == []


def test_content_type_filter_applies_in_database_query(db):
    _set_preferences(1, favorite_genres=["Drama"], content_types=["book"])

    body = client.get("/recommend/1", headers=_token(1)).json()
    assert [r["media_id"] for r in body["recommendations"]] == [3]


def test_recommendations_without_saved_preferences_return_404(db):
    response = client.get("/recommend/2", headers=_token(2))
    assert response.status_code == 404


def test_database_unavailable_returns_503_without_leaking_credentials(monkeypatch, caplog):
    caplog.set_level(logging.INFO)
    monkeypatch.setenv("DATABASE_URL", "postgresql://app:BADPASS-XYZ-789@127.0.0.1:1/cross_media")
    monkeypatch.setenv("JWT_SECRET", SECRET)

    response = client.get("/preferences/1", headers=_token(1))

    assert response.status_code == 503
    assert "BADPASS" not in response.text
    text = "\n".join(r.getMessage() for r in caplog.records)
    assert "BADPASS" not in text
    assert "postgresql://" not in text
    assert any(getattr(r, "event", None) == "DB_CONNECTION_FAILURE" for r in caplog.records)


def test_database_not_configured_returns_503(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("JWT_SECRET", SECRET)
    response = client.get("/preferences/1", headers=_token(1))
    assert response.status_code == 503
