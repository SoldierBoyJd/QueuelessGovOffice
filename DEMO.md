# SkipTheLine — Demo script & pitch notes

**One-line pitch:** citizens take a virtual token from home, see a *predicted* wait, and are alerted to leave only when
their turn is approaching — so government offices stop being waiting rooms.

## Setup (once, from `backend/`)

```bash
python scripts/dev_postgres.py           # leave running; copy the printed DATABASE_URL into backend/.env
alembic upgrade head
python scripts/seed_demo.py              # offices, services, counters, demo accounts
python scripts/train_eta_model.py        # ~3 min: trains the wait-time model on simulated offices
python scripts/seed_history.py           # 4 weeks of simulated history (analytics, forecast, model benchmark)
uvicorn app.main:app --reload
# frontend/: npm install && npm run dev   ->  http://localhost:5173
```

All demo accounts use password `DemoPass#2026` (`citizen@`, `officer@`, `admin@`, `central@`, `super@` + `demo.skiptheline.test`).
Open two browser windows (one normal, one incognito) so a citizen and an officer are signed in side by side.

## 3-minute walkthrough

1. **Citizen (window A)** — *Find Services* → Rajkot District Office → *Passport Services*. Point out the live estimate
   *before* taking the token ("12 waiting · ~38 min"). Take the token.
2. **My Token** — predicted turn time, range, "Estimate: hgb-eta-v1". Set *travel time* to 20 min and click *Enable alerts*:
   "Stay home — we alert you when to leave."
3. **Admin (window B)** — Counters page: **pause Counter 01**. Back in window A the ETA jumps by itself (WebSocket), with no refresh.
4. **Officer (window B)** — *Call next token*. Window A flips to **CALLED — Counter 01** and plays the alert.
   *Start service* → *Complete*.
5. **Office admin** — Analytics + Forecast (4 weeks of data): predicted congestion window, recommendation to open more counters.
6. **Super admin → AI Models** — baseline vs ML error on offices the model never saw, and the live error measured on real tokens.
7. **Central admin** — national map and congestion by state.

## Numbers to quote

Run `python scripts/train_eta_model.py` and read `backend/app/ml/artifacts/metrics.json`
(`baseline_mae_minutes`, `ml_mae_minutes`, `mae_improvement_pct`, `ml_interval_coverage`).

## Be upfront about (judges respect this)

- Wait-time model and the 4-week history are **trained/generated on synthetic data** from a queue simulator
  (`backend/app/ml/simulator.py`). The pipeline is real — it retrains on real tokens by swapping the data source — and
  the benchmark is on simulated offices not used in training. Real-world accuracy must be re-measured after launch;
  the Models page already tracks live error per method.
- Alerts are browser/app notifications. SMS/WhatsApp needs a paid gateway (e.g. Twilio) and was left out on purpose.
- Password reset and platform settings are not implemented.

## Impact slide (use your measured numbers)

- Wait-time prediction error: baseline vs ML (from `metrics.json`).
- Citizens no longer queue physically: time at office ≈ travel + a few minutes.
- Office view: live congestion, forecasts, counter reassignment in one click.
