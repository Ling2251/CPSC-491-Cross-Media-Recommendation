from typing import List, Dict, Tuple
from app.models import User, Media, Rating, UserPreference

class DataValidator:
    @staticmethod
    def validate_users(users: List[User]) -> Tuple[bool, List[str]]:
        errors = []

        if not users:
            errors.append("Users list is empty")

        user_ids = set()
        for user in users:
            if user.user_id in user_ids:
                errors.append(f"Duplicate user_id: {user.user_id}")
            user_ids.add(user.user_id)

            if not user.name or len(user.name.strip()) == 0:
                errors.append(f"User {user.user_id} has invalid name")

            if not user.genres or len(user.genres) == 0:
                errors.append(f"User {user.user_id} has no genres")

            if not user.languages or len(user.languages) == 0:
                errors.append(f"User {user.user_id} has no languages")

        return len(errors) == 0, errors

    @staticmethod
    def validate_media(media_list: List[Media]) -> Tuple[bool, List[str]]:
        errors = []

        if not media_list:
            errors.append("Media list is empty")

        media_ids = set()
        for media in media_list:
            if media.media_id in media_ids:
                errors.append(f"Duplicate media_id: {media.media_id}")
            media_ids.add(media.media_id)

            if not media.title or len(media.title.strip()) == 0:
                errors.append(f"Media {media.media_id} has invalid title")

            if media.media_type not in ["movie", "tv_series", "book", "podcast"]:
                errors.append(f"Media {media.media_id} has invalid media_type")

            if not media.genres or len(media.genres) == 0:
                errors.append(f"Media {media.media_id} has no genres")

            if media.popularity_score < 0 or media.popularity_score > 10:
                errors.append(f"Media {media.media_id} has invalid popularity_score")

        return len(errors) == 0, errors

    @staticmethod
    def validate_ratings(ratings: List[Rating], users: List[User], media: List[Media]) -> Tuple[bool, List[str]]:
        errors = []

        if not ratings:
            errors.append("Ratings list is empty")

        valid_user_ids = {u.user_id for u in users}
        valid_media_ids = {m.media_id for m in media}

        for rating in ratings:
            if rating.user_id not in valid_user_ids:
                errors.append(f"Rating has invalid user_id: {rating.user_id}")

            if rating.media_id not in valid_media_ids:
                errors.append(f"Rating has invalid media_id: {rating.media_id}")

            if rating.rating < 1.0 or rating.rating > 5.0:
                errors.append(f"Rating has invalid score: {rating.rating}")

        return len(errors) == 0, errors

    @staticmethod
    def validate_preferences(preferences: Dict[int, UserPreference], users: List[User]) -> Tuple[bool, List[str]]:
        errors = []

        valid_user_ids = {u.user_id for u in users}

        for user_id, pref in preferences.items():
            if user_id not in valid_user_ids:
                errors.append(f"Preference has invalid user_id: {user_id}")

            if pref.avg_rating < 0 or pref.avg_rating > 5:
                errors.append(f"Preference for user {user_id} has invalid avg_rating")

        return len(errors) == 0, errors
