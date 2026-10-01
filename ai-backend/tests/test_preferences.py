import pytest
from app.models.preferences import PreferenceInput, PreferenceResponse, SurveyQuestion
from app.services.preference_manager import PreferenceManager
from app.services.onboarding import OnboardingFlow

def test_preference_input_validation():
    """Test preference input schema validation."""
    prefs = PreferenceInput(
        favorite_genres=["Action", "Sci-Fi"],
        preferred_languages=["English"],
        content_types=["movie", "tv_series"]
    )
    assert len(prefs.favorite_genres) == 2
    assert prefs.rating_threshold == 5.0
    assert prefs.discovery_interest is True

def test_preference_input_min_genres():
    """Test that at least one genre is required."""
    with pytest.raises(ValueError):
        PreferenceInput(
            favorite_genres=[],
            preferred_languages=["English"]
        )

def test_preference_manager_save():
    """Test saving user preferences."""
    manager = PreferenceManager()
    prefs = PreferenceInput(
        favorite_genres=["Comedy"],
        preferred_languages=["English"]
    )
    response = manager.save_preferences(user_id=1, preferences=prefs)
    assert response.preferences_saved is True
    assert response.user_id == 1

def test_preference_manager_retrieve():
    """Test retrieving saved preferences."""
    manager = PreferenceManager()
    prefs = PreferenceInput(
        favorite_genres=["Drama"],
        preferred_languages=["Spanish"]
    )
    manager.save_preferences(user_id=1, preferences=prefs)
    retrieved = manager.get_preferences(user_id=1)
    assert retrieved is not None
    assert retrieved.favorite_genres == ["Drama"]

def test_preference_manager_update():
    """Test updating preferences."""
    manager = PreferenceManager()
    prefs1 = PreferenceInput(
        favorite_genres=["Action"],
        preferred_languages=["English"]
    )
    manager.save_preferences(user_id=1, preferences=prefs1)

    prefs2 = PreferenceInput(
        favorite_genres=["Comedy", "Drama"],
        preferred_languages=["French"]
    )
    response = manager.update_preferences(user_id=1, preferences=prefs2)
    assert response.preferences_saved is True

    updated = manager.get_preferences(user_id=1)
    assert len(updated.favorite_genres) == 2
    assert updated.preferred_languages == ["French"]

def test_onboarding_flow_steps():
    """Test onboarding flow progression."""
    manager = PreferenceManager()
    flow = OnboardingFlow(manager)

    assert flow.get_current_step() == "welcome"
    welcome = flow.get_welcome_message()
    assert "Welcome" in welcome

def test_onboarding_survey_generation():
    """Test survey question generation."""
    manager = PreferenceManager()
    flow = OnboardingFlow(manager)
    survey = flow.get_survey()

    assert len(survey) == 5
    assert survey[0].id == "q1"
    assert survey[0].question_type == "multi_choice"

def test_onboarding_complete():
    """Test onboarding completion."""
    manager = PreferenceManager()
    flow = OnboardingFlow(manager)

    prefs = PreferenceInput(
        favorite_genres=["Action", "Sci-Fi"],
        preferred_languages=["English"],
        discovery_interest=True
    )

    result = flow.process_onboarding_complete(user_id=1, preferences=prefs)
    assert result["status"] == "success"
    assert result["user_id"] == 1

    saved_prefs = manager.get_preferences(user_id=1)
    assert saved_prefs is not None

def test_preference_summary():
    """Test preference summary generation."""
    manager = PreferenceManager()
    flow = OnboardingFlow(manager)

    prefs = PreferenceInput(
        favorite_genres=["Comedy"],
        preferred_languages=["English", "Spanish"],
        rating_threshold=6.5
    )

    summary = flow.get_onboarding_summary(prefs)
    assert summary["favorite_genres"] == ["Comedy"]
    assert len(summary["preferred_languages"]) == 2
    assert summary["rating_threshold"] == 6.5
