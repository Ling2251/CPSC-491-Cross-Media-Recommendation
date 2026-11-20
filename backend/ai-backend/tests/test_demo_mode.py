import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def demo_on(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.delenv("DEMO_USER_ID", raising=False)


def test_demo_mode_off_by_default_requires_token(monkeypatch):
    monkeypatch.delenv("DEMO_MODE", raising=False)
    assert client.get("/recommend/1").status_code == 401


def test_demo_mode_allows_missing_token_for_demo_user(demo_on):
    response = client.get("/recommend/1")
    assert response.status_code == 200
    assert response.json()["user_id"] == 1


def test_demo_mode_still_rejects_invalid_token(demo_on):
    response = client.get("/recommend/1", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401


def test_demo_mode_still_blocks_other_users(demo_on):
    assert client.get("/recommend/2").status_code == 403


def test_demo_user_id_is_configurable(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "1")
    monkeypatch.setenv("DEMO_USER_ID", "3")
    response = client.get("/recommend/3")
    assert response.status_code == 200
    assert response.json()["user_id"] == 3


def test_demo_mode_value_other_than_truthy_stays_off(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "false")
    assert client.get("/recommend/1").status_code == 401
