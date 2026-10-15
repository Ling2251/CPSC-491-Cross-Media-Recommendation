import pytest
from app.services.generator import DummyDataGenerator

def test_generate_users():
    gen = DummyDataGenerator(seed=42)
    users = gen.generate_users(num_users=10)

    assert len(users) == 10
    assert all(u.user_id > 0 for u in users)
    assert all(len(u.genres) > 0 for u in users)
    assert all(len(u.languages) > 0 for u in users)

def test_generate_media():
    gen = DummyDataGenerator(seed=42)
    media = gen.generate_media(num_media=20)

    assert len(media) == 20
    assert all(m.media_id > 0 for m in media)
    assert all(m.media_type in ["movie", "tv_series", "book", "podcast"] for m in media)
    assert all(0 < m.popularity_score <= 10 for m in media)

def test_generate_ratings():
    gen = DummyDataGenerator(seed=42)
    users = gen.generate_users(num_users=5)
    media = gen.generate_media(num_media=10)
    ratings = gen.generate_ratings(users, media, ratings_per_user=3)

    assert len(ratings) == 15
    assert all(1 <= r.rating <= 5 for r in ratings)

def test_generate_user_preferences():
    gen = DummyDataGenerator(seed=42)
    users = gen.generate_users(num_users=5)
    media = gen.generate_media(num_media=10)
    ratings = gen.generate_ratings(users, media, ratings_per_user=3)
    preferences = gen.generate_user_preferences(users, ratings)

    assert len(preferences) == len(users)
    assert all(0 <= p.avg_rating <= 5 for p in preferences.values())
