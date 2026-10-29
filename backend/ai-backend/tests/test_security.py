import base64
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app, recommender, users

client = TestClient(app)


def test_missing_token_returns_401():
    response = client.get("/recommend/1")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_non_bearer_scheme_returns_401():
    credentials = base64.b64encode(b"user:password").decode()
    response = client.get("/recommend/1", headers={"Authorization": f"Basic {credentials}"})
    assert response.status_code == 401


def test_malformed_token_returns_401():
    response = client.get("/recommend/1", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401


def test_token_signed_with_wrong_secret_returns_401(auth_headers):
    response = client.get("/recommend/1", headers=auth_headers(1, secret="attacker-secret"))
    assert response.status_code == 401


def test_expired_token_returns_401(auth_headers):
    response = client.get("/recommend/1", headers=auth_headers(1, expires_in=-60))
    assert response.status_code == 401
    assert response.json()["detail"] == "Token expired"


def test_unsigned_none_algorithm_token_returns_401():
    token = jwt.encode(
        {"userId": 1, "exp": int(time.time()) + 3600},
        None,
        algorithm="none",
    )
    response = client.get("/recommend/1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_token_without_expiry_returns_401():
    token = jwt.encode({"userId": 1}, "sprint4-test-secret-not-used-outside-tests", algorithm="HS256")
    response = client.get("/recommend/1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_token_without_user_id_returns_401():
    token = jwt.encode(
        {"exp": int(time.time()) + 3600},
        "sprint4-test-secret-not-used-outside-tests",
        algorithm="HS256",
    )
    response = client.get("/recommend/1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_non_integer_user_id_claim_returns_401(auth_headers):
    response = client.get("/recommend/1", headers=auth_headers("1"))
    assert response.status_code == 401


def test_server_without_jwt_secret_fails_closed(auth_headers, monkeypatch):
    headers = auth_headers(1)
    monkeypatch.delenv("JWT_SECRET", raising=False)
    response = client.get("/recommend/1", headers=headers)
    assert response.status_code == 500
    assert "not configured" in response.json()["detail"]


def test_user_cannot_read_another_users_recommendations(auth_headers):
    response = client.get("/recommend/1", headers=auth_headers(2))
    assert response.status_code == 403
    assert "recommendations" not in response.json()


def test_changing_user_id_in_url_does_not_bypass_authorization(auth_headers):
    headers = auth_headers(1)
    for other_id in (2, 9999, 0):
        response = client.get(f"/recommend/{other_id}", headers=headers)
        assert response.status_code == 403


def test_ownership_is_checked_before_user_lookup(auth_headers):
    response = client.get("/recommend/9999", headers=auth_headers(1))
    assert response.status_code == 403


def test_user_can_read_own_recommendations(auth_headers):
    response = client.get("/recommend/1", params={"top_n": 5}, headers=auth_headers(1))
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == 1
    assert len(body["recommendations"]) == 5


def test_own_recommendations_match_recommender_output(auth_headers):
    response = client.get("/recommend/3", params={"top_n": 5}, headers=auth_headers(3))
    expected = recommender.get_recommendations(users[2], top_n=5)
    assert response.json()["recommendations"] == [r.model_dump() for r in expected]


def test_valid_token_still_subject_to_pydantic_validation(auth_headers):
    response = client.get("/recommend/1", params={"top_n": 0}, headers=auth_headers(1))
    assert response.status_code == 422


def test_public_health_endpoint_needs_no_token():
    assert client.get("/health").status_code == 200
