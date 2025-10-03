Got it — here’s a **clear, detailed instruction document** you can drop straight into your project folder (e.g. `PROJECT_PLAN.md`). This will act as your “contract” between ChatGPT (me) and Cursor AI, so you never lose track again.

---

# Football Voice App — Development Workflow Plan

## Division of Roles

**Cursor AI**

* Handles **code edits and scaffolding** (creates files, modifies code across repo, generates React Native components, updates routers, etc.).
* Sees the full repo structure, so is best for multi-file consistency.
* Prompts will be provided by ChatGPT for Cursor to execute.

**ChatGPT (Planner/Architect)**

* Handles **planning, architecture, debugging, and clarifying tricky concepts**.
* Provides **Cursor prompts** to run (step by step).
* Explains trade-offs, best practices, and how to move between phases.
* Ensures we keep aligned to the original project plan (Phase 0 → Phase 7).

---

## Development Phases (from plan)

### Phase 0 — Setup (done)

* Repo created with `backend/`, `frontend/`, `speech/`, `infra/`, `tests/`
* Docker + Postgres
* Requirements installed

### Phase 1 — Backend MVP (done)

* FastAPI core app
* Matches, Players, Stats routers
* DB models (teams, players, matches, events)
* Basic endpoints:

  * `POST /matches/{id}/events` (structured JSON)
  * `GET /players/{id}/stats`

### Phase 2 — Parsing Engine (done ✅)

* `command_parser.py` with regex + fuzzy match (tested with 6 unit tests)
* `/matches/{id}/events/raw` endpoint added
* Confirmed working via Swagger & curl

---

## Phase 3 — Frontend MVP (next)

**Goal:** React Native app with Live Match functionality.

### Cursor Prompt 1: Scaffold app

```
Scaffold a new Expo React Native app in frontend/.  
- Use TypeScript.  
- Create frontend/src/screens/LiveMatchScreen.tsx with:  
  - A Start/Stop recording button  
  - A list showing parsed events returned from backend  
  - An Undo button to remove last event from list  
- Create frontend/src/services/ApiClient.ts to call FastAPI (/matches/{id}/events/raw).  
- Create frontend/src/services/AudioRecorderService.ts with start/stop stubs (no Whisper yet).  
- When Start is pressed, mock sending "Goal Winston" to backend and append response to events list.  
```

### Cursor Prompt 2: PostMatchReviewScreen

```
Create frontend/src/screens/PostMatchReviewScreen.tsx.  
- Show a timeline of events for a given match.  
- Each event has Edit/Delete options.  
- Use ApiClient to update or remove events via backend.  
- Keep UI simple with FlatList and basic buttons.
```

### Cursor Prompt 3: StatsDashboardScreen

```
Create frontend/src/screens/StatsDashboardScreen.tsx.  
- Show player stats fetched from GET /players/{id}/stats.  
- Display simple cards with goals, assists, tackles etc.  
- Use ApiClient to call backend.  
- Use FlatList or basic chart library.
```

---

## Phase 4 — Offline caching & Whisper

* Add `DbCacheService.ts` for local storage
* Replace mocked transcription with real Whisper service (server first, later mobile)

## Phase 5 — Background jobs

* Add Celery/Redis (or FastAPI background tasks)
* Precompute stats into `stats_cache`

## Phase 6 — Security & Deployment

* Add JWT auth
* Add CI/CD
* Dockerize and deploy

## Phase 7 — Pilot & Feedback

* Deploy app to real coaches
* Gather transcripts, corrections, feedback
* Improve parser rules & UX

---

## Golden Rule

* **Cursor edits code.**
* **ChatGPT guides you:** planning, debugging, giving you Cursor prompts.


