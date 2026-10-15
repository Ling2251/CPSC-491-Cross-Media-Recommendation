from typing import Any, Dict, List
from app.preferences import PreferenceInput, SurveyQuestion
from app.services.preference_manager import PreferenceManager

class OnboardingError(ValueError):
    """Raised when an onboarding step is out of order or its answers are incomplete or invalid."""

class OnboardingFlow:
    """Walks a user through welcome, survey, summary, and completion in order."""

    steps = ("welcome", "survey", "preferences_summary", "complete")

    def __init__(self, preference_manager: PreferenceManager):
        self.preference_manager = preference_manager
        self._index = 0
        self.preferences: PreferenceInput | None = None

    def get_current_step(self) -> str:
        return self.steps[self._index]

    def _require_step(self, *allowed: str) -> None:
        if self.get_current_step() not in allowed:
            raise OnboardingError(
                f"Step '{self.get_current_step()}' does not allow this action; expected one of {list(allowed)}"
            )

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

    def start_survey(self) -> None:
        self._require_step("welcome")
        self._index = self.steps.index("survey")

    def submit_survey(self, answers: Dict[str, Any]) -> PreferenceInput:
        """Validate survey answers keyed q1..q5 and move to the summary step.

        q1 genres, q2 languages, q3 content types (stored values) are required.
        q4 rating threshold and q5 discovery answer ("yes" or "no") are optional.
        """
        self._require_step("survey")
        missing = [key for key in ("q1", "q2", "q3") if not answers.get(key)]
        if missing:
            raise OnboardingError(f"Missing required survey answers: {missing}")

        discovery = answers.get("q5", "yes")
        if discovery not in ("yes", "no"):
            raise OnboardingError(f"q5 must be 'yes' or 'no', got {discovery!r}")

        try:
            preferences = PreferenceInput(
                favorite_genres=answers["q1"],
                preferred_languages=answers["q2"],
                content_types=answers["q3"],
                rating_threshold=float(answers.get("q4", 5.0)),
                discovery_interest=discovery == "yes",
            )
        except ValueError as exc:
            raise OnboardingError(str(exc)) from exc

        self.preferences = preferences
        self._index = self.steps.index("preferences_summary")
        return preferences

    def process_onboarding_complete(self, user_id: int, preferences: PreferenceInput) -> dict:
        """Save preferences once the summary is reached; repeating after completion updates them."""
        self._require_step("preferences_summary", "complete")
        self.preference_manager.save_preferences(user_id, preferences)
        self.preferences = preferences
        self._index = self.steps.index("complete")
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
