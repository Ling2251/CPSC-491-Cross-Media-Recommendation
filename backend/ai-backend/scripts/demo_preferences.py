import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.generator import DummyDataGenerator
from app.services.preference_manager import PreferenceManager
from app.services.recommender import BaselineRecommender
from app.preferences import PreferenceInput

USER_ID = 1
TOP_N = 5


def print_recommendations(title, results):
    print(title)
    for rank, rec in enumerate(results, start=1):
        print(f"  {rank}. {rec.title} (score {rec.score}) - {rec.reason}")
    if not results:
        print("  (no eligible media)")
    print()


def main():
    generator = DummyDataGenerator(seed=42)
    users = generator.generate_users(num_users=50)
    media = generator.generate_media(num_media=100)
    ratings = generator.generate_ratings(users, media, ratings_per_user=15)

    user = next(u for u in users if u.user_id == USER_ID)
    rated = sorted(r.media_id for r in ratings if r.user_id == USER_ID)
    recommender = BaselineRecommender(media, ratings)

    print(f"Dummy user {user.user_id} ({user.name})")
    print(f"  Profile genres:    {', '.join(user.genres)}")
    print(f"  Profile languages: {', '.join(user.languages)}")
    print(f"  Already rated:     {len(rated)} media items (excluded from results)")
    print()

    print_recommendations(
        "Recommendations without saved preferences (uses profile):",
        recommender.get_recommendations(user, top_n=TOP_N),
    )

    new_genre = next(g for g in generator.genres if g not in user.genres)
    new_language = next(lang for lang in generator.languages if lang not in user.languages)
    preferences = PreferenceInput(
        favorite_genres=[new_genre],
        preferred_languages=[new_language],
        content_types=["movie"],
    )

    manager = PreferenceManager()
    manager.save_preferences(USER_ID, preferences)
    saved = manager.get_preferences(USER_ID)

    print("Saved preferences for this user:")
    print(f"  Genres:        {', '.join(saved.favorite_genres)}")
    print(f"  Languages:     {', '.join(saved.preferred_languages)}")
    print(f"  Content types: {', '.join(saved.content_types)}")
    print()

    print_recommendations(
        "Recommendations with saved preferences:",
        recommender.get_recommendations(user, top_n=TOP_N, preferences=saved),
    )


if __name__ == "__main__":
    main()
