from typing import List, Dict, Set
from app.models import User, Media, Rating, Recommendation, UserPreference

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

    def get_recommendations(self, user: User, top_n: int = 5) -> List[Recommendation]:
        user_rated_media = {r.media_id for r in self.ratings_by_user.get(user.user_id, [])}

        unrated_media = [m for m in self.media_list if m.media_id not in user_rated_media]

        scored_media = []
        for media in unrated_media:
            genre_match = len(set(media.genres) & set(user.genres)) > 0
            language_match = len(set(media.languages) & set(user.languages)) > 0

            score = media.popularity_score
            if genre_match:
                score += 2.0
            if language_match:
                score += 1.0

            scored_media.append((media, score))

        scored_media.sort(key=lambda x: x[1], reverse=True)

        recommendations = []
        for media, score in scored_media[:top_n]:
            reason = self._generate_reason(media, user)
            recommendations.append(Recommendation(
                media_id=media.media_id,
                title=media.title,
                score=round(score, 2),
                reason=reason
            ))

        return recommendations

    def _generate_reason(self, media: Media, user: User) -> str:
        genre_match = set(media.genres) & set(user.genres)
        language_match = set(media.languages) & set(user.languages)

        reasons = []
        if genre_match:
            reasons.append(f"matches your genres ({', '.join(genre_match)})")
        if language_match:
            reasons.append(f"available in your language ({', '.join(language_match)})")
        reasons.append(f"popular ({media.popularity_score}/10)")

        return "; ".join(reasons)
