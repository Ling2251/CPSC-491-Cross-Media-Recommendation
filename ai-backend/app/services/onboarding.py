from typing import List
from app.preferences import PreferenceInput, SurveyQuestion
from app.services.preference_manager import PreferenceManager

class OnboardingFlow:
    """Manages user onboarding and preference collection."""

    def __init__(self, preference_manager: PreferenceManager):
        self.preference_manager = preference_manager
        self.current_step = 0
        self.steps = [
            "welcome",
            "survey",
            "preferences_summary",
            "complete"
        ]

    def get_current_step(self) -> str:
        """Get the current onboarding step."""
        return self.steps[self.current_step]

    def get_welcome_message(self) -> str:
        """Get welcome message for new users."""
        return (
            "Welcome to the AI Recommendation System! "
            "We'll help you discover content tailored to your preferences. "
            "Let's start by learning about what you like."
        )

    def get_survey(self) -> List[SurveyQuestion]:
        """Get the preference survey."""
        return self.preference_manager.generate_initial_survey()

    def process_onboarding_complete(self, user_id: int, preferences: PreferenceInput) -> dict:
        """Process when user completes onboarding."""
        self.preference_manager.save_preferences(user_id, preferences)
        return {
            "status": "success",
            "user_id": user_id,
            "message": "Onboarding complete! Your preferences have been saved.",
            "next_step": "receive_recommendations"
        }

    def get_onboarding_summary(self, preferences: PreferenceInput) -> dict:
        """Get summary of preferences before final confirmation."""
        return {
            "favorite_genres": preferences.favorite_genres,
            "preferred_languages": preferences.preferred_languages,
            "content_types": preferences.content_types,
            "rating_threshold": preferences.rating_threshold,
            "discovery_interest": preferences.discovery_interest,
            "message": "Please review your preferences. You can adjust them at any time."
        }
