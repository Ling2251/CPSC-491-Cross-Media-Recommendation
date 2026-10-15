import pytest
from app.models import User, Media, Rating
from app.services.validator import DataValidator
from app.services.generator import DummyDataGenerator
from datetime import datetime

def test_validate_valid_users():
    users = [
        User(user_id=1, name="User 1", genres=["Action"], languages=["English"]),
        User(user_id=2, name="User 2", genres=["Comedy"], languages=["Spanish"])
    ]

    is_valid, errors = DataValidator.validate_users(users)
    assert is_valid
    assert len(errors) == 0

def test_validate_invalid_users():
    users = [
        User(user_id=1, name="", genres=["Action"], languages=["English"]),
        User(user_id=1, name="User 2", genres=[], languages=["Spanish"])
    ]

    is_valid, errors = DataValidator.validate_users(users)
    assert not is_valid
    assert len(errors) > 0

def test_validate_valid_media():
    media = [
        Media(media_id=1, title="Movie 1", media_type="movie", genres=["Action"], languages=["English"], popularity_score=7.5),
        Media(media_id=2, title="Show 1", media_type="tv_series", genres=["Comedy"], languages=["Spanish"], popularity_score=6.0)
    ]

    is_valid, errors = DataValidator.validate_media(media)
    assert is_valid
    assert len(errors) == 0

def test_validate_invalid_media():
    media = [
        Media(media_id=1, title="Movie 1", media_type="invalid", genres=["Action"], languages=["English"], popularity_score=7.5),
        Media(media_id=2, title="Show 1", media_type="movie", genres=[], languages=["Spanish"], popularity_score=15.0)
    ]

    is_valid, errors = DataValidator.validate_media(media)
    assert not is_valid
    assert len(errors) > 0

def test_validate_ratings():
    gen = DummyDataGenerator(seed=42)
    users = gen.generate_users(num_users=5)
    media = gen.generate_media(num_media=10)
    ratings = gen.generate_ratings(users, media, ratings_per_user=3)

    is_valid, errors = DataValidator.validate_ratings(ratings, users, media)
    assert is_valid
    assert len(errors) == 0
