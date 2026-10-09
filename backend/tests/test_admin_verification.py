import uuid

from sqlalchemy import select

from app.db.models import AuditLog, User
from tests.conftest import PASSWORD, auth, make_counter, make_user, take_token

API = "/api/v1"


# --------------------------------------------------------------------------- offices / services / counters
def test_super_admin_creates_office_and_it_is_publicly_discoverable(client, db, world):
    w = world
    body = {"name": "Pune Passport Office", "code": "pune-pso", "address": "FC Road, Pune", "city": "Pune",
            "state": "Maharashtra", "opening_time": "09:00", "closing_time": "17:00"}
    assert client.post(f"{API}/admin/offices", headers=auth(w.admin), json=body).status_code == 403
    r = client.post(f"{API}/admin/offices", headers=auth(w.super), json=body)
    assert r.status_code == 201 and r.json()["code"] == "PUNE-PSO"
    assert client.post(f"{API}/admin/offices", headers=auth(w.super), json=body).status_code == 409
    found = client.get(f"{API}/offices", params={"q": "pune", "state": "maharashtra"}).json()
    assert found["pagination"]["total"] == 1 and found["items"][0]["city"] == "Pune"
    bad_tz = client.post(f"{API}/admin/offices", headers=auth(w.super), json={**body, "code": "X1", "timezone": "Mars/Base"})
    assert bad_tz.status_code == 400


def test_office_admin_edits_own_office_only_and_not_privileged_fields(client, db, world):
    w = world
    ok = client.patch(f"{API}/admin/offices/{w.office.id}", headers=auth(w.admin),
                      json={"phone": "0281-111", "call_grace_minutes": 3})
    assert ok.status_code == 200 and ok.json()["call_grace_minutes"] == 3
    assert client.patch(f"{API}/admin/offices/{w.office.id}", headers=auth(w.admin),
                        json={"is_active": False}).status_code == 403
    assert client.patch(f"{API}/admin/offices/{w.other_office.id}", headers=auth(w.admin),
                        json={"phone": "x"}).status_code == 403
    assert client.patch(f"{API}/admin/offices/{w.office.id}", headers=auth(w.officer), json={}).status_code == 403
    assert db.scalar(select(AuditLog.id).where(AuditLog.action == "OFFICE_UPDATED")) is not None


def test_service_and_counter_management_is_office_scoped(client, db, world):
    w = world
    svc = client.post(f"{API}/admin/offices/{w.office.id}/services", headers=auth(w.admin),
                      json={"name": "Licence", "code": "lic", "estimated_service_minutes": 7})
    assert svc.status_code == 201 and svc.json()["code"] == "LIC"
    assert client.post(f"{API}/admin/offices/{w.office.id}/services", headers=auth(w.admin),
                       json={"name": "Dup", "code": "LIC"}).status_code == 409
    assert client.post(f"{API}/admin/offices/{w.other_office.id}/services", headers=auth(w.admin),
                       json={"name": "Nope", "code": "NO"}).status_code == 403
    patched = client.patch(f"{API}/admin/services/{svc.json()['id']}", headers=auth(w.admin),
                           json={"estimated_service_minutes": 9, "is_active": False})
    assert patched.status_code == 200 and patched.json()["is_active"] is False
    # deactivated service no longer accepts tokens
    inactive = client.post(f"{API}/tokens", headers=auth(w.citizen),
                           json={"office_id": str(w.office.id), "service_id": svc.json()["id"]})
    assert inactive.status_code == 400

    ctr = client.post(f"{API}/admin/offices/{w.office.id}/counters", headers=auth(w.admin),
                      json={"name": "Counter 9", "service_id": str(w.svc_a.id)})
    assert ctr.status_code == 201 and ctr.json()["status"] == "ACTIVE"
    # a service from another office cannot be attached
    other_svc = client.get(f"{API}/offices/{w.other_office.id}/services").json()["items"][0]["id"]
    assert client.post(f"{API}/admin/offices/{w.office.id}/counters", headers=auth(w.admin),
                       json={"name": "Counter 10", "service_id": other_svc}).status_code == 400
    assert client.patch(f"{API}/admin/counters/{ctr.json()['id']}", headers=auth(w.other_admin),
                        json={"name": "hijack"}).status_code == 403


def test_counter_service_cannot_change_while_holding_a_token(client, db, world):
    w = world
    take_token(client, w, w.citizen)
    client.post(f"{API}/officer/queue/call-next", headers=auth(w.officer), json={"counter_id": str(w.c1.id)})
    r = client.patch(f"{API}/admin/counters/{w.c1.id}", headers=auth(w.admin), json={"clear_service": True})
    assert r.status_code == 409 and r.json()["error"]["code"] == "COUNTER_HAS_ACTIVE_TOKEN"


# --------------------------------------------------------------------------- users
def test_staff_provisioning_and_scoping(client, db, world):
    w = world
    body = {"full_name": "New Officer", "email": "new.officer@example.com", "password": PASSWORD, "role": "OFFICER",
            "office_id": str(w.office.id)}
    assert client.post(f"{API}/admin/users", headers=auth(w.citizen), json=body).status_code == 403
    assert client.post(f"{API}/admin/users", headers=auth(w.officer), json=body).status_code == 403
    ok = client.post(f"{API}/admin/users", headers=auth(w.admin), json=body)
    assert ok.status_code == 201 and ok.json()["role"] == "OFFICER" and ok.json()["verification_status"] == "APPROVED"
    # the new officer can log in with the set password
    assert client.post(f"{API}/auth/login", json={"email": "new.officer@example.com", "password": PASSWORD}
                       ).status_code == 200
    # office admins cannot mint admins or officers for another office
    assert client.post(f"{API}/admin/users", headers=auth(w.admin),
                       json={**body, "email": "a@example.com", "role": "OFFICE_ADMIN"}).status_code == 403
    assert client.post(f"{API}/admin/users", headers=auth(w.admin),
                       json={**body, "email": "b@example.com", "office_id": str(w.other_office.id)}).status_code == 403
    # super admin can; staff need an office; citizens cannot be provisioned
    assert client.post(f"{API}/admin/users", headers=auth(w.super),
                       json={**body, "email": "c@example.com", "role": "CENTRAL_ADMIN", "office_id": None}
                       ).status_code == 201
    assert client.post(f"{API}/admin/users", headers=auth(w.super),
                       json={**body, "email": "d@example.com", "office_id": None}).status_code == 400
    assert client.post(f"{API}/admin/users", headers=auth(w.super),
                       json={**body, "email": "e@example.com", "role": "CITIZEN"}).status_code == 422
    assert client.post(f"{API}/admin/users", headers=auth(w.super), json=body).status_code == 409


def test_user_listing_scope_and_deactivation_cuts_sessions(client, db, world):
    w = world
    listed = client.get(f"{API}/admin/users", headers=auth(w.admin)).json()
    assert {u["role"] for u in listed["items"]} == {"OFFICER"}
    assert all(u["office_id"] == str(w.office.id) for u in listed["items"])
    everyone = client.get(f"{API}/admin/users", headers=auth(w.super)).json()
    assert everyone["pagination"]["total"] == 8
    assert client.get(f"{API}/admin/users", headers=auth(w.citizen)).status_code == 403

    officer_headers = auth(w.officer)
    assert client.get(f"{API}/users/me", headers=officer_headers).status_code == 200
    r = client.patch(f"{API}/admin/users/{w.officer.id}", headers=auth(w.admin), json={"is_active": False})
    assert r.status_code == 200 and r.json()["is_active"] is False
    assert client.get(f"{API}/users/me", headers=officer_headers).status_code == 401
    # office admin cannot touch other offices' staff or other roles
    assert client.patch(f"{API}/admin/users/{w.other_officer.id}", headers=auth(w.admin),
                        json={"is_active": False}).status_code == 404
    assert client.patch(f"{API}/admin/users/{w.central.id}", headers=auth(w.admin),
                        json={"is_active": False}).status_code == 404
    assert client.patch(f"{API}/admin/users/{w.super.id}", headers=auth(w.super),
                        json={"is_active": False}).status_code == 400  # no self-lockout


def test_role_change_is_super_admin_only_and_audited(client, db, world):
    w = world
    body = {"role": "OFFICE_ADMIN", "office_id": str(w.office.id)}
    for actor in (w.admin, w.officer, w.citizen, w.central):
        assert client.patch(f"{API}/admin/users/{w.citizen2.id}/role", headers=auth(actor), json=body).status_code == 403
    r = client.patch(f"{API}/admin/users/{w.citizen2.id}/role", headers=auth(w.super), json=body)
    assert r.status_code == 200 and r.json()["role"] == "OFFICE_ADMIN"
    log = db.scalars(select(AuditLog).where(AuditLog.action == "ROLE_CHANGED")).one()
    assert log.detail["from"] == "CITIZEN" and log.detail["to"] == "OFFICE_ADMIN" and log.actor_user_id == w.super.id
    assert client.patch(f"{API}/admin/users/{w.super.id}/role", headers=auth(w.super),
                        json={"role": "CITIZEN"}).status_code == 400
    assert client.patch(f"{API}/admin/users/{w.citizen2.id}/role", headers=auth(w.super),
                        json={"role": "OFFICER"}).status_code == 400  # staff role needs an office


def test_audit_log_scoping(client, db, world):
    w = world
    client.post(f"{API}/counters/{w.c1.id}/pause", headers=auth(w.admin))
    mine = client.get(f"{API}/admin/audit-logs", headers=auth(w.admin)).json()
    assert mine["pagination"]["total"] == 1 and mine["items"][0]["action"] == "COUNTER_PAUSE"
    assert mine["items"][0]["actor"] == w.admin.full_name
    other = client.get(f"{API}/admin/audit-logs", headers=auth(w.other_admin)).json()
    assert other["pagination"]["total"] == 0
    assert client.get(f"{API}/admin/audit-logs", headers=auth(w.officer)).status_code == 403


# --------------------------------------------------------------------------- verification workflow
def test_verification_approval_promotes_applicant(client, db, world):
    w = world
    applicant = make_user(db, "CITIZEN", email="aspiring@kerala.gov.in", name="Asha Staff")
    body = {"requested_role": "OFFICER", "requested_office_id": str(w.office.id),
            "documents": [{"name": "id-card.pdf", "doc_type": "GOVT_ID"}]}
    r = client.post(f"{API}/verification/applications", headers=auth(applicant), json=body)
    assert r.status_code == 201, r.text
    app_ = r.json()
    assert app_["status"] == "PENDING" and app_["ai_assessment"] is None
    assert {f["type"] for f in app_["findings"]} >= {"SUCCESS", "INFO"}
    assert all(f["source"] == "SYSTEM" for f in app_["findings"])
    assert client.post(f"{API}/verification/applications", headers=auth(applicant), json=body).status_code == 409

    # who can see it
    assert client.get(f"{API}/verification/applications/{app_['id']}", headers=auth(w.citizen)).status_code == 404
    assert client.get(f"{API}/verification/applications/{app_['id']}", headers=auth(w.other_admin)).status_code == 404
    assert client.get(f"{API}/verification/applications/{app_['id']}", headers=auth(applicant)).status_code == 200
    assert client.get(f"{API}/verification/applications", headers=auth(w.officer)).status_code == 403
    assert client.get(f"{API}/verification/applications", headers=auth(w.admin)).json()["pagination"]["total"] == 1
    assert client.get(f"{API}/verification/applications", headers=auth(w.other_admin)).json()["pagination"]["total"] == 0

    # applicants cannot decide; decisions need a note unless approving
    assert client.post(f"{API}/verification/applications/{app_['id']}/decision", headers=auth(applicant),
                       json={"decision": "APPROVE"}).status_code == 403
    assert client.post(f"{API}/verification/applications/{app_['id']}/decision", headers=auth(w.admin),
                       json={"decision": "REJECT"}).status_code == 400
    assert client.post(f"{API}/verification/applications/{app_['id']}/start-review", headers=auth(w.admin)
                       ).json()["status"] == "UNDER_REVIEW"
    done = client.post(f"{API}/verification/applications/{app_['id']}/decision", headers=auth(w.admin),
                       json={"decision": "APPROVE", "note": "Documents verified"})
    assert done.status_code == 200 and done.json()["status"] == "APPROVED"
    assert [e["action"] for e in done.json()["audit_log"]] == [
        "APPLICATION_SUBMITTED", "APPLICATION_REVIEW_STARTED", "APPLICATION_APPROVED"]
    db.expire_all()
    u = db.get(User, applicant.id)
    assert u.role == "OFFICER" and u.office_id == w.office.id and u.verification_status == "APPROVED"
    # and the promoted user's existing token now carries officer powers (role is read from the DB every request)
    assert client.get(f"{API}/officer/queue/current", params={"counter_id": str(w.c1.id)},
                      headers=auth(u)).status_code == 200
    notes = client.get(f"{API}/notifications", headers=auth(u)).json()["items"]
    assert any(n["type"] == "VERIFICATION_UPDATE" for n in notes)
    assert client.post(f"{API}/verification/applications/{app_['id']}/decision", headers=auth(w.admin),
                       json={"decision": "REJECT", "note": "late"}).status_code == 409


def test_verification_more_info_resubmit_and_scope_limits(client, db, world):
    w = world
    applicant = make_user(db, "CITIZEN", email="someone@gmail.com")
    r = client.post(f"{API}/verification/applications", headers=auth(applicant), json={
        "requested_role": "OFFICER", "requested_office_id": str(w.office.id), "documents": []})
    app_ = r.json()
    assert any(f["type"] == "ERROR" for f in app_["findings"])  # no documents
    assert any(f["type"] == "WARNING" for f in app_["findings"])  # non-government email
    more = client.post(f"{API}/verification/applications/{app_['id']}/decision", headers=auth(w.admin),
                       json={"decision": "MORE_INFO", "note": "Please attach your ID card"})
    assert more.json()["status"] == "MORE_INFO_REQUIRED"
    again = client.post(f"{API}/verification/applications/{app_['id']}/resubmit", headers=auth(applicant),
                        json={"documents": [{"name": "id.pdf", "doc_type": "GOVT_ID"}]})
    assert again.status_code == 200 and again.json()["status"] == "PENDING"
    assert not any(f["type"] == "ERROR" for f in again.json()["findings"])
    assert client.post(f"{API}/verification/applications/{app_['id']}/resubmit", headers=auth(applicant),
                       json={"documents": [{"name": "x", "doc_type": "y"}]}).status_code == 409

    # an OFFICE_ADMIN request can only be decided by a super admin
    other = make_user(db, "CITIZEN", email="boss@gov.in")
    adm = client.post(f"{API}/verification/applications", headers=auth(other), json={
        "requested_role": "OFFICE_ADMIN", "requested_office_id": str(w.office.id), "documents": []}).json()
    assert client.post(f"{API}/verification/applications/{adm['id']}/decision", headers=auth(w.admin),
                       json={"decision": "APPROVE"}).status_code == 404
    assert client.post(f"{API}/verification/applications/{adm['id']}/decision", headers=auth(w.super),
                       json={"decision": "APPROVE"}).status_code == 200
    # staff cannot apply
    assert client.post(f"{API}/verification/applications", headers=auth(w.officer), json={
        "requested_role": "OFFICER", "requested_office_id": str(w.office.id)}).status_code == 403
    assert client.post(f"{API}/verification/applications", headers=auth(make_user(db)), json={
        "requested_role": "SUPER_ADMIN", "requested_office_id": str(w.office.id)}).status_code == 422
    _ = (uuid, make_counter)
