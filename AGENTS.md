# AGENTS.md

## Project Overview
SurveyFlow — a React + Vite frontend with an Express backend using Node's built-in SQLite (`node:sqlite`). No external database required.

## Architecture
- **Frontend** (`/`): Vite dev server on port 5173 (mapped to host 3000). React 19 + TypeScript + Tailwind + shadcn/ui.
- **Backend** (`/server/`): Express + `node:sqlite` on port 8787 (mapped to host 8000). Uses `tsx watch` for live reload.
- The frontend calls the backend via `VITE_API_BASE_URL` (set in compose to the backend's public URL).
- Backend uses `cors()` (allow all origins), so cross-origin requests work with the separate-origin wiring.

## Key Details
- **Node ≥ 22.5 required** for `node:sqlite`. The `node:22` Docker image satisfies this.
- SQLite file is created at repo root (`surveyflow.sqlite3`) on first boot.
- No secrets are required to boot. All external API keys (CPX, BitLabs, AdGate, Anthropic) are optional — the app shows "no networks configured" warnings without them. `ADMIN_SETTINGS_TOKEN` is only needed to use the in-app Settings page.
- External keys can be configured at runtime via the Settings page (stored in the SQLite `settings` table, which overrides env vars).

## Verification
- API health: `curl http://localhost:8000/health` → `{"ok":true}`
- Frontend: `curl http://localhost:3000/` → HTML with Vite dev modules
- Both services have healthchecks in `docker-compose.base44.yml`

## Dev Commands
- Frontend: `npm run dev` (Vite)
- Backend: `cd server && npm run dev` (tsx watch)
- Build frontend: `npm run build`
- Build backend: `cd server && npm run build`
