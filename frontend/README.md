# SkipTheLine frontend

React + TypeScript + Vite, talking to the FastAPI backend in `../backend`. There is no mock mode: every screen reads
from the API, and live updates arrive over the office WebSocket.

## Run it

```bash
# 1. backend (see ../backend/README.md): database, `alembic upgrade head`, `python scripts/seed_demo.py --queue 6`
uvicorn app.main:app --port 8000          # from ../backend

# 2. frontend
npm install
npm run dev                               # http://localhost:5173  (must match CORS_ORIGINS in backend/.env)
```

`VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`) and `VITE_WS_BASE_URL` (default `ws://localhost:8000`)
can be set in `.env`. In production set them on the frontend Vercel project to the API host
(`https://…/api/v1` and `wss://…`) and redeploy — Vite inlines them at build time. See
`../backend/README.md` → **Deploy on Vercel**. In dev builds the login page lists the seeded demo accounts
(`citizen@`, `officer@`, `admin@`, `central@`, `super@` `demo.skiptheline.test`).

## How data flows

- `src/services/api/*` — one module per backend area; `adapters.ts` maps snake_case API payloads to the view types in `src/types`.
- `src/stores/liveStore.ts` — the signed-in user's live state (token, queue, counters, notifications); actions call the API then re-sync.
- `src/services/websocket/WebSocketService.ts` + `LiveSync` in `src/app/providers` — one office socket; every event triggers a debounced re-sync.
- Role dashboards for central/super admins use React Query hooks (`src/hooks`).

Not backed by the API yet (shown honestly in the UI): password reset, platform settings page, hourly service-time and
utilisation analytics, ML forecasts.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
