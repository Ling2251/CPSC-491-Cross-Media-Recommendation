import os

import psycopg

from app.security_logging import Event, log_security_event


class DatabaseUnavailable(RuntimeError):
    pass


def database_configured() -> bool:
    return bool(os.environ.get("DATABASE_URL"))


def connect() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise DatabaseUnavailable("DATABASE_URL is not configured")
    try:
        return psycopg.connect(url, connect_timeout=5)
    except psycopg.Error as exc:
        log_security_event(
            Event.DB_CONNECTION_FAILURE,
            "Database connection failed",
            component="database",
            status_code=503,
            reason=type(exc).__name__,
        )
        raise DatabaseUnavailable("Database connection failed") from exc
