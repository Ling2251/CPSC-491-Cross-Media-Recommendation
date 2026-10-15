from fastapi import FastAPI, HTTPException
from app.models import RecommendationResponse
from app.services.generator import DummyDataGenerator
from app.services.validator import DataValidator
from app.services.recommender import BaselineRecommender

app = FastAPI(title="AI Recommendation Backend", version="Sprint 1")

generator = DummyDataGenerator(seed=42)
users = generator.generate_users(num_users=50)
media = generator.generate_media(num_media=100)
ratings = generator.generate_ratings(users, media, ratings_per_user=15)
user_preferences = generator.generate_user_preferences(users, ratings)

validator = DataValidator()
users_valid, users_errors = validator.validate_users(users)
media_valid, media_errors = validator.validate_media(media)
ratings_valid, ratings_errors = validator.validate_ratings(ratings, users, media)
prefs_valid, prefs_errors = validator.validate_preferences(user_preferences, users)

if not all([users_valid, media_valid, ratings_valid, prefs_valid]):
    print("Validation errors found:")
    print(f"Users: {users_errors}")
    print(f"Media: {media_errors}")
    print(f"Ratings: {ratings_errors}")
    print(f"Preferences: {prefs_errors}")

recommender = BaselineRecommender(media, ratings)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "data_validation": {
            "users": users_valid,
            "media": media_valid,
            "ratings": ratings_valid,
            "preferences": prefs_valid
        },
        "data_summary": {
            "total_users": len(users),
            "total_media": len(media),
            "total_ratings": len(ratings)
        }
    }

@app.get("/generate")
def generate_data():
    return {
        "message": "Dummy data generated successfully",
        "users_count": len(users),
        "media_count": len(media),
        "ratings_count": len(ratings),
        "sample_user": users[0].model_dump() if users else None,
        "sample_media": media[0].model_dump() if media else None
    }

@app.get("/recommend/{user_id}")
def get_recommendations(user_id: int, top_n: int = 5) -> RecommendationResponse:
    user = next((u for u in users if u.user_id == user_id), None)

    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    recommendations = recommender.get_recommendations(user, top_n=top_n)

    return RecommendationResponse(
        user_id=user_id,
        recommendations=recommendations
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
