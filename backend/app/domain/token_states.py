"""Canonical domain vocabulary and the token state machine.

This module is the single place that resolves the naming differences between the design
documents (see README "Resolved design decisions"). Nothing else maps states.
"""
from enum import Enum


class Role(str, Enum):
    CITIZEN = "CITIZEN"
    OFFICER = "OFFICER"
    OFFICE_ADMIN = "OFFICE_ADMIN"
    CENTRAL_ADMIN = "CENTRAL_ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


STAFF_ROLES = {Role.OFFICER, Role.OFFICE_ADMIN}


class VerificationStatus(str, Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    MORE_INFO_REQUIRED = "MORE_INFO_REQUIRED"


class TokenStatus(str, Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    SERVING = "SERVING"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"
    CANCELLED = "CANCELLED"


TERMINAL_STATES = frozenset({TokenStatus.COMPLETED, TokenStatus.NO_SHOW, TokenStatus.CANCELLED})
# States in which a token occupies a counter (also the partial-unique-index predicate).
COUNTER_HOLDING_STATES = frozenset({TokenStatus.CALLED, TokenStatus.SERVING, TokenStatus.ON_HOLD})
# States in which a citizen still "has" the token (one per citizen per service).
LIVE_STATES = frozenset({TokenStatus.WAITING}) | COUNTER_HOLDING_STATES


class CounterStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"


class Command(str, Enum):
    CALL = "CALL"
    START = "START"
    COMPLETE = "COMPLETE"
    HOLD = "HOLD"
    RESUME = "RESUME"
    NO_SHOW = "NO_SHOW"
    CANCEL = "CANCEL"
    REQUEUE = "REQUEUE"  # counter closed / released while the token was assigned


S, C = TokenStatus, Command

TRANSITIONS: dict[tuple[TokenStatus, Command], TokenStatus] = {
    (S.WAITING, C.CALL): S.CALLED,
    (S.CALLED, C.START): S.SERVING,
    (S.CALLED, C.NO_SHOW): S.NO_SHOW,
    (S.WAITING, C.CANCEL): S.CANCELLED,
    (S.CALLED, C.CANCEL): S.CANCELLED,
    (S.SERVING, C.COMPLETE): S.COMPLETED,
    (S.SERVING, C.HOLD): S.ON_HOLD,
    (S.ON_HOLD, C.RESUME): S.SERVING,
    (S.CALLED, C.REQUEUE): S.WAITING,
    (S.SERVING, C.REQUEUE): S.WAITING,
    (S.ON_HOLD, C.REQUEUE): S.WAITING,
}

# Command -> event type written to queue_events.
EVENT_FOR_COMMAND: dict[Command, str] = {
    C.CALL: "TOKEN_CALLED",
    C.START: "SERVICE_STARTED",
    C.COMPLETE: "SERVICE_COMPLETED",
    C.HOLD: "TOKEN_HELD",
    C.RESUME: "TOKEN_RESUMED",
    C.NO_SHOW: "TOKEN_NO_SHOW",
    C.CANCEL: "TOKEN_CANCELLED",
    C.REQUEUE: "TOKEN_REQUEUED",
}

QUEUE_EVENT_TYPES = ["TOKEN_CREATED", *EVENT_FOR_COMMAND.values(), "TOKEN_EXPIRED"]


class InvalidTransition(Exception):
    def __init__(self, current: TokenStatus, command: Command):
        super().__init__(f"Cannot apply {command.value} to a token in state {current.value}")
        self.current = current
        self.command = command


def next_state(current: TokenStatus | str, command: Command) -> TokenStatus:
    cur = TokenStatus(current)
    try:
        return TRANSITIONS[(cur, command)]
    except KeyError:
        raise InvalidTransition(cur, command) from None
