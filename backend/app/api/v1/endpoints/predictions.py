import uuid

from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.core.errors import not_found
from app.db.models import Office, Token
from app.domain.token_states import Role
from app.realtime import publisher
from app.schemas.tokens import EtaOut
from app.services import access, eta_service, views
from app.services.timeutil import utcnow

router = APIRouter(tags=["predictions"])


class TokenEtaOut(EtaOut):
    token_id: uuid.UUID
    token_status: str


@router.get("/predictions/eta", response_model=TokenEtaOut)
def get_eta(token_id: uuid.UUID, db: DbSession, user: CurrentUser):
    """Latest baseline ETA for a WAITING token, recomputed from current queue + counter state (never stale)."""
    token = db.get(Token, token_id)
    if token is None or (user.role == Role.CITIZEN.value and token.citizen_id != user.id) or (
            user.role != Role.CITIZEN.value and not access.is_staff_of(user, token.office_id)):
        raise not_found("TOKEN_NOT_FOUND", "The requested token was not found.")
    office = db.get(Office, token.office_id)
    eta = eta_service.eta_for_waiting_token(db, office, token)
    if eta is None:  # not waiting: no meaningful wait to predict
        eta = eta_service.EtaResult(token_id=token.id, service_id=token.service_id, queue_position=None,
                                    status="OK", generated_at=utcnow())
    return {**views.eta_out(eta), "token_id": token.id, "token_status": token.status}


class RecalcOut(BaseModel):
    office_id: uuid.UUID
    recalculated: int
    method: str
    generated_at: str


@router.post("/predictions/eta/recalculate", response_model=RecalcOut)
def recalculate(office_id: uuid.UUID, db: DbSession, user: CurrentUser):
    """Staff-only: recompute ETAs for an office's queue and push them to connected clients."""
    access.ensure_queue_operator(user, office_id)  # officers / office admins of that office, or super admin
    office = db.get(Office, office_id)
    if office is None:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    sim = eta_service.simulate_office(db, office)
    publisher.emit_queue_refresh(db, office.id)
    publisher.commit_and_publish(db)
    return {"office_id": office.id, "recalculated": len(sim.etas), "method": eta_service.METHOD,
            "generated_at": sim.generated_at.isoformat()}

