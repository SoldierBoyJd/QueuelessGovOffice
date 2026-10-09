import itertools

import pytest

from app.domain.token_states import (TRANSITIONS, Command, InvalidTransition, TokenStatus, TERMINAL_STATES,
                                     next_state)

S, C = TokenStatus, Command


@pytest.mark.parametrize(("state", "command", "expected"), [(s, c, n) for (s, c), n in TRANSITIONS.items()])
def test_every_documented_transition(state, command, expected):
    assert next_state(state, command) is expected


def test_spec_happy_path():
    s = S.WAITING
    for cmd in (C.CALL, C.START, C.COMPLETE):
        s = next_state(s, cmd)
    assert s is S.COMPLETED


def test_every_other_pair_is_rejected():
    for state, command in itertools.product(S, C):
        if (state, command) not in TRANSITIONS:
            with pytest.raises(InvalidTransition):
                next_state(state, command)


@pytest.mark.parametrize("terminal", sorted(TERMINAL_STATES, key=lambda s: s.value))
def test_terminal_states_accept_nothing(terminal):
    for command in C:
        with pytest.raises(InvalidTransition):
            next_state(terminal, command)


def test_hold_only_from_serving_and_resume_only_from_hold():
    assert next_state(S.SERVING, C.HOLD) is S.ON_HOLD
    assert next_state(S.ON_HOLD, C.RESUME) is S.SERVING
    with pytest.raises(InvalidTransition):
        next_state(S.WAITING, C.HOLD)
    with pytest.raises(InvalidTransition):
        next_state(S.CALLED, C.RESUME)


def test_no_show_only_after_call():
    assert next_state(S.CALLED, C.NO_SHOW) is S.NO_SHOW
    with pytest.raises(InvalidTransition):
        next_state(S.WAITING, C.NO_SHOW)
