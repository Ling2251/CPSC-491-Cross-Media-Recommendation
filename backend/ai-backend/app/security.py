import logging
import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.security_logging import Event, hash_client, log_security_event, record_failure

JWT_ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)
COMPONENT = "authentication"


def _client_host(request: Request) -> Optional[str]:
    return request.client.host if request.client else None


def _reject(request: Request, reason: str, detail: str) -> HTTPException:
    log_security_event(
        Event.AUTH_FAILURE,
        "Authentication rejected",
        component=COMPONENT,
        status_code=401,
        reason=reason,
        client=hash_client(_client_host(request)),
    )
    record_failure("auth", _client_host(request), COMPONENT)
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def _jwt_secret(request: Request) -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        log_security_event(
            Event.CONFIGURATION_ERROR,
            "JWT_SECRET is not configured; protected endpoints are denied",
            component=COMPONENT,
            level=logging.ERROR,
            status_code=500,
            reason="jwt_secret_missing",
        )
        raise HTTPException(status_code=500, detail="Authentication is not configured")
    return secret


def get_current_user_id(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> int:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _reject(request, "missing_token", "Authentication required")

    secret = _jwt_secret(request)
    try:
        payload = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "userId"]},
        )
    except jwt.ExpiredSignatureError:
        raise _reject(request, "expired_token", "Token expired")
    except jwt.InvalidTokenError:
        raise _reject(request, "invalid_token", "Invalid token")

    user_id = payload["userId"]
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        raise _reject(request, "invalid_identity", "Invalid authentication identity")
    return user_id
