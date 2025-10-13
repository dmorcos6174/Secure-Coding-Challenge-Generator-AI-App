## Quick orientation for AI coding agents

This repository is a small FastAPI backend + React (Vite) frontend that generates and stores coding multiple-choice questions using OpenAI and Clerk for auth. Below are the minimal, actionable things an AI agent needs to be productive here.

### Big picture
- Backend: `backend/src` (FastAPI). Main entry is `backend/server.py` which runs `uvicorn` and the FastAPI app defined in `backend/src/app.py`.
- Frontend: `frontend/src` (React + Vite). API helper is `frontend/src/utils/API.js`. Pages/components live under `frontend/src` (e.g. `challenge/ChallengeGenerator.jsx`).
- Database: SQLite via SQLAlchemy in `backend/src/database/models.py` (file `database.db` created at runtime).
- AI integration: `backend/src/ai_generator.py` uses OpenAI to create JSON-formatted challenges (title, options, correct_answer_id, explanation).
- Auth integration: Clerk backend SDK is used in `backend/src/utils.py`; frontend uses `@clerk/clerk-react` and `useAuth()` to get a bearer token.

### Key files to inspect (examples)
- `backend/src/ai_generator.py` — system prompt, OpenAI model, expected JSON output shape.
- `backend/src/routes/challenge.py` — API endpoints: POST `/api/generate-challenge`, GET `/api/my-history`, GET `/api/quota` and server-side flow (quota check → AI generation → DB save).
- `backend/src/database/models.py` — SQLAlchemy models (`Challenge`, `ChallengeQuota`) and `SessionLocal` provider.
- `backend/src/utils.py` — Clerk authentication helper `authenticate_and_get_user_details` (expects an HTTP Request and environment vars `CLERK_SECRET_KEY` and `JWT_KEY`).
- `frontend/src/utils/API.js` — centralized fetch helper `makeRequest(endpoint, options)` that sends `Authorization: Bearer <token>` and targets `http://localhost:8000/api/`.

### Environment variables (required)
- OPENAI_API_KEY — used by `ai_generator.py`.
- CLERK_SECRET_KEY — used by `backend/src/utils.py` Clerk SDK.
- JWT_KEY — used by `authenticate_and_get_user_details` (passed to Clerk options).

Set these before running the backend. Typical .env keys are referenced via `python-dotenv` in the backend.

### How to run locally (developer workflows)
- Backend (Windows PowerShell):
  - Create and activate a virtualenv, then install backend dependencies (from pyproject):
    - `python -m venv .venv`
    - `.\.venv\Scripts\Activate.ps1`
    - `pip install fastapi uvicorn openai python-dotenv sqlalchemy clerk-backend-api`
  - Start server (two equivalent ways):
    - `python backend/server.py` (server script calls `uvicorn.run`)
    - `uvicorn src.app:app --reload --host 0.0.0.0 --port 8000 --app-dir backend` (run from repo root)

- Frontend (from repo root):
  - `cd frontend`
  - `npm install`
  - `npm run dev` (opens Vite dev server; `package.json` defines `dev` script)

Notes: frontend uses Clerk to obtain tokens. The frontend `useApi` helper sends requests to `http://localhost:8000/api/<endpoint>` and expects the backend to validate the `Authorization` header.

### API contract / data shapes (explicit)
- POST /api/generate-challenge
  - Request JSON: `{ "difficulty": "easy|medium|hard" }`
  - Authorization: `Bearer <Clerk token>` header required (frontend uses `getToken()` from `@clerk/clerk-react`).
  - Successful response shape (backend attempts to return):
    {
      "id": number,
      "difficulty": string,
      "title": string,
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "correct_answer_id": number,
      "explanation": string,
      "timestamp": ISO8601 string
    }

### Important implementation patterns & gotchas (observe before changing)
- The AI generator expects to return strict JSON with keys `title`, `options` (array), `correct_answer_id` (int) and `explanation`. See `backend/src/ai_generator.py` for the system prompt and the fallback example.
- DB `Challenge.options` is a String column (comment: "Comma-separated options"), but the API expects arrays. When editing code, prefer storing options as a JSON string (json.dumps on write, json.loads on read) — see `routes/challenge.py` which expects `json.loads(new_challenge.options)`.
- Auth helper `authenticate_and_get_user_details` expects a FastAPI `Request` object (it calls `clerk.sdk.authenticate_request(request, ...)`). Several route handlers currently pass the Pydantic model named `request` into this helper — double-check call-sites and argument names if you modify authentication flow.
- SQLAlchemy `engine` uses `sqlite:///database.db` and `echo=True` so SQL statements are logged to stdout; this is handy for debugging but noisy in production.

### Quick edits etiquette for AI agents
- When modifying request/response shapes, update both `ai_generator.py`, `routes/challenge.py`, and the frontend consumer in `frontend/src/challenge/ChallengeGenerator.jsx` / `frontend/src/utils/API.js`.
- Preserve environment-driven behavior: do not hardcode API keys or tokens in source code.
- Small fixes (e.g., stringify options before DB insert) must include a minimal test (manual curl or fetch) or a quick run to validate the flow: generate → saved to DB → frontend receives `options` array.

### Debugging checklist (fast path)
1. Ensure required env vars are set: `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, `JWT_KEY`.
2. Start backend and watch SQL logs (SQLAlchemy echo).
3. Use the frontend dev server and open browser to exercise the flow; inspect network calls — requests go to `http://localhost:8000/api/*`.
4. If auth errors occur, confirm the frontend `getToken()` is returning a Clerk token and that the backend `authenticate_and_get_user_details` is called with the actual HTTP `Request` object.

If anything here is unclear or you want me to expand a section (e.g., include a short code fix for options JSONification or an authentication call-site fix), tell me which area to iterate on.
