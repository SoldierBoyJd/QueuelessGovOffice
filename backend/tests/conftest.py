"""Test harness: real PostgreSQL (bundled via pgserver, or TEST_DATABASE_URL), schema built by Alembic."""
import atexit
import os
import tempfile
import uuid
from dataclasses import dataclass
from datetime import time

# --- environment must be configured BEFORE the app is imported ------------------------------------
_pg = None


def _database_url() -> str:
    global _pg
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        return url
    import pgserver  # dev dependency

    tmp = tempfile.mkdtemp(prefix="stl_pg_")
    _pg = pgserver.get_server(tmp, cleanup_mode="delete")
    atexit.register(lambda: _pg.cleanup())
    base = _pg.get_uri()
    _pg.psql("CREATE DATABASE skiptheline_test")
    return base.rsplit("/", 1)[0] + "/skiptheline_test"


os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = _database_url()
os.environ["JWT_SECRET_KEY"] = "test-secret-test-secret-test-secret-123456"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["ENFORCE_OFFICE_HOURS"] = "false"
os.environ["LOG_LEVEL"] = "WARNING"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core import ratelimit  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.models import Counter, Office, Service, User  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402

PASSWORD = "Str0ng-pass-phrase!"
_PW_HASH = hash_password(PASSWORD)


@pytest.fixture(scope="session", autouse=True)
def _schema():
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "migrations"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean_db(_schema):
    with engine.begin() as conn:
        tables = [r[0] for r in conn.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'alembic_version'"))]
        conn.execute(text("TRUNCATE " + ", ".join(tables) + " RESTART IDENTITY CASCADE"))
    ratelimit.reset()
    settings.rate_limit_enabled = False
    settings.enforce_office_hours = False
    settings.turn_approaching_threshold = 3
    yield


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


def auth(user: User) -> dict[str, str]:
    token, _ = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


def make_user(db, role="CITIZEN", *, office=None, counter=None, email=None, name=None, active=True) -> User:
    u = User(full_name=name or f"{role.title()} {uuid.uuid4().hex[:4]}",
             email=email or f"{role.lower()}-{uuid.uuid4().hex[:8]}@example.com", password_hash=_PW_HASH, role=role,
             office_id=office.id if office else None, counter_id=counter.id if counter else None, is_active=active,
             verification_status="APPROVED" if role != "CITIZEN" else "NOT_REQUIRED")
    db.add(u)
    db.commit()
    return u


def make_office(db, code="OFF1", **kw) -> Office:
    o = Office(code=code, name=kw.pop("name", f"Office {code}"), address="1 Test Road", city="Testville",
               state="Testland", district="Testdist", opening_time=kw.pop("opening_time", time(0, 0)),
               closing_time=kw.pop("closing_time", time(23, 59)), call_grace_minutes=kw.pop("call_grace_minutes", 0),
               **kw)
    db.add(o)
    db.commit()
    return o


def make_service(db, office, code="A", minutes=10, **kw) -> Service:
    s = Service(office_id=office.id, code=code, name=kw.pop("name", f"Service {code}"),
                estimated_service_minutes=minutes, **kw)
    db.add(s)
    db.commit()
    return s


def make_counter(db, office, name, service=None, status="ACTIVE") -> Counter:
    c = Counter(office_id=office.id, name=name, service_id=service.id if service else None, status=status)
    db.add(c)
    db.commit()
    return c


@dataclass
class World:
    office: Office
    svc_a: Service
    svc_b: Service
    c1: Counter  # serves A
    c2: Counter  # serves everything
    c3: Counter  # serves B
    citizen: User
    citizen2: User
    officer: User
    admin: User
    central: User
    super: User
    other_office: Office
    other_officer: User
    other_admin: User

    def h(self, user: User) -> dict[str, str]:
        return auth(user)


@pytest.fixture
def world(db) -> World:
    office = make_office(db, "OFF1")
    other = make_office(db, "OFF2")
    svc_a = make_service(db, office, "A", 10)
    svc_b = make_service(db, office, "B", 5)
    c1 = make_counter(db, office, "Counter 1", svc_a)
    c2 = make_counter(db, office, "Counter 2", None)
    c3 = make_counter(db, office, "Counter 3", svc_b)
    other_svc = make_service(db, other, "A", 10)
    make_counter(db, other, "Counter 1", other_svc)
    return World(
        office=office, svc_a=svc_a, svc_b=svc_b, c1=c1, c2=c2, c3=c3,
        citizen=make_user(db, "CITIZEN"), citizen2=make_user(db, "CITIZEN"),
        officer=make_user(db, "OFFICER", office=office), admin=make_user(db, "OFFICE_ADMIN", office=office),
        central=make_user(db, "CENTRAL_ADMIN"), super=make_user(db, "SUPER_ADMIN"),
        other_office=other, other_officer=make_user(db, "OFFICER", office=other),
        other_admin=make_user(db, "OFFICE_ADMIN", office=other),
    )


def take_token(client, w: World, citizen: User, service: Service | None = None, **extra):
    r = client.post("/api/v1/tokens", headers=auth(citizen),
                    json={"office_id": str(w.office.id), "service_id": str((service or w.svc_a).id), **extra})
    return r
