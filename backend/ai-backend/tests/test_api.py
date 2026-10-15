import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_health_reports_healthy_with_validation_status():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert set(body["data_validation"]) == {"users", "media", "ratings", "preferences"}
    assert body["data_summary"]["total_users"] == 50

def test_generate_reports_dummy_data_counts():
    response = client.get("/generate")
    assert response.status_code == 200
    body = response.json()
    assert body["users_count"] == 50
    assert body["media_count"] == 100
    assert body["ratings_count"] == 750

def test_recommend_returns_requested_number_with_expected_fields():
    response = client.get("/recommend/1", params={"top_n": 3})
    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == 1
    assert len(body["recommendations"]) == 3
    for item in body["recommendations"]:
        assert set(item) == {"media_id", "title", "score", "reason"}

def test_recommend_defaults_to_five_results():
    response = client.get("/recommend/1")
    assert response.status_code == 200
    assert len(response.json()["recommendations"]) == 5

def test_recommend_unknown_user_returns_404():
    response = client.get("/recommend/9999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]

def test_recommend_non_integer_user_id_returns_422():
    response = client.get("/recommend/not-a-number")
    assert response.status_code == 422

def test_recommend_non_integer_top_n_returns_422():
    response = client.get("/recommend/1", params={"top_n": "many"})
    assert response.status_code == 422

@pytest.mark.parametrize("top_n", [0, -3])
def test_recommend_rejects_top_n_below_one(top_n):
    response = client.get("/recommend/1", params={"top_n": top_n})
    assert response.status_code == 422
