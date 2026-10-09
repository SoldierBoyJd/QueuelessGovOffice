import time
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings
from app.db.models import User
from tests.conftest import PASSWORD, auth, make_user

API = "/api/v1"


def register(client, email="new.user@example.com", **over):
    body = {"full_name": "New User", "email": email, "password": PASSWORD, "phone": "+919876543210", **over}
    return client.post(f"{API}/auth/register", json=body)


def login(client, email, password=PASSWORD):
    return client.post(f"{API}/auth/login", json={"email": email, "password": password})


def test_health_is_public_and_matches_contract(client):
    r = client.get(f"{API}/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "service": settings.app_name, "version": settings.app_version}
    assert client.get(f"{API}/health/ready").json() == {"status": "ok", "database": "up"}


def test_register_creates_citizen_only(client, db):
    r = register(client)
    assert r.status_code == 201
    user = r.json()["user"]
    assert user["role"] == "CITIZEN" and user["office_id"] is None
    assert "password" not in str(r.json()) and "hash" not in str(r.json())
    assert db.query(User).filter_by(email="new.user@example.com").one().password_hash.startswith("$argon2")


def test_register_rejects_privileged_fields(client):
    for extra in ({"role": "SUPER_ADMIN"}, {"office_id": "00000000-0000-0000-0000-000000000000"},
                  {"is_active": True}, {"verification_status": "APPROVED"}):
        r = register(client, **extra)
        assert r.status_code == 422, extra
        assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_register_duplicate_email_is_case_insensitive(client):
    assert register(client, "Dup@Example.com").status_code == 201
    r = register(client, "dup@example.COM")
    assert r.status_code == 409 and r.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_register_validation(client):
    assert register(client, password="short").status_code == 422
    assert register(client, "not-an-email").status_code == 422
    assert register(client, phone="abc").status_code == 422


def test_login_success_and_me(client):
    register(client)
    r = login(client, "NEW.user@example.com")
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer" and body["expires_in"] == settings.access_token_expire_minutes * 60
    me = client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200 and me.json()["email"] == "new.user@example.com"


def test_login_failure_is_generic(client, db):
    register(client)
    wrong_pw = login(client, "new.user@example.com", "totally-wrong-password")
    unknown = login(client, "ghost@example.com")
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json()["error"]["code"] == unknown.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert wrong_pw.json()["error"]["message"] == unknown.json()["error"]["message"]


def test_disabled_account_cannot_login_or_reuse_token(client, db):
    u = make_user(db, email="disabled@example.com")
    headers = auth(u)
    assert client.get(f"{API}/users/me", headers=headers).status_code == 200
    u.is_active = False
    db.commit()
    assert client.get(f"{API}/users/me", headers=headers).status_code == 401  # signed token is still valid, account is not
    r = login(client, "disabled@example.com")
    assert r.status_code == 403 and r.json()["error"]["code"] == "ACCOUNT_DISABLED"


def test_protected_routes_require_authentication(client):
    for path in ("/users/me", "/tokens", "/notifications", "/officer/queue/current", "/admin/users"):
        r = client.get(API + path)
        assert r.status_code == 401, path
        assert r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_invalid_expired_and_forged_tokens_rejected(client, db):
    u = make_user(db)
    expired = jwt.encode({"sub": str(u.id), "iss": settings.jwt_issuer, "ims": int(time.time() * 1000),
                          "exp": datetime.now(timezone.utc) - timedelta(minutes=1)}, settings.jwt_secret_key,
                         algorithm="HS256")
    forged = jwt.encode({"sub": str(u.id), "iss": settings.jwt_issuer, "ims": int(time.time() * 1000),
                         "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, "wrong-secret-wrong-secret-wrong-1",
                        algorithm="HS256")
    wrong_issuer = jwt.encode({"sub": str(u.id), "iss": "someone-else", "ims": 1,
                               "exp": datetime.now(timezone.utc) + timedelta(minutes=5)}, settings.jwt_secret_key,
                              algorithm="HS256")
    for bad in (expired, forged, wrong_issuer, "garbage", ""):
        r = client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {bad}"})
        assert r.status_code == 401, bad


def test_logout_revokes_existing_tokens_but_new_login_works(client):
    register(client)
    t1 = login(client, "new.user@example.com").json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}
    assert client.get(f"{API}/users/me", headers=h1).status_code == 200
    assert client.post(f"{API}/auth/logout", headers=h1).status_code == 204
    r = client.get(f"{API}/users/me", headers=h1)
    assert r.status_code == 401
    t2 = login(client, "new.user@example.com").json()["access_token"]
    assert client.get(f"{API}/users/me", headers={"Authorization": f"Bearer {t2}"}).status_code == 200


def test_patch_me_edits_only_safe_fields(client, db):
    u = make_user(db)
    h = auth(u)
    ok = client.patch(f"{API}/users/me", headers=h, json={"full_name": "Renamed Person", "phone": "+91 98765 43210"})
    assert ok.status_code == 200 and ok.json()["full_name"] == "Renamed Person"
    assert ok.json()["phone"] == "+919876543210"
    for forbidden in ({"role": "SUPER_ADMIN"}, {"office_id": str(u.id)}, {"is_active": False},
                      {"verification_status": "APPROVED"}, {"email": "x@y.test"}):
        r = client.patch(f"{API}/users/me", headers=h, json=forbidden)
        assert r.status_code == 422, forbidden
    db.refresh(u)
    assert u.role == "CITIZEN" and u.is_active


def test_rate_limit_on_login(client):
    settings.rate_limit_enabled = True
    codes = [login(client, "nobody@example.com", "wrong-password").status_code for _ in range(12)]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429
    r = login(client, "nobody@example.com", "wrong-password")
    assert r.json()["error"]["code"] == "RATE_LIMITED" and "retry-after" in r.headers


def test_error_envelope_and_request_id(client):
    r = client.get(f"{API}/offices/not-a-uuid")
    assert r.status_code == 422
    err = r.json()["error"]
    assert set(err) == {"code", "message", "details", "request_id"}
    assert err["request_id"] == r.headers["x-request-id"]
    r404 = client.get(f"{API}/no-such-route")
    assert r404.status_code == 404 and r404.json()["error"]["code"] == "NOT_FOUND"


def test_unexpected_errors_do_not_leak_internals(client, monkeypatch):
    import app.api.v1.endpoints.offices as offices

    def boom(*a, **k):
        raise RuntimeError("password=hunter2 postgresql://secret")

    monkeypatch.setattr(offices, "_get_active_office", boom)
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.get(f"{API}/offices/{'0' * 8}-0000-0000-0000-{'0' * 12}")
    assert r.status_code == 500
    assert r.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "hunter2" not in r.text and "postgresql" not in r.text


def test_openapi_schema_builds_and_documents_the_api(client):
    spec = client.get("/openapi.json").json()
    paths = spec["paths"]
    for p in ("/api/v1/auth/login", "/api/v1/tokens", "/api/v1/officer/queue/call-next",
              "/api/v1/counters/{counter_id}/pause", "/api/v1/predictions/eta", "/api/v1/admin/models"):
        assert p in paths, p
    assert "bearer" in str(spec["components"]["securitySchemes"]).lower()
