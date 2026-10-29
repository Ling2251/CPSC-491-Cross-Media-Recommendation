import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="Authentication is not configured")
    return secret


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> int:
    unauthorized = {"WWW-Authenticate": "Bearer"}
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required", headers=unauthorized)

    secret = _jwt_secret()
    try:
        payload = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "userId"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired", headers=unauthorized)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token", headers=unauthorized)

    user_id = payload["userId"]
    if not isinstance(user_id, int) or isinstance(user_id, bool):
        raise HTTPException(status_code=401, detail="Invalid authentication identity", headers=unauthorized)
    return user_id
