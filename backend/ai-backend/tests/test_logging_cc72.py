import json
import logging

import requests
from fastapi.testclient import TestClient

from app import main as main_module
from app.main import app
from app.security_logging import (
    Event,
    FailureTracker,
    JsonSecurityFormatter,
    REQUEST_ID_PATTERN,
    redact,
    resolve_request_id,
)
from app.services.public_data import TVMazeCollector

client = TestClient(app)
crashing_client = TestClient(app, raise_server_exceptions=False)

SECRET_PASSWORD = "hunter2-do-not-log"
FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjF9.c2VjcmV0c2lnbmF0dXJl"


def _security_records(caplog):
    return [r for r in caplog.records if r.name.startswith("app.")]


def _event_records(caplog, event):
    return [r for r in _security_records(caplog) if getattr(r, "event", None) == event]


def _formatted(record):
    return json.loads(JsonSecurityFormatter().format(record))


def _all_log_text(caplog):
    return "\n".join(JsonSecurityFormatter().format(r) for r in _security_records(caplog))


def test_invalid_token_logs_auth_failure_with_request_id_and_timestamp(caplog, auth_headers):
    caplog.set_level(logging.INFO)
    headers = {"Authorization": "Bearer not-a-real-token", "X-Request-ID": "req-test-0001"}
    response = client.get("/recommend/1", headers=headers)

    assert response.status_code == 401
    records = _event_records(caplog, Event.AUTH_FAILURE)
    assert len(records) == 1
    entry = _formatted(records[0])
    assert entry["event"] == "AUTH_FAILURE"
    assert entry["level"] == "WARNING"
    assert entry["component"] == "authentication"
    assert entry["status_code"] == 401
    assert entry["reason"] == "invalid_token"
    assert entry["request_id"] == "req-test-0001"
    assert entry["timestamp"].endswith("+00:00")
    assert entry["service"] == "ai-recommendation-backend"
    assert response.headers["X-Request-ID"] == "req-test-0001"


def test_missing_token_logs_auth_failure_with_reason(caplog):
    caplog.set_level(logging.INFO)
    response = client.get("/recommend/1")

    assert response.status_code == 401
    entry = _formatted(_event_records(caplog, Event.AUTH_FAILURE)[0])
    assert entry["reason"] == "missing_token"
    assert entry["status_code"] == 401


def test_expired_token_logs_auth_failure(caplog, auth_headers):
    caplog.set_level(logging.INFO)
    response = client.get("/recommend/1", headers=auth_headers(1, expires_in=-60))

    assert response.status_code == 401
    entry = _formatted(_event_records(caplog, Event.AUTH_FAILURE)[0])
    assert entry["reason"] == "expired_token"


def test_authorization_failure_is_logged(caplog, auth_headers):
    caplog.set_level(logging.INFO)
    response = client.get("/recommend/1", headers=auth_headers(2))

    assert response.status_code == 403
    entry = _formatted(_event_records(caplog, Event.AUTHZ_FAILURE)[0])
    assert entry["component"] == "recommendation"
    assert entry["status_code"] == 403
    assert entry["reason"] == "user_mismatch"
    assert entry["request_id"]


def test_invalid_request_is_logged_without_echoing_input(caplog, auth_headers):
    caplog.set_level(logging.INFO)
    response = client.get("/recommend/not-a-number", headers=auth_headers(1))

    assert response.status_code == 422
    records = _event_records(caplog, Event.INVALID_REQUEST)
    assert len(records) == 1
    entry = _formatted(records[0])
    assert entry["status_code"] == 422
    assert "not-a-number" not in _all_log_text(caplog)


def test_recommendation_calculation_error_is_logged_and_sanitized(caplog, auth_headers, monkeypatch):
    caplog.set_level(logging.INFO)

    class BrokenRecommender:
        def get_recommendations(self, user, top_n):
            raise RuntimeError(f"db connection failed password={SECRET_PASSWORD}")

    monkeypatch.setattr(main_module, "recommender", BrokenRecommender())
    response = crashing_client.get("/recommend/1", headers=auth_headers(1))

    assert response.status_code == 500
    assert response.json()["detail"] == "Recommendation calculation failed"
    records = _event_records(caplog, Event.RECOMMENDATION_ERROR)
    assert len(records) == 1
    entry = _formatted(records[0])
    assert entry["reason"] == "RuntimeError"
    assert entry["level"] == "ERROR"
    assert entry["status_code"] == 500
    assert SECRET_PASSWORD not in _all_log_text(caplog)


def test_unexpected_exception_returns_safe_500_and_logs_request(caplog, monkeypatch):
    caplog.set_level(logging.INFO)
    monkeypatch.setattr(main_module, "media", None)
    response = crashing_client.get("/generate", headers={"X-Request-ID": "req-crash-0001"})

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error", "request_id": "req-crash-0001"}
    entry = _formatted(_event_records(caplog, Event.UNEXPECTED_ERROR)[0])
    assert entry["level"] == "ERROR"
    assert entry["reason"] == "TypeError"
    assert entry["request_id"] == "req-crash-0001"


def test_repeated_auth_failures_are_flagged_once(caplog, monkeypatch):
    caplog.set_level(logging.INFO)
    monkeypatch.setattr(
        "app.security_logging.failure_tracker", FailureTracker(threshold=3, window_seconds=300)
    )
    for _ in range(5):
        client.get("/recommend/1", headers={"Authorization": "Bearer bad"})

    repeated = _event_records(caplog, Event.REPEATED_FAILURES)
    assert len(repeated) == 1
    entry = _formatted(repeated[0])
    assert entry["reason"] == "auth"
    assert entry["client"]
    assert "testclient" not in _all_log_text(caplog)


def test_external_provider_timeout_is_logged_without_query_or_secrets(caplog):
    caplog.set_level(logging.INFO)

    class TimingOutSession:
        def get(self, url, **kwargs):
            raise requests.Timeout(f"timed out calling {url}?q=private-search&api_key=abc123")

    collector = TVMazeCollector(session=TimingOutSession(), max_attempts=2, sleep_fn=lambda _: None)
    try:
        collector.collect(query="private-search")
    except requests.Timeout:
        pass

    records = _event_records(caplog, Event.EXTERNAL_API_FAILURE)
    assert len(records) == 1
    entry = _formatted(records[0])
    assert entry["provider"] == "tvmaze"
    assert entry["reason"] == "Timeout"
    assert entry["level"] == "ERROR"
    text = _all_log_text(caplog)
    assert "private-search" not in text
    assert "abc123" not in text


def test_invalid_media_record_is_logged_at_validation(caplog):
    caplog.set_level(logging.INFO)
    from app.security_logging import log_validation_errors

    log_validation_errors("media", ["Media 5 has invalid media_type"])
    records = _event_records(caplog, Event.INVALID_MEDIA_RECORD)
    assert len(records) == 1
    entry = _formatted(records[0])
    assert entry["reason"] == "media"
    assert entry["message"] == "Startup validation found 1 media problem(s)"


def test_redaction_removes_all_secret_shapes():
    samples = [
        f"Authorization: Bearer {FAKE_JWT}",
        f"token={FAKE_JWT}",
        "postgres://admin:s3cr3tpass@db.internal:5432/app",
        "password=hunter2",
        "JWT_SECRET=supersecretvalue",
        "api_key: abcd1234",
        "PGPASSWORD=pgsecret",
    ]
    for sample in samples:
        cleaned = redact(sample)
        assert "hunter2" not in cleaned
        assert "s3cr3tpass" not in cleaned
        assert "supersecretvalue" not in cleaned
        assert "abcd1234" not in cleaned
        assert "pgsecret" not in cleaned
        assert FAKE_JWT not in cleaned
        assert "[REDACTED" in cleaned


def test_formatter_output_is_json_with_required_fields(caplog):
    caplog.set_level(logging.INFO)
    from app.security_logging import log_security_event

    log_security_event(Event.AUTH_FAILURE, "Authentication rejected", component="authentication", status_code=401, reason="invalid_token")
    entry = _formatted(caplog.records[-1])
    for field in ("timestamp", "level", "service", "component", "event", "message", "status_code", "reason"):
        assert field in entry


def test_request_id_header_is_validated():
    assert resolve_request_id("abcdef12-3456") == "abcdef12-3456"
    rejected = resolve_request_id("bad id with spaces <script>")
    assert rejected != "bad id with spaces <script>"
    assert REQUEST_ID_PATTERN.fullmatch(rejected)
    assert REQUEST_ID_PATTERN.fullmatch(resolve_request_id(None))
    assert resolve_request_id("x" * 200) != "x" * 200


def test_public_health_endpoint_is_logged_without_security_events(caplog):
    caplog.set_level(logging.INFO)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]
    assert not _event_records(caplog, Event.AUTH_FAILURE)
