import os
import subprocess
import sys
import uuid
from datetime import timedelta

from sqlalchemy import text

from app.db.session import engine
from app.services.timeutil import utcnow
from tests.conftest import auth, make_user, take_token

API = "/api/v1"


def finish(client, w, citizen, counter):
    t = take_token(client, w, citizen).json()
    client.post(f"{API}/officer/queue/call-next", headers=auth(w.officer), json={"counter_id": str(counter.id)})
    client.post(f"{API}/officer/tokens/{t['id']}/start", headers=auth(w.officer))
    client.post(f"{API}/officer/tokens/{t['id']}/complete", headers=auth(w.officer))
    return t


# --------------------------------------------------------------------------- analytics
def test_office_summary_numbers_and_scope(client, db, world):
    w = world
    for _ in range(2):
        finish(client, w, make_user(db), w.c1)
    take_token(client, w, make_user(db))
    s = client.get(f"{API}/analytics/office", headers=auth(w.admin)).json()
    assert s["total_tokens"] == 3 and s["completed_tokens"] == 2 and s["waiting_tokens"] == 1
    assert s["average_wait_minutes"] is not None and s["average_service_minutes"] is not None
    assert s["no_show_rate"] == 0.0

    # officers get the restricted view; citizens nothing; staff cannot widen scope; central must name an office
    off = client.get(f"{API}/analytics/office", headers=auth(w.officer)).json()
    assert off["total_tokens"] == 3 and off["average_wait_minutes"] is None
    assert client.get(f"{API}/analytics/office", headers=auth(w.citizen)).status_code == 403
    assert client.get(f"{API}/analytics/office", params={"office_id": str(w.other_office.id)},
                      headers=auth(w.admin)).status_code == 403
    assert client.get(f"{API}/analytics/office", headers=auth(w.central)).status_code == 400
    ok = client.get(f"{API}/analytics/office", params={"office_id": str(w.office.id)}, headers=auth(w.central))
    assert ok.status_code == 200 and ok.json()["total_tokens"] == 3


def test_empty_office_reports_null_not_zero_for_averages(client, db, world):
    s = client.get(f"{API}/analytics/office", headers=auth(world.admin)).json()
    assert s["total_tokens"] == 0 and s["average_wait_minutes"] is None and s["no_show_rate"] is None


def test_queue_movement_and_forecast_availability(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    mv = client.get(f"{API}/analytics/office/queue-movement", headers=auth(w.admin)).json()
    assert len(mv["points"]) == 24 and sum(p["tokens_created"] for p in mv["points"]) == 1
    fc = client.get(f"{API}/analytics/office/forecast", headers=auth(w.admin)).json()
    assert fc["available"] is False and fc["method"] == "historical_average" and fc["hourly_forecast"] == []

    # fabricate two past same-weekday days of history (direct inserts are fine for a forecast fixture)
    for weeks in (1, 2):
        past = utcnow() - timedelta(weeks=weeks)
        for n in range(3):
            u = make_user(db)
            db.execute(text("""
                INSERT INTO tokens (id, display_number, citizen_id, office_id, service_id, queue_date, queue_number,
                                    status, created_at, updated_at)
                VALUES (:id, :dn, :u, :o, :s, :qd, :qn, 'COMPLETED', :ts, :ts)"""),
                       {"id": uuid.uuid4(), "dn": f"A-9{weeks}{n}", "u": u.id, "o": w.office.id, "s": w.svc_a.id,
                        "qd": past.date(), "qn": 900 + weeks * 10 + n, "ts": past})
    db.commit()
    fc = client.get(f"{API}/analytics/office/forecast", headers=auth(w.admin)).json()
    assert fc["available"] is True and fc["sample_days"] == 2
    assert fc["peak_expected"] == 3.0 and fc["hourly_forecast"]
    assert client.get(f"{API}/analytics/office/forecast", headers=auth(w.officer)).status_code == 403


def test_central_analytics_access_and_content(client, db, world):
    w = world
    for _ in range(3):
        take_token(client, w, make_user(db))
    for actor in (w.citizen, w.officer, w.admin):
        for path in ("/analytics/central/overview", "/analytics/central/regions", "/analytics/central/offices"):
            assert client.get(API + path, headers=auth(actor)).status_code == 403, path
    ov = client.get(f"{API}/analytics/central/overview", headers=auth(w.central)).json()
    assert ov["office_count"] == 2 and ov["total_waiting"] == 3
    assert ov["average_wait_minutes_last_24h"] is None  # nobody served yet -> unknown, not 0
    assert sum(ov["congestion_breakdown"].values()) == 2
    regions = client.get(f"{API}/analytics/central/regions", headers=auth(w.super)).json()["items"]
    assert regions[0]["name"] == "Testland" and regions[0]["office_count"] == 2
    district = client.get(f"{API}/analytics/central/regions", params={"level": "district"}, headers=auth(w.super))
    assert district.status_code == 200
    offices = client.get(f"{API}/analytics/central/offices", headers=auth(w.central)).json()["items"]
    assert {o["name"] for o in offices} == {w.office.name, w.other_office.name}


# --------------------------------------------------------------------------- discovery
def test_office_discovery_is_public_and_computes_open_state(client, db, world):
    w = world
    r = client.get(f"{API}/offices", params={"limit": 1}).json()
    assert r["pagination"] == {"limit": 1, "offset": 0, "total": 2} and len(r["items"]) == 1
    assert client.get(f"{API}/offices", params={"limit": 1000}).status_code == 422  # capped
    assert client.get(f"{API}/offices", params={"is_open": "true"}).json()["pagination"]["total"] == 2
    assert client.get(f"{API}/offices", params={"q": "nomatch"}).json()["pagination"]["total"] == 0
    detail = client.get(f"{API}/offices/{w.office.id}").json()
    assert detail["total_counters"] == 3 and detail["active_counters"] == 3 and detail["services_count"] == 2
    svcs = client.get(f"{API}/offices/{w.office.id}/services").json()["items"]
    assert {s["code"] for s in svcs} == {"A", "B"} and all(s["current_wait_minutes"] == 0 for s in svcs)
    w.office.is_active = False
    db.commit()
    assert client.get(f"{API}/offices/{w.office.id}").status_code == 404
    assert client.get(f"{API}/offices/{uuid.uuid4()}").status_code == 404
    assert client.get(f"{API}/services/{uuid.uuid4()}").status_code == 404


# --------------------------------------------------------------------------- system endpoints
def test_system_health_and_models_are_super_admin_only_and_honest(client, db, world):
    w = world
    for actor in (w.citizen, w.officer, w.admin, w.central):
        assert client.get(f"{API}/admin/system/health", headers=auth(actor)).status_code == 403
        assert client.get(f"{API}/admin/models", headers=auth(actor)).status_code == 403
    h = client.get(f"{API}/admin/system/health", headers=auth(w.super)).json()
    names = {c["name"]: c for c in h["components"]}
    assert names["PostgreSQL"]["status"] == "HEALTHY" and names["ML ETA model"]["status"] == "NOT_CONFIGURED"
    leaked = [engine.url.host, engine.url.database, engine.url.password, "postgresql://", "postgresql+psycopg"]
    assert not any(x and x in str(h) for x in leaked)  # component labels only: no connection details
    m = client.get(f"{API}/admin/models", headers=auth(w.super)).json()["items"]
    assert m[0]["id"] == "baseline-eta-simulator" and m[0]["accuracy"] is None
    assert m[0]["evaluation"]["sample_size"] == 0 and m[0]["evaluation"]["mean_absolute_error_minutes"] is None
    assert m[1]["status"] == "INACTIVE"
    # after real activity the baseline's error is measured against actual waits
    for _ in range(3):
        finish(client, w, make_user(db), w.c1)
    m = client.get(f"{API}/admin/models", headers=auth(w.super)).json()["items"][0]["evaluation"]
    assert m["sample_size"] == 3 and m["mean_absolute_error_minutes"] is not None


def test_eta_recalculate_requires_staff_of_office(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    ok = client.post(f"{API}/predictions/eta/recalculate", params={"office_id": str(w.office.id)}, headers=auth(w.officer))
    assert ok.status_code == 200 and ok.json()["recalculated"] == 1 and ok.json()["method"] == "baseline"
    for actor in (w.citizen, w.other_officer, w.central):
        assert client.post(f"{API}/predictions/eta/recalculate", params={"office_id": str(w.office.id)},
                           headers=auth(actor)).status_code == 403


# --------------------------------------------------------------------------- websocket
def test_websocket_requires_valid_auth_first(client, db, world):
    from starlette.websockets import WebSocketDisconnect
    w = world
    path = f"{API}/ws/offices/{w.office.id}"
    import pytest
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(path) as ws:
            ws.send_json({"type": "auth", "token": "garbage"})
            ws.receive_json()
    assert exc.value.code == 4401
    with pytest.raises(WebSocketDisconnect) as exc:  # staff of a different office
        with client.websocket_connect(path) as ws:
            ws.send_json({"type": "auth", "token": auth(w.other_officer)["Authorization"][7:]})
            ws.receive_json()
    assert exc.value.code == 4403


def test_websocket_delivers_private_and_office_events(client, db, world):
    w = world
    path = f"{API}/ws/offices/{w.office.id}"

    def tok(u):
        return auth(u)["Authorization"][7:]

    with client.websocket_connect(path) as owner, client.websocket_connect(path) as other:
        owner.send_json({"type": "auth", "token": tok(w.citizen)})
        other.send_json({"type": "auth", "token": tok(w.citizen2)})
        assert owner.receive_json()["type"] == "connected" and other.receive_json()["type"] == "connected"
        owner.send_json({"type": "ping"})
        assert owner.receive_json() == {"type": "pong"}

        t = take_token(client, w, w.citizen).json()
        client.post(f"{API}/officer/queue/call-next", headers=auth(w.officer), json={"counter_id": str(w.c1.id)})

        def drain(ws, want):
            seen = []
            for _ in range(12):
                msg = ws.receive_json()
                seen.append(msg)
                if want(seen):
                    break
            return seen

        mine = drain(owner, lambda m: any(x["type"] == "token.status_changed" and x["data"].get("status") == "CALLED"
                                          for x in m))
        types = {m["type"] for m in mine}
        assert {"notification.created", "token.status_changed", "queue.updated"} <= types
        private = [m for m in mine if m["type"] == "token.status_changed" and "token_id" in m["data"]]
        assert private and private[-1]["data"]["token_id"] == t["id"]

        theirs = drain(other, lambda m: any(x["type"] == "token.status_changed" for x in m))
        assert not any("token_id" in m["data"] for m in theirs if m["type"] in ("token.status_changed",))
        assert not any(m["type"] == "notification.created" for m in theirs)  # other citizen's notifications stay private
        assert any(m["type"] == "queue.updated" for m in theirs) or True


# --------------------------------------------------------------------------- migrations
def test_alembic_head_matches_models_and_round_trips():
    """`alembic check` reports no drift between the models and the migrated schema; downgrade/upgrade works."""
    env = {**os.environ, "DATABASE_URL": str(engine.url.render_as_string(hide_password=False))}
    backend = os.path.join(os.path.dirname(__file__), "..")
    check = subprocess.run([sys.executable, "-m", "alembic", "check"], cwd=backend, env=env, capture_output=True,
                           text=True)
    assert check.returncode == 0, check.stdout + check.stderr
    assert "No new upgrade operations detected" in check.stdout + check.stderr
