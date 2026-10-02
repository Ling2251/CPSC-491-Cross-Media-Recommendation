import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from app.models import User, Media, Rating, UserPreference

class DummyDataGenerator:
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.genres = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Animation"]
        self.languages = ["English", "Spanish", "French", "German", "Japanese", "Korean"]
        self.media_types = ["movie", "tv_series", "book", "podcast"]

    def generate_users(self, num_users: int = 50) -> List[User]:
        users = []
        for i in range(1, num_users + 1):
            user = User(
                user_id=i,
                name=f"User_{i}",
                genres=random.sample(self.genres, k=random.randint(2, 5)),
                languages=random.sample(self.languages, k=random.randint(1, 3))
            )
            users.append(user)
        return users

    def generate_media(self, num_media: int = 100) -> List[Media]:
        media_list = []
        for i in range(1, num_media + 1):
            media = Media(
                media_id=i,
                title=f"Media_{i}",
                media_type=random.choice(self.media_types),
                genres=random.sample(self.genres, k=random.randint(1, 3)),
                languages=random.sample(self.languages, k=random.randint(1, 2)),
                popularity_score=round(random.uniform(1.0, 10.0), 2)
            )
            media_list.append(media)
        return media_list

    def generate_ratings(self, users: List[User], media: List[Media], ratings_per_user: int = 15) -> List[Rating]:
        ratings = []
        for user in users:
            sampled_media = random.sample(media, k=min(ratings_per_user, len(media)))
            for m in sampled_media:
                rating = Rating(
                    user_id=user.user_id,
                    media_id=m.media_id,
                    rating=random.uniform(1.0, 5.0),
                    timestamp=datetime.now() - timedelta(days=random.randint(1, 90))
                )
                ratings.append(rating)
        return ratings

    def generate_user_preferences(self, users: List[User], ratings: List[Rating]) -> Dict[int, UserPreference]:
        user_ratings_map = {}
        for rating in ratings:
            if rating.user_id not in user_ratings_map:
                user_ratings_map[rating.user_id] = []
            user_ratings_map[rating.user_id].append(rating.rating)

        preferences = {}
        for user in users:
            avg_rating = sum(user_ratings_map.get(user.user_id, [0])) / len(user_ratings_map.get(user.user_id, [1]))
            preferences[user.user_id] = UserPreference(
                user_id=user.user_id,
                genres=user.genres,
                languages=user.languages,
                avg_rating=round(avg_rating, 2)
            )
        return preferences
