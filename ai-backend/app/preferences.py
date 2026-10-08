from typing import Any
from typing import List, Optional
from pydantic import BaseModel, Field

class PreferenceInput(BaseModel):
    """User preference input schema for onboarding."""
    favorite_genres: List[str] = Field(..., min_items=1, max_items=10)
    preferred_languages: List[str] = Field(..., min_items=1, max_items=5)
    content_types: List[str] = Field(default=["movie", "tv_series"], description="Preferred media types")
    rating_threshold: float = Field(default=5.0, ge=0.0, le=10.0, description="Minimum rating to recommend")
    discovery_interest: bool = Field(default=True, description="Open to discovering new content")

class PreferenceResponse(BaseModel):
    """Response after preference submission."""
    user_id: int
    preferences_saved: bool
    recommendation_count: int
    message: str

class SurveyQuestion(BaseModel):
    """Survey question for preference gathering."""
    id: str
    question: str
    question_type: str  # "single_choice", "multi_choice", "rating", "text"
    options: Optional[List[str]] = None
    required: bool = True

class SurveyResponse(BaseModel):
    """User's survey responses."""
    user_id: int
    question_id: str
    answer: Any
    timestamp: str
