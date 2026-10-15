import pytest
from app.preferences import PreferenceInput, PreferenceResponse, SurveyQuestion
from app.services.preference_manager import PreferenceManager
from app.services.onboarding import OnboardingFlow
from app.services.onboarding import OnboardingError
from app.preferences import SurveyOption

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

VALID_ANSWERS = {
    "q1": ["Action", "Sci-Fi"],
    "q2": ["English"],
    "q3": ["movie"],
    "q4": 5.0,
    "q5": "yes",
}

def _flow_at_summary(manager):
    flow = OnboardingFlow(manager)
    flow.start_survey()
    prefs = flow.submit_survey(VALID_ANSWERS)
    return flow, prefs

def test_onboarding_complete():
    """Test onboarding completion."""
    manager = PreferenceManager()
    flow, prefs = _flow_at_summary(manager)

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

@pytest.mark.parametrize("threshold", [0.0, 10.0])
def test_rating_threshold_accepts_bounds(threshold):
    prefs = PreferenceInput(
        favorite_genres=["Drama"],
        preferred_languages=["English"],
        rating_threshold=threshold,
    )
    assert prefs.rating_threshold == threshold

@pytest.mark.parametrize("threshold", [-0.1, 10.1])
def test_rating_threshold_rejects_outside_bounds(threshold):
    with pytest.raises(ValueError):
        PreferenceInput(
            favorite_genres=["Drama"],
            preferred_languages=["English"],
            rating_threshold=threshold,
        )

def test_favorite_genres_max_ten_accepted():
    genres = [f"Genre{i}" for i in range(10)]
    prefs = PreferenceInput(favorite_genres=genres, preferred_languages=["English"])
    assert len(prefs.favorite_genres) == 10

def test_favorite_genres_over_ten_rejected():
    genres = [f"Genre{i}" for i in range(11)]
    with pytest.raises(ValueError):
        PreferenceInput(favorite_genres=genres, preferred_languages=["English"])

def test_preferred_languages_empty_rejected():
    with pytest.raises(ValueError):
        PreferenceInput(favorite_genres=["Drama"], preferred_languages=[])

def test_preferred_languages_max_five_accepted():
    languages = ["English", "Spanish", "French", "German", "Japanese"]
    prefs = PreferenceInput(favorite_genres=["Drama"], preferred_languages=languages)
    assert len(prefs.preferred_languages) == 5

def test_preferred_languages_over_five_rejected():
    languages = ["English", "Spanish", "French", "German", "Japanese", "Korean"]
    with pytest.raises(ValueError):
        PreferenceInput(favorite_genres=["Drama"], preferred_languages=languages)

def test_onboarding_repeated_completion_overwrites_preferences():
    manager = PreferenceManager()
    flow, first = _flow_at_summary(manager)
    second = PreferenceInput(favorite_genres=["Romance"], preferred_languages=["French"])

    assert flow.process_onboarding_complete(user_id=7, preferences=first)["status"] == "success"
    assert flow.process_onboarding_complete(user_id=7, preferences=second)["status"] == "success"

    saved = manager.get_preferences(user_id=7)
    assert saved.favorite_genres == ["Romance"]
    assert saved.preferred_languages == ["French"]

@pytest.mark.parametrize("media_type", ["movie", "tv_series", "book", "podcast"])
def test_content_types_accepts_supported_values(media_type):
    prefs = PreferenceInput(
        favorite_genres=["Drama"],
        preferred_languages=["English"],
        content_types=[media_type],
    )
    assert prefs.content_types == [media_type]

@pytest.mark.parametrize("media_type", ["music", "Movie", "video game", ""])
def test_content_types_rejects_unsupported_values(media_type):
    with pytest.raises(ValueError):
        PreferenceInput(
            favorite_genres=["Drama"],
            preferred_languages=["English"],
            content_types=[media_type],
        )


def test_onboarding_progresses_through_all_steps_in_order():
    manager = PreferenceManager()
    flow = OnboardingFlow(manager)
    assert flow.get_current_step() == "welcome"

    flow.start_survey()
    assert flow.get_current_step() == "survey"

    flow.submit_survey(VALID_ANSWERS)
    assert flow.get_current_step() == "preferences_summary"

    flow.process_onboarding_complete(user_id=3, preferences=flow.preferences)
    assert flow.get_current_step() == "complete"
    assert manager.get_preferences(user_id=3).favorite_genres == ["Action", "Sci-Fi"]

def test_survey_cannot_be_submitted_before_starting():
    flow = OnboardingFlow(PreferenceManager())
    with pytest.raises(OnboardingError):
        flow.submit_survey(VALID_ANSWERS)
    assert flow.get_current_step() == "welcome"

def test_completion_cannot_skip_survey_and_summary():
    manager = PreferenceManager()
    flow = OnboardingFlow(manager)
    prefs = PreferenceInput(favorite_genres=["Drama"], preferred_languages=["English"])
    with pytest.raises(OnboardingError):
        flow.process_onboarding_complete(user_id=1, preferences=prefs)
    flow.start_survey()
    with pytest.raises(OnboardingError):
        flow.process_onboarding_complete(user_id=1, preferences=prefs)
    assert manager.get_preferences(user_id=1) is None
    assert flow.get_current_step() == "survey"

def test_start_survey_twice_is_rejected():
    flow = OnboardingFlow(PreferenceManager())
    flow.start_survey()
    with pytest.raises(OnboardingError):
        flow.start_survey()

@pytest.mark.parametrize("missing_key", ["q1", "q2", "q3"])
def test_incomplete_required_survey_answer_is_rejected(missing_key):
    flow = OnboardingFlow(PreferenceManager())
    flow.start_survey()
    answers = {k: v for k, v in VALID_ANSWERS.items() if k != missing_key}
    with pytest.raises(OnboardingError):
        flow.submit_survey(answers)
    assert flow.get_current_step() == "survey"

def test_unsupported_content_type_in_survey_is_rejected():
    flow = OnboardingFlow(PreferenceManager())
    flow.start_survey()
    with pytest.raises(OnboardingError):
        flow.submit_survey({**VALID_ANSWERS, "q3": ["music"]})
    assert flow.get_current_step() == "survey"

def test_survey_discovery_answer_must_be_yes_or_no():
    flow = OnboardingFlow(PreferenceManager())
    flow.start_survey()
    with pytest.raises(OnboardingError):
        flow.submit_survey({**VALID_ANSWERS, "q5": "maybe"})

def test_survey_answers_build_preference_input_with_defaults():
    flow = OnboardingFlow(PreferenceManager())
    flow.start_survey()
    prefs = flow.submit_survey({"q1": ["Drama"], "q2": ["English"], "q3": ["book"]})
    assert prefs.rating_threshold == 5.0
    assert prefs.discovery_interest is True
    assert prefs.content_types == ["book"]

def test_survey_discovery_no_maps_to_false():
    flow = OnboardingFlow(PreferenceManager())
    flow.start_survey()
    prefs = flow.submit_survey({**VALID_ANSWERS, "q5": "no"})
    assert prefs.discovery_interest is False

def test_survey_content_type_labels_and_values():
    q3 = next(q for q in _manager_survey() if q.id == "q3")
    pairs = [(o.label, o.value) for o in q3.options]
    assert pairs == [
        ("Movies", "movie"),
        ("TV Series", "tv_series"),
        ("Books", "book"),
        ("Podcasts", "podcast"),
    ]

def test_survey_content_type_values_are_accepted_by_schema():
    q3 = next(q for q in _manager_survey() if q.id == "q3")
    for option in q3.options:
        assert PreferenceInput(
            favorite_genres=["Drama"],
            preferred_languages=["English"],
            content_types=[option.value],
        ).content_types == [option.value]

def test_survey_genre_and_language_labels_match_values():
    survey = {q.id: q for q in _manager_survey()}
    for qid in ("q1", "q2", "q5"):
        for option in survey[qid].options:
            assert isinstance(option, SurveyOption)
            assert option.label
            assert option.value
    assert all(o.label == o.value for o in survey["q1"].options)
    assert all(o.label == o.value for o in survey["q2"].options)

def _manager_survey():
    return PreferenceManager().generate_initial_survey()
