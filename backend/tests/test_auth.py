import jwt
import pytest
from fastapi import HTTPException

from app.auth import require_user
from app.config import settings


def test_valid(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "secret")
    tok = jwt.encode({"sub": "u1", "aud": "authenticated"}, "secret", algorithm="HS256")
    assert require_user(f"Bearer {tok}")["sub"] == "u1"


def test_missing():
    with pytest.raises(HTTPException) as exc:
        require_user("")
    assert exc.value.status_code == 401


def test_invalid(monkeypatch):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "secret")
    with pytest.raises(HTTPException) as exc:
        require_user("Bearer notavalidtoken")
    assert exc.value.status_code == 401
