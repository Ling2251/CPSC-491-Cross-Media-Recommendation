from datetime import datetime

from app.models import Media, Rating, User
from app.preferences import PreferenceInput
from app.services.recommender import BaselineRecommender

def _media(media_id, title, media_type="movie", genres=(), languages=(), popularity=5.0):
    return Media(
        media_id=media_id,
        title=title,
        media_type=media_type,
        genres=list(genres),
        languages=list(languages),
        popularity_score=popularity,
    )

def _user(genres=("Drama",), languages=("English",)):
    return User(user_id=1, name="Viewer", genres=list(genres), languages=list(languages))

def _prefs(genres=("Drama",), languages=("English",), content_types=("movie", "tv_series", "book", "podcast")):
    return PreferenceInput(
        favorite_genres=list(genres),
        preferred_languages=list(languages),
        content_types=list(content_types),
    )

def test_preferred_genre_outranks_more_popular_non_match():
    horror = _media(1, "Horror Hit", genres=["Horror"], popularity=7.5)
    comedy = _media(2, "Comedy Pick", genres=["Comedy"], popularity=6.0)
    recommender = BaselineRecommender([horror, comedy], ratings=[])

    without = recommender.get_recommendations(_user(genres=["Drama"]), top_n=2)
    assert [r.title for r in without] == ["Horror Hit", "Comedy Pick"]

    with_prefs = recommender.get_recommendations(
        _user(genres=["Drama"]), top_n=2, preferences=_prefs(genres=["Comedy"])
    )
    assert [r.title for r in with_prefs] == ["Comedy Pick", "Horror Hit"]
    assert with_prefs[0].score == 8.0

def test_preferred_language_adds_bonus_and_changes_order():
    french = _media(1, "French Film", languages=["French"], genres=["Thriller"], popularity=6.5)
    spanish = _media(2, "Spanish Film", languages=["Spanish"], genres=["Thriller"], popularity=6.0)
    recommender = BaselineRecommender([french, spanish], ratings=[])

    prefs = _prefs(genres=["Action"], languages=["Spanish"])
    results = recommender.get_recommendations(_user(genres=["Action"], languages=["English"]), top_n=2, preferences=prefs)
    assert [r.title for r in results] == ["Spanish Film", "French Film"]
    assert results[0].score == 7.0
    assert "available in your language (Spanish)" in results[0].reason

def test_content_types_filter_excludes_unselected_media_types():
    book = _media(1, "Great Book", media_type="book", genres=["Drama"], popularity=9.0)
    movie = _media(2, "Plain Movie", media_type="movie", genres=["Drama"], popularity=4.0)
    recommender = BaselineRecommender([book, movie], ratings=[])

    results = recommender.get_recommendations(
        _user(), top_n=5, preferences=_prefs(content_types=["movie"])
    )
    assert [r.title for r in results] == ["Plain Movie"]

def test_no_eligible_media_returns_empty_list():
    movie = _media(1, "Only Movie", media_type="movie", genres=["Drama"])
    recommender = BaselineRecommender([movie], ratings=[])

    results = recommender.get_recommendations(
        _user(), top_n=5, preferences=_prefs(content_types=["podcast"])
    )
    assert results == []

def test_rated_media_stays_excluded_with_preferences():
    rated = _media(1, "Already Seen", genres=["Comedy"], popularity=9.0)
    fresh = _media(2, "Fresh Pick", genres=["Comedy"], popularity=1.0)
    ratings = [Rating(user_id=1, media_id=1, rating=4.0, timestamp=datetime(2026, 1, 1))]
    recommender = BaselineRecommender([rated, fresh], ratings=ratings)

    results = recommender.get_recommendations(
        _user(), top_n=5, preferences=_prefs(genres=["Comedy"])
    )
    assert [r.media_id for r in results] == [2]

def test_without_preferences_uses_user_profile_as_before():
    comedy = _media(1, "Comedy Pick", genres=["Comedy"], popularity=6.0)
    horror = _media(2, "Horror Hit", genres=["Horror"], popularity=7.5)
    recommender = BaselineRecommender([comedy, horror], ratings=[])

    user = _user(genres=["Comedy"])
    implicit = recommender.get_recommendations(user, top_n=2)
    explicit_none = recommender.get_recommendations(user, top_n=2, preferences=None)

    assert [r.media_id for r in implicit] == [1, 2]
    assert implicit == explicit_none

def test_preferences_do_not_modify_user_profile():
    user = _user(genres=["Drama"], languages=["English"])
    recommender = BaselineRecommender([_media(1, "Any", genres=["Comedy"])], ratings=[])

    recommender.get_recommendations(user, preferences=_prefs(genres=["Comedy"], languages=["French"]))

    assert user.genres == ["Drama"]
    assert user.languages == ["English"]

def test_reason_lists_selected_genres_in_sorted_order():
    media = _media(1, "Multi Genre", genres=["Thriller", "Action"], popularity=5.0)
    recommender = BaselineRecommender([media], ratings=[])

    result = recommender.get_recommendations(
        _user(), preferences=_prefs(genres=["Thriller", "Action"])
    )
    assert result[0].reason.startswith("matches your genres (Action, Thriller)")
