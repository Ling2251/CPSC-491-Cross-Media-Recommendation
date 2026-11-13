import hashlib
import json
import logging
import re
import secrets
import threading
import time
import uuid
from collections import deque
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Callable, Dict, Optional
from urllib.parse import urlsplit, urlunsplit

SERVICE_NAME = "ai-recommendation-backend"
REQUEST_ID_PATTERN = re.compile(r"[A-Za-z0-9._-]{8,64}")
MAX_MESSAGE_LENGTH = 300

request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
_client_salt = secrets.token_hex(16)


class Event:
    AUTH_FAILURE = "AUTH_FAILURE"
    AUTHZ_FAILURE = "AUTHZ_FAILURE"
    INVALID_REQUEST = "INVALID_REQUEST"
    INVALID_DATA = "INVALID_DATA"
    INVALID_MEDIA_RECORD = "INVALID_MEDIA_RECORD"
    UNEXPECTED_ERROR = "UNEXPECTED_ERROR"
    RECOMMENDATION_ERROR = "RECOMMENDATION_ERROR"
    EXTERNAL_API_FAILURE = "EXTERNAL_API_FAILURE"
    REPEATED_FAILURES = "REPEATED_FAILURES"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    DB_CONNECTION_FAILURE = "DB_CONNECTION_FAILURE"


_REDACTION_RULES = [
    (re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*"), "[REDACTED_JWT]"),
    (re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]+"), "Bearer [REDACTED]"),
    (re.compile(r"(?i)([a-z][a-z0-9+.-]*://[^:/\s@]+:)[^@\s]+@"), r"\1[REDACTED]@"),
    (
        re.compile(
            r"(?i)\b(password|passwd|pwd|secret|api[_-]?key|token|jwt[_-]?secret|pgpassword|authorization)"
            r"(\s*[:=]\s*)[^\s,;&\"']+"
        ),
        r"\1\2[REDACTED]",
    ),
]


def redact(value) -> str:
    text = str(value)
    for pattern, replacement in _REDACTION_RULES:
        text = pattern.sub(replacement, text)
    return text


def safe_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def hash_client(host: Optional[str]) -> str:
    return hashlib.sha256(f"{_client_salt}:{host or 'unknown'}".encode("utf-8")).hexdigest()[:16]


def get_request_id() -> Optional[str]:
    return request_id_var.get()


def resolve_request_id(incoming: Optional[str]) -> str:
    if incoming and REQUEST_ID_PATTERN.fullmatch(incoming):
        return incoming
    return uuid.uuid4().hex


class JsonSecurityFormatter(logging.Formatter):
    _optional_fields = ("request_id", "status_code", "reason", "provider", "client")

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "service": SERVICE_NAME,
            "component": getattr(record, "component", record.name),
            "event": getattr(record, "event", "APPLICATION_LOG"),
            "message": redact(record.getMessage())[:MAX_MESSAGE_LENGTH],
        }
        for field in self._optional_fields:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = redact(value) if isinstance(value, str) else value
        return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def log_security_event(
    event: str,
    message: str,
    *,
    component: str,
    level: int = logging.WARNING,
    status_code: Optional[int] = None,
    reason: Optional[str] = None,
    provider: Optional[str] = None,
    client: Optional[str] = None,
) -> None:
    logging.getLogger("app.security").log(
        level,
        message,
        extra={
            "event": event,
            "component": component,
            "request_id": get_request_id(),
            "status_code": status_code,
            "reason": reason,
            "provider": provider,
            "client": client,
        },
    )


class FailureTracker:
    def __init__(self, threshold: int = 5, window_seconds: float = 300.0, clock: Callable[[], float] = time.monotonic):
        self.threshold = threshold
        self.window_seconds = window_seconds
        self._clock = clock
        self._events: Dict[str, deque] = {}
        self._lock = threading.Lock()

    def record(self, key: str) -> int:
        now = self._clock()
        with self._lock:
            timestamps = self._events.setdefault(key, deque())
            timestamps.append(now)
            while timestamps and now - timestamps[0] > self.window_seconds:
                timestamps.popleft()
            return len(timestamps)


failure_tracker = FailureTracker()


def record_failure(kind: str, client_host: Optional[str], component: str) -> None:
    client = hash_client(client_host)
    count = failure_tracker.record(f"{kind}:{client}")
    if count == failure_tracker.threshold:
        log_security_event(
            Event.REPEATED_FAILURES,
            f"{count} {kind} failures from one client within {int(failure_tracker.window_seconds)} seconds",
            component=component,
            reason=kind,
            client=client,
        )


def log_validation_errors(category: str, errors) -> None:
    if not errors:
        return
    event = Event.INVALID_MEDIA_RECORD if category == "media" else Event.INVALID_DATA
    log_security_event(
        event,
        f"Startup validation found {len(errors)} {category} problem(s)",
        component="data-validation",
        reason=category,
    )


_configured = False


def configure_logging() -> None:
    global _configured
    if _configured:
        return
    logger = logging.getLogger("app")
    handler = logging.StreamHandler()
    handler.setFormatter(JsonSecurityFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    _configured = True
