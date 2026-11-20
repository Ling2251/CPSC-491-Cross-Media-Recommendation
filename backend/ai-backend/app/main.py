import json
import logging
import os

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import db, db_store
from app.models import RecommendationResponse
from app.preferences import PreferenceInput
from app.security import get_current_user_id
from app.security_logging import (
    Event,
    configure_logging,
    hash_client,
    log_security_event,
    log_validation_errors,
    record_failure,
    request_id_var,
    resolve_request_id,
)
from app.services.db_recommender import rank_candidates
from app.services.generator import DummyDataGenerator
from app.services.recommender import BaselineRecommender
from app.services.validator import DataValidator

configure_logging()

app = FastAPI(title="AI Recommendation Backend", version="Sprint 1")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("AI_CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "PUT"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

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

log_validation_errors("users", users_errors)
log_validation_errors("media", media_errors)
log_validation_errors("ratings", ratings_errors)
log_validation_errors("preferences", prefs_errors)

recommender = BaselineRecommender(media, ratings)


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request_id = resolve_request_id(request.headers.get("x-request-id"))
    request.state.request_id = request_id
    token = request_id_var.set(request_id)
    try:
        response = await call_next(request)
    finally:
        request_id_var.reset(token)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(RequestValidationError)
async def invalid_request_handler(request: Request, exc: RequestValidationError):
    log_security_event(
        Event.INVALID_REQUEST,
        f"Request validation failed with {len(exc.errors())} problem(s)",
        component="api",
        status_code=422,
        reason="validation_error",
        client=hash_client(request.client.host if request.client else None),
    )
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(exc.errors())})


@app.exception_handler(db.DatabaseUnavailable)
async def database_unavailable_handler(request: Request, exc: db.DatabaseUnavailable):
    return JSONResponse(status_code=503, content={"detail": "Preference storage is unavailable"})


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    token = request_id_var.set(request_id)
    try:
        log_security_event(
            Event.UNEXPECTED_ERROR,
            f"Unhandled {type(exc).__name__} while serving request",
            component="api",
            level=logging.ERROR,
            status_code=500,
            reason=type(exc).__name__,
        )
    finally:
        request_id_var.reset(token)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": request_id},
    )


def _enforce_owner(request: Request, current_user_id: int, user_id: int) -> None:
    if current_user_id != user_id:
        log_security_event(
            Event.AUTHZ_FAILURE,
            "Authenticated user requested another user's data",
            component="recommendation",
            status_code=403,
            reason="user_mismatch",
            client=hash_client(request.client.host if request.client else None),
        )
        record_failure("authz", request.client.host if request.client else None, "recommendation")
        raise HTTPException(status_code=403, detail="Not authorized to view these recommendations")


def _require_database() -> None:
    if not db.database_configured():
        raise HTTPException(status_code=503, detail="Preference storage is not configured")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "data_validation": {
            "users": users_valid,
            "media": media_valid,
            "ratings": ratings_valid,
            "preferences": prefs_valid,
        },
        "data_summary": {
            "total_users": len(users),
            "total_media": len(media),
            "total_ratings": len(ratings),
        },
    }


@app.get("/generate")
def generate_data():
    return {
        "message": "Dummy data generated successfully",
        "users_count": len(users),
        "media_count": len(media),
        "ratings_count": len(ratings),
        "sample_user": users[0].model_dump() if users else None,
        "sample_media": media[0].model_dump() if media else None,
    }


@app.get("/preferences/{user_id}", response_model=PreferenceInput)
def read_preferences(
    request: Request,
    user_id: int,
    current_user_id: int = Depends(get_current_user_id),
) -> PreferenceInput:
    _enforce_owner(request, current_user_id, user_id)
    _require_database()
    with db.connect() as conn:
        preferences = db_store.get_preferences(conn, user_id)
    if preferences is None:
        raise HTTPException(status_code=404, detail="No saved preferences for this user")
    return preferences


@app.put("/preferences/{user_id}", response_model=PreferenceInput)
def save_preferences(
    request: Request,
    user_id: int,
    preferences: PreferenceInput,
    current_user_id: int = Depends(get_current_user_id),
) -> PreferenceInput:
    _enforce_owner(request, current_user_id, user_id)
    _require_database()
    with db.connect() as conn:
        if not db_store.user_exists(conn, user_id):
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        db_store.save_preferences(conn, user_id, preferences)
    return preferences


def _recommend_from_database(user_id: int, top_n: int) -> RecommendationResponse:
    with db.connect() as conn:
        if not db_store.user_exists(conn, user_id):
            raise HTTPException(status_code=404, detail=f"User {user_id} not found")
        preferences = db_store.get_preferences(conn, user_id)
        if preferences is None:
            raise HTTPException(status_code=404, detail="No saved preferences for this user")
        candidates = db_store.candidate_media(conn, user_id, preferences.content_types)
    try:
        recommendations = rank_candidates(candidates, preferences, top_n)
    except Exception as exc:
        log_security_event(
            Event.RECOMMENDATION_ERROR,
            "Recommendation calculation failed",
            component="recommendation",
            level=logging.ERROR,
            status_code=500,
            reason=type(exc).__name__,
        )
        raise HTTPException(status_code=500, detail="Recommendation calculation failed")
    return RecommendationResponse(user_id=user_id, recommendations=recommendations)


@app.get("/recommend/{user_id}")
def get_recommendations(
    request: Request,
    user_id: int,
    top_n: int = Query(default=5, ge=1),
    current_user_id: int = Depends(get_current_user_id),
) -> RecommendationResponse:
    _enforce_owner(request, current_user_id, user_id)

    if db.database_configured():
        return _recommend_from_database(user_id, top_n)

    user = next((u for u in users if u.user_id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    try:
        recommendations = recommender.get_recommendations(user, top_n=top_n)
    except Exception as exc:
        log_security_event(
            Event.RECOMMENDATION_ERROR,
            "Recommendation calculation failed",
            component="recommendation",
            level=logging.ERROR,
            status_code=500,
            reason=type(exc).__name__,
        )
        raise HTTPException(status_code=500, detail="Recommendation calculation failed")

    return RecommendationResponse(user_id=user_id, recommendations=recommendations)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
