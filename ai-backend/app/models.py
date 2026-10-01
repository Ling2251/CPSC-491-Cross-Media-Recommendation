from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class User(BaseModel):
    user_id: int
    name: str
    genres: List[str]
    languages: List[str]


class Media(BaseModel):
    media_id: int
    title: str
    media_type: str
    genres: List[str]
    languages: List[str]
    popularity_score: float

    # Sprint 2 provenance fields. They are optional so Sprint 1 dummy data
    # and existing recommender code remain backward compatible.
    source: Optional[str] = None
    source_id: Optional[str] = None
    source_url: Optional[str] = None
    retrieved_at: Optional[datetime] = None


class Rating(BaseModel):
    user_id: int
    media_id: int
    rating: float
    timestamp: datetime


class UserPreference(BaseModel):
    user_id: int
    genres: List[str]
    languages: List[str]
    avg_rating: float


class Recommendation(BaseModel):
    media_id: int
    title: str
    score: float
    reason: str


class RecommendationResponse(BaseModel):
    user_id: int
    recommendations: List[Recommendation]
