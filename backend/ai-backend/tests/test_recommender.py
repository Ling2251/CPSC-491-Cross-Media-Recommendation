import pytest
from app.services.generator import DummyDataGenerator
from app.services.recommender import BaselineRecommender

def test_recommendations_generated():
    gen = DummyDataGenerator(seed=42)
    users = gen.generate_users(num_users=5)
    media = gen.generate_media(num_media=20)
    ratings = gen.generate_ratings(users, media, ratings_per_user=5)

    recommender = BaselineRecommender(media, ratings)
    recs = recommender.get_recommendations(users[0], top_n=5)

    assert len(recs) <= 5
    assert all(r.media_id > 0 for r in recs)
    assert all(r.score > 0 for r in recs)

def test_no_duplicate_recommendations():
    gen = DummyDataGenerator(seed=42)
    users = gen.generate_users(num_users=3)
    media = gen.generate_media(num_media=15)
    ratings = gen.generate_ratings(users, media, ratings_per_user=3)

    recommender = BaselineRecommender(media, ratings)
    recs = recommender.get_recommendations(users[0], top_n=5)

    media_ids = [r.media_id for r in recs]
    assert len(media_ids) == len(set(media_ids))

def test_recommendations_exclude_rated():
    gen = DummyDataGenerator(seed=42)
    users = gen.generate_users(num_users=3)
    media = gen.generate_media(num_media=15)
    ratings = gen.generate_ratings(users, media, ratings_per_user=3)

    recommender = BaselineRecommender(media, ratings)
    user = users[0]
    rated_media_ids = {r.media_id for r in ratings if r.user_id == user.user_id}

    recs = recommender.get_recommendations(user, top_n=5)
    rec_media_ids = {r.media_id for r in recs}

    assert len(rated_media_ids & rec_media_ids) == 0
