from pydantic import BaseModel
from typing import List
from datetime import datetime

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
