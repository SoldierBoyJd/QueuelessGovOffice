# QueueLess / SkipTheLine — Backend

FastAPI + SQLAlchemy 2 + PostgreSQL service behind the SkipTheLine frontend: citizens take virtual tokens
and see a wait estimate; officers run counters; admins monitor offices.

**What is real, what is not** (nothing below is claimed beyond this list):

| Area | Status |
|---|---|
| Auth (Argon2 passwords, JWT, server-side logout/deactivation revocation, roles, office scoping) | Implemented, tested |
| Offices / services / counters, admin management, audit trail | Implemented, tested |
| Token queue engine (atomic numbering, `call-next` with row locks, state machine, append-only event log) | Implemented, tested against real PostgreSQL incl. races |
| Baseline ETA (FIFO scheduling simulation, observed service times, ranges) | Implemented, tested. `method` is always `"baseline"`, `confidence` is always `null` |
| In-app notifications, WebSocket live updates | Implemented, tested (WebSocket is single-process, see limits) |
| Analytics (office, central, regions, queue movement, historical-average forecast) | Implemented from stored tokens; returns `null`/`available:false` when there is no data |
| Staff verification workflow (human decision, audit trail) | Implemented; findings are simple rule checks, **no OCR / AI** |
| ML ETA (XGBoost) | **Not implemented.** The registry endpoint reports it `INACTIVE` |
| OCR / document analysis (`POST /documents/analyze`) | **Not implemented** |
| SMS / email / push, password reset | **Not implemented** (in-app only) |

## Quick start

Requires Python 3.11+ (developed on 3.12).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
cp .env.example .env              # then edit it (see below)
```

**Database.** Use Neon / any PostgreSQL 14+ by putting its URL in `DATABASE_URL`
(`postgresql://…` is accepted). With no database handy, run a throw-away local one (bundled via `pgserver`):

```bash
python scripts/dev_postgres.py    # prints a DATABASE_URL for .env; leave it running
```

Then:

```bash
alembic upgrade head              # create the schema
python scripts/seed_demo.py --queue 6   # demo office/services/counters/accounts + a small live queue
uvicorn app.main:app --reload     # http://127.0.0.1:8000/docs , GET /api/v1/health
pytest                            # runs against a bundled PostgreSQL (or TEST_DATABASE_URL)
```

Demo accounts (synthetic, `*.test` addresses): `citizen@`, `citizen2@`, `officer@` (pinned to Counter 01),
`officer2@`, `admin@` (office admin), `central@`, `super@` — all `@demo.skiptheline.test`. Password comes from
`SEED_DEMO_PASSWORD`; it may be omitted **only** when `APP_ENV=development` (then the public dev default
`DemoPass#2026` is used — never seed that into a shared database).

### Configuration (`.env`)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL URL (TLS per provider, e.g. `?sslmode=require` for Neon) |
| `JWT_SECRET_KEY` | ≥ 32 random chars; startup **fails** outside development if weak/placeholder |
| `APP_ENV` | `development` / `test` relax the secret and CORS checks; anything else enforces them |
| `CORS_ORIGINS` | comma-separated explicit origins (no `*` outside development) |
| `ENFORCE_OFFICE_HOURS` | `true` rejects token creation outside office hours; set `false` to demo at night |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | default 30 |
| `RATE_LIMIT_ENABLED` | in-process limiter for login / register / token creation |
| `ENABLE_DOCS` | set `false` to hide `/docs` and `/openapi.json` |

## Layout

```
app/
  main.py                 app factory, middleware (request id, CORS, security headers), lifespan
  core/                   config, errors (shared envelope), security (Argon2 + JWT), rate limiter
  db/                     engine/session, models (one module per table group)
  domain/token_states.py  roles, token/counter states, the transition table  <- single source of truth
  services/
    queue_service.py      create / call-next / start / complete / hold / resume / no-show / cancel / requeue
    counter_service.py    pause / resume / close / open
    eta_service.py        baseline ETA simulation
    notification_service, audit_service, access (authorization), views (response builders)
  realtime/               outbox publisher (publishes only after commit) + WebSocket manager
  api/v1/endpoints/       thin route handlers
migrations/               Alembic (0001 = full schema + append-only trigger)
scripts/                  seed_demo.py, dev_postgres.py
tests/                    90 tests, real PostgreSQL
```

Handlers stay thin: authorization (against rows loaded from the DB) and every state change live in the
service layer, one transaction per mutation (state + event + notifications commit together; realtime
messages are sent only after commit).

## Resolved design decisions

The design documents disagreed in a few places. These are the choices made (change them in one place —
`app/domain/token_states.py` and the models — not in handlers):

| Question | Decision |
|---|---|
| Active service state | `SERVING` (not `IN_SERVICE`). Hold state is `ON_HOLD` |
| Counter states | `ACTIVE`, `PAUSED`, `CLOSED` (matches the schema doc and the frontend; no `OUT_OF_SERVICE`) |
| Event names | `TOKEN_CREATED`, `TOKEN_CALLED`, `SERVICE_STARTED`, `SERVICE_COMPLETED`, `TOKEN_HELD`, `TOKEN_RESUMED`, `TOKEN_NO_SHOW`, `TOKEN_CANCELLED`, `TOKEN_REQUEUED`, `TOKEN_EXPIRED` |
| User fields | Added `verification_status` and optional `counter_id` (officer pinned to a counter; `NULL` = any counter of their office) |
| Counter ↔ service | `service_id = NULL` means the counter serves **every** service of its office |
| Public codes | `display_number` = `<service code>-<NNN>`, unique per (office, day); numbers reset daily in the **office's** timezone |
| Office location | `city`, `district`, `state`, `lat`, `lng`, `phone` columns (the frontend map needs them) |
| Queue policy | One FIFO queue per (office, service, day). Generalist counters draw the oldest waiting token across services |
| Citizen policy | One live token per citizen per service (DB-enforced); signed-in citizens only; no priority classes |
| Hold | A held token keeps its counter busy until resumed; no requeue-on-hold |
| Closing a counter with an active token | `409 COUNTER_HAS_ACTIVE_TOKEN` unless `release_active_token=true`, which returns the token to the queue **keeping its place** and notifies the citizen |
| No-show | Only from `CALLED`, and only after the office's `call_grace_minutes` (`409 GRACE_PERIOD_ACTIVE` before that). Detection is manual |
| Cancel | Owner may cancel `WAITING`/`CALLED`; office admin / super admin may cancel with a reason |
| Stale tokens | Leftovers from a previous business day are closed as `CANCELLED` with a `TOKEN_EXPIRED` event the next time that office's queue is touched |
| Staff queue powers | `OFFICER` and `OFFICE_ADMIN` of the office; `SUPER_ADMIN` as an audited override; `CENTRAL_ADMIN` read-only analytics. Counter pause/close: office admin / super admin only |
| Client-sent durations | Never trusted: service time is computed from server timestamps (`complete` takes no body) |
| 400 vs 503 naming | Service not offered at an office is `400 SERVICE_NOT_AVAILABLE`; `503 SERVICE_UNAVAILABLE` is reserved for dependency outages |
| Not-found vs forbidden | Another citizen's token/notification → `404` (existence is not revealed). Staff acting outside their office/counter → `403` |

## ETA method (baseline)

All waiting tokens of an office are walked in FIFO order; each is given to the eligible `ACTIVE` counter that frees
up first (a busy counter is free after the *remaining* expected time of its current token). The target token's
assigned start is `estimated_service_at`; `arrive_by` = that minus `ARRIVAL_BUFFER_MINUTES` (default 10). Expected service time
per service is the configured value, replaced by the **median of the last ≤30 completed services** once ≥ 5 exist
(`basis: "observed"`). The `lower/upper` range is a configured factor (×0.75 / ×1.5, min spread 2 min,
`range_policy: "configured_factor"`) — **not** a calibrated interval. If no counter can serve the token the response
is `status: "NO_ACTIVE_COUNTER"` and `estimated_wait_minutes: null`; outside office hours `status: "OFFICE_CLOSED"`.
`GET /admin/models` reports the baseline's measured error (MAE/median/range coverage) from each token's ETA at
creation vs its actual wait — and `null` until real completions exist.

## API

Interactive docs at `/docs`. Base path `/api/v1`. Errors always use
`{"error": {"code", "message", "details", "request_id"}}`; pagination is `limit`/`offset` →
`{"items", "pagination": {"limit","offset","total"}}`.

| Area | Endpoints |
|---|---|
| Health | `GET /health`, `GET /health/ready` |
| Auth / profile | `POST /auth/register` `/auth/login` `/auth/logout`, `GET\|PATCH /users/me` |
| Discovery (public) | `GET /offices`, `/offices/{id}`, `/offices/{id}/services`, `/services/{id}` |
| Citizen tokens | `POST /tokens` (idempotency key supported), `GET /tokens`, `/tokens/{id}`, `/tokens/{id}/history`, `POST /tokens/{id}/cancel` |
| Queue | `GET /offices/{id}/queue`, `GET /officer/queue/current`, `POST /officer/queue/call-next` |
| Officer actions | `POST /officer/tokens/{id}/start\|complete\|hold\|resume\|no-show` |
| Counters | `GET /offices/{id}/counters`, `POST /counters/{id}/pause\|resume\|close\|open` |
| ETA | `GET /predictions/eta?token_id=`, `POST /predictions/eta/recalculate?office_id=` |
| Notifications | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |
| Analytics | `GET /analytics/office`, `/analytics/office/queue-movement`, `/analytics/office/forecast`, `/analytics/central/overview\|regions\|offices` |
| Verification | `POST /verification/applications`, `GET …/mine`, `GET …`, `POST …/{id}/start-review\|decision\|resubmit` |
| Admin | `POST\|PATCH /admin/offices`, `…/services`, `…/counters`, `GET\|POST\|PATCH /admin/users`, `PATCH /admin/users/{id}/role`, `GET /admin/audit-logs`, `GET /admin/system/health`, `GET /admin/models` |
| Live updates | `WS /api/v1/ws/offices/{office_id}` — first message must be `{"type":"auth","token":"<access token>"}`; events: `queue.updated`, `token.status_changed`, `token.eta_updated`, `counter.status_changed`, `notification.created`. Office-wide events are privacy-safe; token/notification events go only to their owner. Treat them as hints and refetch REST after (re)connecting |

## Connecting the frontend

The frontend still uses mock stores. Differences to handle when wiring it (the API is `snake_case`, the
frontend types are `camelCase`):

- Token status `HOLD` → backend `ON_HOLD`; `CREATED` does not exist (tokens start `WAITING`).
- Counter status `BREAK` → backend `PAUSED` (+ `status_reason`); `ACTIVE`/`CLOSED` unchanged.
- `prediction.confidence`/`modelVersion` are `null` for the baseline — don't render a percentage.
  `estimated_wait_minutes`, `estimated_service_at`, `arrive_by`, `queue_position` may be `null`
  (`eta.status` says why); show that state instead of `0`.
- System component status can also be `NOT_CONFIGURED` (ML model, OCR).
- Set the API base URL from env (`VITE_API_BASE_URL`), send `Authorization: Bearer …`, refetch after each
  mutation, and show API errors instead of assuming success. `wsStatus` should reflect the real socket.

## Security notes

- Passwords: Argon2id. Login failure is identical for unknown email / wrong password. Public registration only
  creates `CITIZEN` accounts and **rejects** unknown fields (`role`, `office_id`, …) with `422`; `PATCH /users/me`
  only accepts `full_name`/`phone`.
- JWT carries only the user id; role, office and active status are re-read from the database on **every**
  request. Logout and deactivation revoke previously issued tokens immediately (server-side `token_valid_after`).
- Every office/counter/token a request names is loaded and compared with the caller's scope; ids/roles in
  bodies or query strings are never trusted. Privileged actions are written to `audit_logs`; queue transitions to
  the append-only `queue_events` (DB trigger blocks UPDATE/DELETE).
- Responses never include password hashes; error responses never include stack traces or SQL; the access log
  records method/path/status only (no query strings, bodies or tokens).

## Known limitations

- **Single instance.** The rate limiter and WebSocket fan-out are in-process. For several instances use a shared
  limiter and a pub/sub layer (Redis, LISTEN/NOTIFY). REST + polling keeps working regardless.
- Access tokens only (30 min); no refresh tokens, password reset, e-mail/phone verification or MFA.
- Number allocation / `call-next` correctness relies on PostgreSQL row locks and unique indexes (tested on
  PostgreSQL 16). Deadlock/serialization aborts are retried up to 3 times.
- The forecast is a historical average (needs ≥ 2 past same-weekday days); it is not an ML forecast.
- Staff verification stores document **metadata only**; reviewers must inspect documents out of band.
- Not production-hardened: no formal threat model, penetration test, backups/retention policy or monitoring.
- The local `pgserver` Postgres has no timezone database; the code therefore does all timezone bucketing in
  Python (works on Neon/standard Postgres too).
