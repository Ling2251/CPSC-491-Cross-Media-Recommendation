import jwt
import pytest
from fastapi.testclient import TestClient

from app.friend_recommendation import api
from app.friend_recommendation.database_service import UserNotFoundError
from app.friend_recommendation.http_app import app


SECRET = "friend-recommendation-test-secret"


class FakeResult:
    def fetchall(self):
        return [(8, "LoFiLuna")]


class FakeConnection:
    def __init__(self):
        self.closed = False

    def execute(self, query, params):
        assert "account_state = 'active'" in query
        assert params == ([8],)
        return FakeResult()

    def close(self):
        self.closed = True


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", SECRET)
    return TestClient(app)


def _token(user_id=7):
    return jwt.encode({"userId": user_id}, SECRET, algorithm="HS256")


def test_recalculate_returns_ranked_profiles_for_authenticated_user(
    client,
    monkeypatch,
):
    connection = FakeConnection()
    monkeypatch.setattr(
        api,
        "recalculate_friend_recommendations",
        lambda user_id: [
            {
                "user_id": 8,
                "similarity_score": 0.75,
                "scores": {
                    "overall": 0.75,
                    "video": 0.2,
                    "audio": 0.8,
                    "text": 0.0,
                },
                "shared_tags": ["jazz"],
            }
        ],
    )
    monkeypatch.setattr(api, "connect_database", lambda: connection)

    response = client.post(
        "/api/friend-recommendations/recalculate",
        headers={"Authorization": f"Bearer {_token()}"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "user_id": 7,
        "recommendations": [
            {
                "user_id": 8,
                "username": "LoFiLuna",
                "similarity_score": 0.75,
                "scores": {"video": 0.2, "audio": 0.8, "text": 0.0},
                "media_types": ["movies", "music"],
                "shared_tags": ["jazz"],
            }
        ]
    }
    assert connection.closed


def test_demo_recommendations_use_backend_profiles_without_login(client):
    response = client.get("/api/friend-recommendations/demo")

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 1
    assert data["recommendations"][0]["username"] == "user_b"
    assert data["recommendations"][0]["similarity_score"] == 1.0
    assert data["recommendations"][0]["shared_tags"]
    assert {
        "movies",
        "music",
        "books",
    }.issubset(
        {
            media_type
            for recommendation in data["recommendations"]
            for media_type in recommendation["media_types"]
        }
    )


def test_recalculate_requires_a_valid_bearer_token(client):
    response = client.post("/api/friend-recommendations/recalculate")
    assert response.status_code == 401

    response = client.post(
        "/api/friend-recommendations/recalculate",
        headers={"Authorization": "Bearer invalid"},
    )
    assert response.status_code == 401


def test_recalculate_returns_not_found_for_inactive_user(client, monkeypatch):
    def raise_not_found(user_id):
        raise UserNotFoundError(f"Active user {user_id} does not exist")

    monkeypatch.setattr(
        api,
        "recalculate_friend_recommendations",
        raise_not_found,
    )

    response = client.post(
        "/api/friend-recommendations/recalculate",
        headers={"Authorization": f"Bearer {_token()}"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Active user 7 does not exist"
