from typing import List, Dict, Optional, Set
from app.models import User, Media, Rating, Recommendation, UserPreference
from app.preferences import PreferenceInput

class BaselineRecommender:
    def __init__(self, media_list: List[Media], ratings: List[Rating]):
        self.media_list = media_list
        self.ratings = ratings
        self.media_by_id = {m.media_id: m for m in media_list}
        self.ratings_by_user = self._build_ratings_map()

    def _build_ratings_map(self) -> Dict[int, List[Rating]]:
        ratings_map = {}
        for rating in self.ratings:
            if rating.user_id not in ratings_map:
                ratings_map[rating.user_id] = []
            ratings_map[rating.user_id].append(rating)
        return ratings_map

    def get_recommendations(
        self,
        user: User,
        top_n: int = 5,
        preferences: Optional[PreferenceInput] = None,
    ) -> List[Recommendation]:
        if preferences is None:
            genres: Set[str] = set(user.genres)
            languages: Set[str] = set(user.languages)
            content_types: Optional[Set[str]] = None
        else:
            genres = set(preferences.favorite_genres)
            languages = set(preferences.preferred_languages)
            content_types = set(preferences.content_types)

        user_rated_media = {r.media_id for r in self.ratings_by_user.get(user.user_id, [])}

        candidates = [
            m for m in self.media_list
            if m.media_id not in user_rated_media
            and (content_types is None or m.media_type in content_types)
        ]

        scored_media = []
        for media in candidates:
            genre_match = len(set(media.genres) & genres) > 0
            language_match = len(set(media.languages) & languages) > 0

            score = media.popularity_score
            if genre_match:
                score += 2.0
            if language_match:
                score += 1.0

            scored_media.append((media, score))

        scored_media.sort(key=lambda x: x[1], reverse=True)

        recommendations = []
        for media, score in scored_media[:top_n]:
            reason = self._generate_reason(media, genres, languages)
            recommendations.append(Recommendation(
                media_id=media.media_id,
                title=media.title,
                score=round(score, 2),
                reason=reason
            ))

        return recommendations

    def _generate_reason(self, media: Media, genres: Set[str], languages: Set[str]) -> str:
        genre_match = set(media.genres) & genres
        language_match = set(media.languages) & languages

        reasons = []
        if genre_match:
            reasons.append(f"matches your genres ({', '.join(sorted(genre_match))})")
        if language_match:
            reasons.append(f"available in your language ({', '.join(sorted(language_match))})")
        reasons.append(f"popular ({media.popularity_score}/10)")

        return "; ".join(reasons)
