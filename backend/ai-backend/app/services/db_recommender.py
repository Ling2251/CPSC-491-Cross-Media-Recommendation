from typing import List

from app.db_store import CandidateMedia
from app.models import Recommendation
from app.preferences import PreferenceInput

GENRE_MATCH_SCORE = 2.0


def rank_candidates(
    candidates: List[CandidateMedia], preferences: PreferenceInput, top_n: int
) -> List[Recommendation]:
    selected = set(preferences.favorite_genres)
    scored = []
    for candidate in candidates:
        matched = sorted(selected & set(candidate.genres))
        if matched:
            scored.append((candidate, GENRE_MATCH_SCORE * len(matched), matched))

    scored.sort(key=lambda item: (-item[1], item[0].media_id))

    return [
        Recommendation(
            media_id=candidate.media_id,
            title=candidate.title,
            score=round(score, 2),
            reason=f"matches your genres ({', '.join(matched)})",
        )
        for candidate, score, matched in scored[:top_n]
    ]
