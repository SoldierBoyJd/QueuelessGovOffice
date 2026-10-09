"""Race-condition tests against real PostgreSQL. Each worker uses its own session / request."""
import threading
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import func, select

from app.core.errors import AppError
from app.db.models import QueueCounter, QueueEvent, Token
from app.db.session import SessionLocal
from app.services import queue_service
from tests.conftest import auth, make_counter, make_user, take_token

API = "/api/v1"


def run_parallel(fns):
    barrier = threading.Barrier(len(fns))

    def wrap(fn):
        barrier.wait()
        try:
            return ("ok", fn())
        except AppError as exc:
            return ("err", exc.code)

    with ThreadPoolExecutor(len(fns)) as pool:
        return list(pool.map(wrap, fns))


def in_session(fn):
    def runner():
        with SessionLocal() as session:
            return fn(session)
    return runner


def test_concurrent_token_creation_never_duplicates_numbers(client, db, world):
    w = world
    people = [make_user(db) for _ in range(25)]
    results = run_parallel([lambda p=p: take_token(client, w, p) for p in people])
    codes = [r[1].status_code for r in results]
    assert codes == [201] * 25
    numbers = sorted(r[1].json()["display_number"] for r in results)
    assert numbers == sorted(f"A-{i:03d}" for i in range(1, 26))
    assert db.scalar(select(func.count(func.distinct(Token.queue_number))).select_from(Token)) == 25
    assert db.scalar(select(QueueCounter.last_number)) == 25
    assert db.scalar(select(func.count()).select_from(QueueEvent).where(QueueEvent.event_type == "TOKEN_CREATED")) == 25
    # FIFO order matches number order even though requests overlapped
    ordered = db.scalars(select(Token.queue_number).order_by(Token.created_at, Token.id)).all()
    assert ordered == sorted(ordered)


def test_two_counters_never_claim_the_same_token(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    for _ in range(20):  # repeat to shake out timing windows
        pass
    results = run_parallel([
        in_session(lambda s: queue_service.call_next(s, w.officer, w.c1.id)),
        in_session(lambda s: queue_service.call_next(s, w.officer, w.c2.id)),
    ])
    outcomes = sorted(r[1][0] for r in results if r[0] == "ok")
    assert outcomes == ["QUEUE_EMPTY", "TOKEN_CALLED"]
    assert db.scalar(select(func.count()).select_from(Token).where(Token.status == "CALLED")) == 1
    assert db.scalar(select(func.count()).select_from(QueueEvent).where(QueueEvent.event_type == "TOKEN_CALLED")) == 1


def test_many_counters_get_distinct_tokens(client, db, world):
    w = world
    extra = [make_counter(db, w.office, f"Extra {i}") for i in range(5)]  # generalist counters
    counters = [w.c2, *extra]
    people = [make_user(db) for _ in range(6)]
    for p in people:
        assert take_token(client, w, p).status_code == 201
    results = run_parallel([in_session(lambda s, c=c: queue_service.call_next(s, w.officer, c.id))
                            for c in counters])
    tokens = [r[1][1].id for r in results if r[0] == "ok" and r[1][1] is not None]
    assert len(tokens) == 6 and len(set(tokens)) == 6  # six counters, six different tokens
    db.expire_all()
    assert db.scalar(select(func.count()).select_from(Token).where(Token.status == "CALLED")) == 6
    # FIFO: the six oldest tokens were taken
    assert {t.status for t in db.scalars(select(Token))} == {"CALLED"}


def test_same_counter_called_concurrently_succeeds_once(client, db, world):
    w = world
    for _ in range(5):
        take_token(client, w, make_user(db))
    results = run_parallel([in_session(lambda s: queue_service.call_next(s, w.officer, w.c2.id)) for _ in range(5)])
    ok = [r for r in results if r[0] == "ok"]
    errs = [r[1] for r in results if r[0] == "err"]
    assert len(ok) == 1 and errs == ["COUNTER_NOT_AVAILABLE"] * 4
    assert db.scalar(select(func.count()).select_from(Token).where(Token.counter_id == w.c2.id)) == 1


def test_http_call_next_race_via_api(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    take_token(client, w, w.citizen2)
    def call(counter):
        return lambda: client.post(f"{API}/officer/queue/call-next", headers=auth(w.officer),
                                   json={"counter_id": str(counter.id)})
    results = run_parallel([call(w.c1), call(w.c2)])
    bodies = [r[1].json() for r in results]
    assert [b["result"] for b in bodies] == ["TOKEN_CALLED", "TOKEN_CALLED"]
    assert bodies[0]["token"]["id"] != bodies[1]["token"]["id"]


def test_same_idempotency_key_concurrently_creates_one_token(client, db, world):
    w = world
    results = run_parallel([
        in_session(lambda s: queue_service.create_token(s, w.citizen, office_id=w.office.id, service_id=w.svc_a.id,
                                                        idempotency_key="same-key-123456"))
        for _ in range(6)])
    assert all(r[0] == "ok" for r in results), results
    assert len({r[1][0].id for r in results}) == 1
    assert sorted(r[1][2] for r in results) == [False] * 5 + [True]
    assert db.scalar(select(func.count()).select_from(Token)) == 1


def test_same_citizen_concurrently_gets_one_live_token(client, db, world):
    w = world
    results = run_parallel([
        in_session(lambda s, i=i: queue_service.create_token(s, w.citizen, office_id=w.office.id,
                                                             service_id=w.svc_a.id, idempotency_key=f"key-number-{i}"))
        for i in range(6)])
    assert sum(1 for r in results if r[0] == "ok") == 1
    assert [r[1] for r in results if r[0] == "err"] == ["ACTIVE_TOKEN_EXISTS"] * 5
    assert db.scalar(select(func.count()).select_from(Token)) == 1
    # the failed attempts rolled back completely: no burned numbers, no stray events
    assert db.scalar(select(QueueCounter.last_number)) == 1
    assert db.scalar(select(func.count()).select_from(QueueEvent)) == 1


def test_concurrent_start_and_complete_apply_once(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    token = queue_service.call_next(db, w.officer, w.c1.id)[1]
    results = run_parallel([in_session(lambda s: queue_service.start_service(s, w.officer, token.id))
                            for _ in range(4)])
    assert sum(r[0] == "ok" for r in results) == 1
    assert [r[1] for r in results if r[0] == "err"] == ["INVALID_TOKEN_TRANSITION"] * 3
    assert db.scalar(select(func.count()).select_from(QueueEvent).where(
        QueueEvent.event_type == "SERVICE_STARTED")) == 1
