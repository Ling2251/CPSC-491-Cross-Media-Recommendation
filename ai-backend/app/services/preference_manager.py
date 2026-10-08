from typing import Dict, List, Optional
from app.preferences import PreferenceInput, PreferenceResponse, SurveyQuestion, SurveyResponse
from app.services.recommender import BaselineRecommender

class PreferenceManager:
    """Manages user preference collection and storage."""

    def __init__(self):
        self.preference_store: Dict[int, PreferenceInput] = {}
        self.survey_responses: Dict[int, List[SurveyResponse]] = {}

    def save_preferences(self, user_id: int, preferences: PreferenceInput) -> PreferenceResponse:
        """Save user preferences from onboarding."""
        self.preference_store[user_id] = preferences
        return PreferenceResponse(
            user_id=user_id,
            preferences_saved=True,
            recommendation_count=0,
            message=f"Preferences saved for user {user_id}. Ready to receive recommendations."
        )

    def get_preferences(self, user_id: int) -> Optional[PreferenceInput]:
        """Retrieve user preferences."""
        return self.preference_store.get(user_id)

    def update_preferences(self, user_id: int, preferences: PreferenceInput) -> PreferenceResponse:
        """Update existing preferences."""
        return self.save_preferences(user_id, preferences)

    def record_survey_response(self, user_id: int, response: SurveyResponse) -> bool:
        """Record a survey response."""
        if user_id not in self.survey_responses:
            self.survey_responses[user_id] = []
        self.survey_responses[user_id].append(response)
        return True

    def get_survey_responses(self, user_id: int) -> List[SurveyResponse]:
        """Get all survey responses from a user."""
        return self.survey_responses.get(user_id, [])

    def generate_initial_survey(self) -> List[SurveyQuestion]:
        """Generate initial onboarding survey."""
        return [
            SurveyQuestion(
                id="q1",
                question="What are your favorite media genres?",
                question_type="multi_choice",
                options=["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Animation"],
                required=True
            ),
            SurveyQuestion(
                id="q2",
                question="What languages do you prefer?",
                question_type="multi_choice",
                options=["English", "Spanish", "French", "German", "Japanese", "Korean"],
                required=True
            ),
            SurveyQuestion(
                id="q3",
                question="What types of media interest you?",
                question_type="multi_choice",
                options=["Movies", "TV Series", "Books", "Podcasts"],
                required=True
            ),
            SurveyQuestion(
                id="q4",
                question="What's your minimum acceptable rating?",
                question_type="rating",
                required=False
            ),
            SurveyQuestion(
                id="q5",
                question="Are you open to discovering new content?",
                question_type="single_choice",
                options=["Yes", "No"],
                required=False
            )
        ]
