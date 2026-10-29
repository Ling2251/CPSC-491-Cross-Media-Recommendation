import time

import jwt
import pytest

TEST_JWT_SECRET = "sprint4-test-secret-not-used-outside-tests"


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", TEST_JWT_SECRET)
    return TEST_JWT_SECRET


@pytest.fixture
def make_token():
    def _make(user_id, secret=TEST_JWT_SECRET, expires_in=3600, algorithm="HS256", extra=None):
        now = int(time.time())
        payload = {"userId": user_id, "iat": now, "exp": now + expires_in}
        if extra:
            payload.update(extra)
        return jwt.encode(payload, secret, algorithm=algorithm)
    return _make


@pytest.fixture
def auth_headers(make_token):
    def _headers(user_id, **kwargs):
        return {"Authorization": f"Bearer {make_token(user_id, **kwargs)}"}
    return _headers
