import uuid
from datetime import timedelta

from sqlalchemy import func, select, text

from app.db.models import Notification, QueueEvent, Token
from app.services.timeutil import utcnow
from tests.conftest import auth, make_user, take_token

API = "/api/v1"


def officer_post(client, w, path, user=None, **kw):
    return client.post(f"{API}{path}", headers=auth(user or w.officer), **kw)


def call_next(client, w, counter, user=None):
    return officer_post(client, w, "/officer/queue/call-next", user, json={"counter_id": str(counter.id)})


def events_for(db, token_id):
    return [e.event_type for e in db.scalars(select(QueueEvent).where(QueueEvent.token_id == uuid.UUID(token_id))
                                             .order_by(QueueEvent.occurred_at))]


# --------------------------------------------------------------------------- Scenario A: normal flow
def test_normal_flow_end_to_end(client, db, world):
    w = world
    r = take_token(client, w, w.citizen)
    assert r.status_code == 201, r.text
    t = r.json()
    assert t["status"] == "WAITING" and t["display_number"] == "A-001"
    assert t["queue_position"] == 1 and t["people_ahead"] == 0
    assert t["eta"]["method"] == "baseline" and t["eta"]["confidence"] is None
    assert t["estimated_wait_minutes"] == 0  # idle counters

    # citizen refreshes and still sees it (persisted)
    assert client.get(f"{API}/tokens/{t['id']}", headers=auth(w.citizen)).json()["status"] == "WAITING"

    called = call_next(client, w, w.c1).json()
    assert called["result"] == "TOKEN_CALLED" and called["next_action"] == "START_SERVICE"
    assert called["token"]["status"] == "CALLED" and called["token"]["counter_name"] == "Counter 1"

    started = officer_post(client, w, f"/officer/tokens/{t['id']}/start")
    assert started.status_code == 200 and started.json()["status"] == "SERVING"
    assert client.get(f"{API}/tokens/{t['id']}", headers=auth(w.citizen)).json()["status"] == "SERVING"

    done = officer_post(client, w, f"/officer/tokens/{t['id']}/complete")
    assert done.status_code == 200 and done.json()["status"] == "COMPLETED"
    assert done.json()["completed_at"] is not None

    hist = client.get(f"{API}/tokens/{t['id']}/history", headers=auth(w.citizen)).json()
    assert [e["event_type"] for e in hist["events"]] == [
        "TOKEN_CREATED", "TOKEN_CALLED", "SERVICE_STARTED", "SERVICE_COMPLETED"]
    assert [e["actor_type"] for e in hist["events"]] == ["CITIZEN", "STAFF", "STAFF", "STAFF"]
    assert all("actor_user_id" not in e for e in hist["events"])  # staff identities are not exposed to citizens

    # counter is free again and the same citizen can take a new token
    assert take_token(client, w, w.citizen).status_code == 201
    types = {n["type"] for n in client.get(f"{API}/notifications", headers=auth(w.citizen)).json()["items"]}
    assert {"TOKEN_CREATED", "TOKEN_CALLED", "SERVICE_STARTED", "TOKEN_COMPLETED"} <= types


def test_fifo_and_queue_position_updates(client, db, world):
    w = world
    people = [make_user(db) for _ in range(4)]
    tokens = [take_token(client, w, p).json() for p in people]
    assert [t["queue_position"] for t in tokens] == [1, 2, 3, 4]
    assert [t["display_number"] for t in tokens] == ["A-001", "A-002", "A-003", "A-004"]

    first = call_next(client, w, w.c1).json()["token"]
    assert first["id"] == tokens[0]["id"]  # strict FIFO
    assert client.get(f"{API}/tokens/{tokens[1]['id']}", headers=auth(people[1])).json()["queue_position"] == 1

    # cancelling the middle one moves the later ones up
    assert client.post(f"{API}/tokens/{tokens[1]['id']}/cancel", headers=auth(people[1])).status_code == 200
    assert client.get(f"{API}/tokens/{tokens[3]['id']}", headers=auth(people[3])).json()["queue_position"] == 2


def test_eta_uses_queue_ahead_and_counters(client, db, world):
    w = world
    # only counter c1 (service A) is usable for A... plus the generalist c2 -> 2 counters, 10 min each
    for _ in range(4):
        take_token(client, w, make_user(db))
    t5 = take_token(client, w, make_user(db)).json()
    # tokens 1,2 start now on c1/c2; 3,4 at +10; token 5 at +20
    assert t5["queue_position"] == 5
    assert t5["estimated_wait_minutes"] == 20
    assert t5["eta"]["lower_minutes"] <= 20 <= t5["eta"]["upper_minutes"]
    assert t5["arrive_by"] is not None and t5["eta"]["warnings"] == []


# --------------------------------------------------------------------------- Scenario B: no-show
def test_no_show_respects_grace_period_then_frees_counter(client, db, world):
    w = world
    w.office.call_grace_minutes = 5
    db.commit()
    a, b = take_token(client, w, w.citizen).json(), take_token(client, w, w.citizen2).json()
    call_next(client, w, w.c1)

    early = officer_post(client, w, f"/officer/tokens/{a['id']}/no-show", json={"reason": "absent"})
    assert early.status_code == 409 and early.json()["error"]["code"] == "GRACE_PERIOD_ACTIVE"
    assert early.json()["error"]["details"]["seconds_remaining"] > 0

    # same instant: the counter is busy until the called token is resolved
    assert call_next(client, w, w.c1).json()["error"]["code"] == "COUNTER_NOT_AVAILABLE"

    db.execute(text("UPDATE tokens SET called_at = :t WHERE id = :i"),
               {"t": utcnow() - timedelta(minutes=6), "i": a["id"]})
    db.commit()
    ok = officer_post(client, w, f"/officer/tokens/{a['id']}/no-show", json={"reason": "absent"})
    assert ok.status_code == 200 and ok.json()["status"] == "NO_SHOW"
    nxt = call_next(client, w, w.c1).json()
    assert nxt["result"] == "TOKEN_CALLED" and nxt["token"]["id"] == b["id"]
    assert events_for(db, a["id"]) == ["TOKEN_CREATED", "TOKEN_CALLED", "TOKEN_NO_SHOW"]


def test_no_show_only_from_called(client, db, world):
    w = world
    t = take_token(client, w, w.citizen).json()
    r = officer_post(client, w, f"/officer/tokens/{t['id']}/no-show")
    assert r.status_code == 409 and r.json()["error"]["code"] == "INVALID_TOKEN_TRANSITION"


# --------------------------------------------------------------------------- hold / resume
def test_hold_keeps_counter_busy_until_resume(client, db, world):
    w = world
    a = take_token(client, w, w.citizen).json()
    take_token(client, w, w.citizen2)
    call_next(client, w, w.c1)
    officer_post(client, w, f"/officer/tokens/{a['id']}/start")
    held = officer_post(client, w, f"/officer/tokens/{a['id']}/hold", json={"reason": "Fetching a document"})
    assert held.status_code == 200 and held.json()["status"] == "ON_HOLD"
    assert call_next(client, w, w.c1).status_code == 409  # held token still occupies the counter
    assert officer_post(client, w, f"/officer/tokens/{a['id']}/resume").json()["status"] == "SERVING"
    assert events_for(db, a["id"])[-2:] == ["TOKEN_HELD", "TOKEN_RESUMED"]
    reason = db.scalar(select(QueueEvent.reason).where(QueueEvent.event_type == "TOKEN_HELD"))
    assert reason == "Fetching a document"


# --------------------------------------------------------------------------- Scenario C: counter pause
def test_counter_pause_and_resume_changes_eta_and_preserves_active_token(client, db, world):
    w = world
    for _ in range(3):
        take_token(client, w, make_user(db))
    t4 = take_token(client, w, make_user(db)).json()
    before = t4["estimated_wait_minutes"]  # 2 counters -> pos 4 starts at +10

    # c2 starts serving someone, then is paused: token stays assigned, counter excluded from new work
    called = call_next(client, w, w.c2).json()["token"]
    p = client.post(f"{API}/counters/{w.c2.id}/pause", headers=auth(w.admin), json={"reason": "Staff break"})
    assert p.status_code == 200 and p.json()["status"] == "PAUSED"
    assert p.json()["current_token_id"] == called["id"]
    assert call_next(client, w, w.c2).json()["error"]["code"] == "COUNTER_NOT_AVAILABLE"
    eta_paused = client.get(f"{API}/predictions/eta", params={"token_id": t4["id"]}, headers=auth(
        db.get(Token, uuid.UUID(t4["id"])).citizen_id and _owner(db, t4["id"]))).json()
    assert eta_paused["estimated_wait_minutes"] >= before

    r = client.post(f"{API}/counters/{w.c2.id}/resume", headers=auth(w.admin))
    assert r.status_code == 200 and r.json()["status"] == "ACTIVE"
    assert client.post(f"{API}/counters/{w.c2.id}/resume", headers=auth(w.admin)).status_code == 409


def _owner(db, token_id):
    from app.db.models import User
    return db.get(User, db.get(Token, uuid.UUID(token_id)).citizen_id)


def test_close_counter_with_active_token_requires_explicit_release(client, db, world):
    w = world
    a = take_token(client, w, w.citizen).json()
    take_token(client, w, w.citizen2)
    call_next(client, w, w.c1)
    blocked = client.post(f"{API}/counters/{w.c1.id}/close", headers=auth(w.admin))
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "COUNTER_HAS_ACTIVE_TOKEN"

    ok = client.post(f"{API}/counters/{w.c1.id}/close", headers=auth(w.admin),
                     json={"reason": "Fire drill", "release_active_token": True})
    assert ok.status_code == 200 and ok.json()["status"] == "CLOSED" and ok.json()["current_token_id"] is None
    back = client.get(f"{API}/tokens/{a['id']}", headers=auth(w.citizen)).json()
    assert back["status"] == "WAITING" and back["queue_position"] == 1  # keeps its place at the front
    assert "TOKEN_REQUEUED" in events_for(db, a["id"])
    assert any(n["type"] == "TOKEN_REQUEUED" for n in
               client.get(f"{API}/notifications", headers=auth(w.citizen)).json()["items"])
    # closed counter cannot call; reopening restores service
    assert call_next(client, w, w.c1).status_code == 409
    assert client.post(f"{API}/counters/{w.c1.id}/open", headers=auth(w.admin)).json()["status"] == "ACTIVE"


def test_eta_when_no_counter_can_serve_or_office_closed(client, db, world):
    w = world
    t = take_token(client, w, w.citizen).json()
    for c in (w.c1, w.c2):
        client.post(f"{API}/counters/{c.id}/pause", headers=auth(w.admin))
    eta = client.get(f"{API}/predictions/eta", params={"token_id": t["id"]}, headers=auth(w.citizen)).json()
    assert eta["status"] == "NO_ACTIVE_COUNTER" and eta["estimated_wait_minutes"] is None
    assert eta["method"] == "baseline"

    for c in (w.c1, w.c2):
        client.post(f"{API}/counters/{c.id}/resume", headers=auth(w.admin))
    from app.core.config import settings
    settings.enforce_office_hours = True
    w.office.opening_time = w.office.closing_time = None
    from datetime import time
    w.office.opening_time, w.office.closing_time = time(0, 0), time(0, 1)  # effectively closed all day
    db.commit()
    eta = client.get(f"{API}/predictions/eta", params={"token_id": t["id"]}, headers=auth(w.citizen)).json()
    assert eta["status"] == "OFFICE_CLOSED" and eta["estimated_wait_minutes"] is None
    blocked = take_token(client, w, w.citizen2)
    assert blocked.status_code == 409 and blocked.json()["error"]["code"] == "OFFICE_NOT_ACCEPTING_TOKENS"


def test_observed_service_times_replace_configured_estimate(client, db, world):
    w = world
    for _ in range(6):
        tok = take_token(client, w, make_user(db)).json()
        call_next(client, w, w.c1)
        officer_post(client, w, f"/officer/tokens/{tok['id']}/start")
        officer_post(client, w, f"/officer/tokens/{tok['id']}/complete")
        db.execute(text("UPDATE tokens SET service_started_at = completed_at - interval '3 minutes' WHERE id=:i"),
                   {"i": tok["id"]})
        db.commit()
    svc = client.get(f"{API}/offices/{w.office.id}/services").json()["items"]
    a = next(s for s in svc if s["code"] == "A")
    assert a["average_service_minutes"] == 3.0 and a["average_service_minutes_basis"] == "observed"
    assert a["configured_service_minutes"] == 10


# --------------------------------------------------------------------------- tokens: policies
def test_idempotent_token_creation(client, db, world):
    w = world
    key = "client-key-0001"
    first = take_token(client, w, w.citizen, idempotency_key=key)
    again = take_token(client, w, w.citizen, idempotency_key=key)
    assert first.status_code == 201 and again.status_code == 200
    assert first.json()["id"] == again.json()["id"]
    assert db.scalar(select(func.count()).select_from(Token)) == 1
    assert db.scalar(select(func.count()).select_from(QueueEvent)) == 1
    other_service = take_token(client, w, w.citizen, service=w.svc_b, idempotency_key=key)
    assert other_service.status_code == 409 and other_service.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_one_live_token_per_citizen_per_service(client, db, world):
    w = world
    t = take_token(client, w, w.citizen).json()
    dup = take_token(client, w, w.citizen)
    assert dup.status_code == 409 and dup.json()["error"]["code"] == "ACTIVE_TOKEN_EXISTS"
    assert take_token(client, w, w.citizen, service=w.svc_b).status_code == 201  # different service is fine
    client.post(f"{API}/tokens/{t['id']}/cancel", headers=auth(w.citizen))
    assert take_token(client, w, w.citizen).status_code == 201  # after cancelling


def test_token_creation_validation_and_roles(client, db, world):
    w = world
    r = client.post(f"{API}/tokens", headers=auth(w.citizen), json={
        "office_id": str(w.other_office.id), "service_id": str(w.svc_a.id)})
    assert r.status_code == 400 and r.json()["error"]["code"] == "SERVICE_NOT_AVAILABLE"
    ghost = client.post(f"{API}/tokens", headers=auth(w.citizen), json={
        "office_id": str(uuid.uuid4()), "service_id": str(w.svc_a.id)})
    assert ghost.status_code == 404
    w.svc_b.is_active = False
    db.commit()
    assert take_token(client, w, w.citizen, service=w.svc_b).status_code == 400
    for staff in (w.officer, w.admin, w.central, w.super):
        assert take_token(client, w, staff).status_code == 403
    assert client.post(f"{API}/tokens", headers=auth(w.citizen), json={
        "office_id": str(w.office.id), "service_id": str(w.svc_a.id), "status": "COMPLETED"}).status_code == 422
    assert client.post(f"{API}/tokens", json={}).status_code == 401


def test_stale_tokens_from_previous_day_expire(client, db, world):
    w = world
    old = take_token(client, w, w.citizen).json()
    db.execute(text("UPDATE tokens SET queue_date = queue_date - 1 WHERE id=:i"), {"i": old["id"]})
    db.commit()
    fresh = take_token(client, w, w.citizen)  # same citizen/service: yesterday's token must not block or clog
    assert fresh.status_code == 201, fresh.text
    assert fresh.json()["queue_position"] == 1
    assert client.get(f"{API}/tokens/{old['id']}", headers=auth(w.citizen)).json()["status"] == "CANCELLED"
    assert "TOKEN_EXPIRED" in events_for(db, old["id"])


# --------------------------------------------------------------------------- invalid transitions
def test_invalid_transitions_return_409_and_leave_history_untouched(client, db, world):
    w = world
    t = take_token(client, w, w.citizen).json()
    for action in ("start", "complete", "hold", "resume"):
        r = officer_post(client, w, f"/officer/tokens/{t['id']}/{action}")
        assert r.status_code == 409, action
        assert r.json()["error"]["code"] == "INVALID_TOKEN_TRANSITION"
    assert events_for(db, t["id"]) == ["TOKEN_CREATED"]

    call_next(client, w, w.c1)
    officer_post(client, w, f"/officer/tokens/{t['id']}/start")
    assert officer_post(client, w, f"/officer/tokens/{t['id']}/complete").status_code == 200
    again = officer_post(client, w, f"/officer/tokens/{t['id']}/complete")
    assert again.status_code == 409  # no duplicate COMPLETED event / side effects
    assert events_for(db, t["id"]).count("SERVICE_COMPLETED") == 1
    assert db.scalar(select(func.count()).select_from(Notification).where(
        Notification.type == "TOKEN_COMPLETED")) == 1
    cancel = client.post(f"{API}/tokens/{t['id']}/cancel", headers=auth(w.citizen))
    assert cancel.status_code == 409 and cancel.json()["error"]["code"] == "TOKEN_CANNOT_BE_CANCELLED"


def test_queue_empty_result(client, world):
    r = call_next(client, world, world.c1)
    assert r.status_code == 200 and r.json() == {"result": "QUEUE_EMPTY", "token": None, "next_action": None}


def test_service_specific_counters_only_draw_their_service(client, db, world):
    w = world
    take_token(client, w, w.citizen, service=w.svc_a)
    b = take_token(client, w, w.citizen2, service=w.svc_b).json()
    got = call_next(client, w, w.c3).json()  # c3 serves only B
    assert got["token"]["id"] == b["id"]
    officer_post(client, w, f"/officer/tokens/{b['id']}/start")
    officer_post(client, w, f"/officer/tokens/{b['id']}/complete")
    assert call_next(client, w, w.c3).json()["result"] == "QUEUE_EMPTY"  # the A token is not for this counter"


# --------------------------------------------------------------------------- authorization & privacy
def test_citizen_cannot_see_or_touch_other_citizens_tokens(client, db, world):
    w = world
    t = take_token(client, w, w.citizen).json()
    for path in (f"/tokens/{t['id']}", f"/tokens/{t['id']}/history"):
        assert client.get(API + path, headers=auth(w.citizen2)).status_code == 404
    assert client.post(f"{API}/tokens/{t['id']}/cancel", headers=auth(w.citizen2)).status_code == 404
    assert client.get(f"{API}/predictions/eta", params={"token_id": t["id"]}, headers=auth(w.citizen2)
                      ).status_code == 404
    assert client.get(f"{API}/tokens", headers=auth(w.citizen2)).json()["pagination"]["total"] == 0
    assert client.get(f"{API}/tokens", headers=auth(w.citizen)).json()["pagination"]["total"] == 1
    # staff of another office cannot see it either
    assert client.get(f"{API}/tokens/{t['id']}", headers=auth(w.other_officer)).status_code == 404
    assert client.get(f"{API}/tokens/{t['id']}", headers=auth(w.officer)).status_code == 200


def test_notifications_are_private(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    mine = client.get(f"{API}/notifications", headers=auth(w.citizen)).json()
    assert mine["pagination"]["total"] == 1 and mine["unread_count"] == 1
    nid = mine["items"][0]["id"]
    assert client.get(f"{API}/notifications", headers=auth(w.citizen2)).json()["pagination"]["total"] == 0
    assert client.post(f"{API}/notifications/{nid}/read", headers=auth(w.citizen2)).status_code == 404
    assert client.post(f"{API}/notifications/{nid}/read", headers=auth(w.citizen)).json()["read_at"] is not None
    assert client.get(f"{API}/notifications", params={"unread_only": True}, headers=auth(w.citizen)
                      ).json()["pagination"]["total"] == 0
    assert client.post(f"{API}/notifications/read-all", headers=auth(w.citizen2)).status_code == 204


def test_citizens_cannot_run_officer_actions(client, db, world):
    w = world
    t = take_token(client, w, w.citizen).json()
    for path, body in (("/officer/queue/call-next", {"counter_id": str(w.c1.id)}),
                       (f"/officer/tokens/{t['id']}/start", None), (f"/officer/tokens/{t['id']}/complete", None),
                       (f"/officer/tokens/{t['id']}/hold", None), (f"/officer/tokens/{t['id']}/no-show", None),
                       (f"/counters/{w.c1.id}/pause", None)):
        r = client.post(API + path, headers=auth(w.citizen), json=body)
        assert r.status_code == 403, path


def test_staff_are_scoped_to_their_own_office(client, db, world):
    w = world
    t = take_token(client, w, w.citizen).json()
    assert call_next(client, w, w.c1, user=w.other_officer).status_code == 403
    call_next(client, w, w.c1)
    assert officer_post(client, w, f"/officer/tokens/{t['id']}/start", user=w.other_officer).status_code == 403
    assert client.post(f"{API}/counters/{w.c1.id}/pause", headers=auth(w.other_admin)).status_code == 403
    assert client.post(f"{API}/counters/{w.c1.id}/pause", headers=auth(w.officer)).status_code == 403  # not by default
    assert client.post(f"{API}/counters/{w.c1.id}/pause", headers=auth(w.central)).status_code == 403
    assert client.get(f"{API}/offices/{w.office.id}/counters", headers=auth(w.other_officer)).status_code == 403
    assert client.get(f"{API}/officer/queue/current", params={"counter_id": str(w.c1.id)},
                      headers=auth(w.other_officer)).status_code == 403
    assert client.get(f"{API}/offices/{w.office.id}/counters", headers=auth(w.officer)).status_code == 200
    assert client.get(f"{API}/offices/{w.office.id}/counters", headers=auth(w.citizen)).status_code == 403


def test_officer_pinned_to_a_counter_cannot_use_another(client, db, world):
    w = world
    pinned = make_user(db, "OFFICER", office=w.office, counter=w.c1)
    take_token(client, w, w.citizen)
    assert call_next(client, w, w.c2, user=pinned).status_code == 403
    # counter_id defaults to the officer's own counter
    r = officer_post(client, w, "/officer/queue/call-next", user=pinned, json={})
    assert r.status_code == 200 and r.json()["result"] == "TOKEN_CALLED"
    assert r.json()["token"]["counter_id"] == str(w.c1.id)


def test_super_admin_override_is_audited(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    r = call_next(client, w, w.c1, user=w.super)
    assert r.status_code == 200 and r.json()["result"] == "TOKEN_CALLED"
    logs = client.get(f"{API}/admin/audit-logs", params={"action": "OVERRIDE_CALL_NEXT"}, headers=auth(w.super)).json()
    assert logs["pagination"]["total"] == 1


def test_office_queue_view_is_privacy_safe_for_citizens(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    take_token(client, w, w.citizen2)
    as_citizen = client.get(f"{API}/offices/{w.office.id}/queue", headers=auth(w.citizen)).json()
    assert as_citizen["summary"]["waiting_count"] == 2
    assert [i["is_mine"] for i in as_citizen["items"]] == [True, False]
    assert all(i["citizen_name"] is None for i in as_citizen["items"])
    for forbidden in (w.citizen.email, w.citizen2.full_name, w.citizen2.email):
        assert forbidden not in str(as_citizen)
    as_staff = client.get(f"{API}/offices/{w.office.id}/queue", headers=auth(w.officer)).json()
    assert [i["citizen_name"] for i in as_staff["items"]] == [w.citizen.full_name, w.citizen2.full_name]
    # other office's staff do not get names
    as_other = client.get(f"{API}/offices/{w.office.id}/queue", headers=auth(w.other_officer)).json()
    assert all(i["citizen_name"] is None for i in as_other["items"])
    assert client.get(f"{API}/offices/{w.office.id}/queue").status_code == 401


def test_officer_current_shows_current_and_next(client, db, world):
    w = world
    a, b = take_token(client, w, w.citizen).json(), take_token(client, w, w.citizen2).json()
    call_next(client, w, w.c1)
    cur = client.get(f"{API}/officer/queue/current", params={"counter_id": str(w.c1.id)}, headers=auth(w.officer))
    body = cur.json()
    assert body["current_token"]["id"] == a["id"] and body["next_token"]["id"] == b["id"]
    assert body["summary"]["waiting_count"] == 1 and body["summary"]["called_count"] == 1
    missing = client.get(f"{API}/officer/queue/current", headers=auth(w.officer))
    assert missing.status_code == 400 and missing.json()["error"]["code"] == "COUNTER_REQUIRED"


def test_turn_approaching_notification_sent_once(client, db, world):
    w = world
    from app.core.config import settings
    settings.turn_approaching_threshold = 2
    people = [make_user(db) for _ in range(4)]
    for p in people:
        take_token(client, w, p)
    call_next(client, w, w.c1)  # head leaves -> positions shift, #2 and #3 are now within the threshold
    def approaching(p):
        return [n for n in client.get(f"{API}/notifications", headers=auth(p)).json()["items"]
                if n["type"] == "TURN_APPROACHING"]
    assert len(approaching(people[1])) == 1
    assert approaching(people[3]) == []
    call_next(client, w, w.c2)
    assert len(approaching(people[1])) == 1  # still only one
    assert len(approaching(people[2])) == 1 or len(approaching(people[3])) == 1


def test_queue_events_are_append_only(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    from sqlalchemy.exc import DBAPIError
    for sql in ("UPDATE queue_events SET reason='tamper'", "DELETE FROM queue_events"):
        try:
            db.execute(text(sql))
            db.commit()
            raise AssertionError("queue_events must be immutable")
        except DBAPIError as exc:
            db.rollback()
            assert "append-only" in str(exc)


def test_atomic_event_and_state(client, db, world, monkeypatch):
    """A failure after the state change must roll back the token update AND the event together."""
    w = world
    t = take_token(client, w, w.citizen).json()
    import app.services.queue_service as qs

    def boom(*a, **k):
        raise RuntimeError("simulated failure after the update")

    monkeypatch.setattr(qs, "notify_turn_approaching", boom)
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        r = c.post(f"{API}/officer/queue/call-next", headers=auth(w.officer), json={"counter_id": str(w.c1.id)})
    assert r.status_code == 500
    db.expire_all()
    tok = db.get(Token, uuid.UUID(t["id"]))
    assert tok.status == "WAITING" and tok.counter_id is None
    assert events_for(db, t["id"]) == ["TOKEN_CREATED"]
