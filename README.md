# GiftCircle

GiftCircle is a full-stack wishlist application designed for events (birthdays, holidays, baby showers, etc.) where gift-givers can reserve or partially fund items without revealing identity to the list owner.

The repository contains:
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI + SQLAlchemy + Alembic + PostgreSQL
- **Docs:** Product decision notes and submission context

---

## 1) Setup Instructions

### Prerequisites
- **Node.js** 18+
- **Python** 3.11+
- **PostgreSQL** 14+
- **npm** (or compatible package manager)

### Clone and enter the repository
```bash
git clone <your-repo-url>
cd testingtask
```

### Backend setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Backend default URL: `http://localhost:8000`

### Frontend setup
In a separate terminal:
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend default URL: `http://localhost:3000`

---

## 2) Local Development Steps

1. **Start Postgres** and ensure the database in `DATABASE_URL` exists.
2. **Run backend migrations** with `alembic upgrade head`.
3. **Start backend** (`uvicorn app.main:app --reload`).
4. **Start frontend** (`npm run dev`).
5. Open:
   - `http://localhost:3000` (frontend)
   - `http://localhost:8000/health` (backend health check)
6. Register a user via the app UI.
7. Create a wishlist in the dashboard.
8. Open the public wishlist URL in another browser/incognito session to validate anonymous reservation and contribution behavior.

---

## 3) Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description | Example |
|---|---|---|---|
| `APP_NAME` | no | API service display name. | `GiftCircle API` |
| `API_V1_PREFIX` | no | Base API route prefix. | `/api/v1` |
| `DATABASE_URL` | yes | SQLAlchemy connection string. | `postgresql+psycopg://postgres:postgres@localhost:5432/giftcircle` |
| `JWT_SECRET` | yes | JWT signing secret (must be strong in non-local envs). | `replace-with-strong-random-secret` |
| `JWT_ALGORITHM` | no | JWT algorithm. | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no | Access token TTL in minutes. | `60` |

### Frontend (`frontend/.env.local`)
| Variable | Required | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | yes | Base URL for browser API requests. | `http://localhost:8000/api/v1` |

---

## 4) Architecture Overview

### Monorepo layout
```text
.
├─ backend/
│  ├─ app/
│  │  ├─ api/          # REST routes and dependency injection
│  │  ├─ core/         # app configuration and security helpers
│  │  ├─ db/           # DB setup/session/base
│  │  ├─ models/       # SQLAlchemy entities
│  │  ├─ schemas/      # Pydantic schemas
│  │  ├─ services/     # domain logic (wishlist + metadata behavior)
│  │  └─ realtime.py   # websocket connection manager + events
│  └─ alembic/         # DB migrations
├─ frontend/
│  ├─ app/             # pages/routes (public + auth + dashboard)
│  ├─ components/      # UI building blocks
│  └─ lib/             # API client/types/auth storage
└─ docs/
   └─ product-decisions.md
```

### Request/data flow
1. Frontend calls backend REST APIs for auth, wishlist management, and public actions.
2. Backend persists state in PostgreSQL and applies domain constraints in service layer.
3. Public and owner clients subscribe to realtime websocket channels per wishlist.
4. Backend pushes incremental events (reservation/funding/item updates) to keep clients synchronized.

---

## 5) Product Decisions

Key MVP decisions:
- **Surprise-first privacy:** owner never sees contributor identity.
- **Anonymous participation:** reserving/contributing is optimized for low-friction guest users.
- **Soft-delete semantics:** items with contributions are preserved as historical records instead of hard-deleted.
- **Realtime consistency:** websocket updates are used to reduce stale state across tabs and viewers.
- **Graceful fallback UX:** invalid public links route to explicit not-found pages.

More detail is available in `docs/product-decisions.md`.

---

## 6) Edge-Case Decisions

- **Concurrent reservations:** only one active reservation is allowed for an item.
- **Overfunding prevention:** contributions cannot exceed remaining item amount.
- **Fully funded transitions:** item status flips to fully funded once target is reached; additional contributions are blocked.
- **Deletion with historical money data:** contributed items remain as soft-deleted records to preserve totals/auditability.
- **Realtime reconnect behavior:** clients should treat snapshot events as source-of-truth after reconnect.

---

## 7) Deployment Steps

### Backend deployment (example flow)
1. Provision PostgreSQL.
2. Set backend environment variables (`DATABASE_URL`, `JWT_SECRET`, etc.).
3. Install dependencies: `pip install -r requirements.txt`.
4. Run migrations: `alembic upgrade head`.
5. Start service with production ASGI command, e.g.:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
6. Put behind reverse proxy (Nginx/Cloud load balancer) with TLS.

### Frontend deployment (example flow)
1. Set `NEXT_PUBLIC_API_BASE_URL` to deployed backend API URL.
2. Build app:
   ```bash
   npm ci
   npm run build
   ```
3. Run app:
   ```bash
   npm run start
   ```
4. Deploy on Vercel or a Node-compatible host.

---

## 8) Known Limitations

- No automated end-to-end test suite is currently included.
- No rate-limiting/abuse mitigation middleware is currently implemented.
- No refresh-token/logout token revocation store is currently present.
- URL metadata extraction is planned but not fully integrated end-to-end.

---

## 9) Demo Checklist (for testers)

Use this quick script during QA:

1. Create and login to an owner account.
2. Create a wishlist and add at least two items.
3. Open the public wishlist link in a private/incognito window.
4. Reserve one item as guest and confirm owner view reflects reservation state.
5. Contribute partial funding to another item and confirm progress updates.
6. Contribute remaining amount to mark item fully funded.
7. Attempt an extra contribution and verify it is blocked.
8. Verify invalid public slug shows not-found experience.
9. Verify `/health` returns `{ "status": "ok" }`.

---

## 10) Useful Commands

### Backend
```bash
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm run dev
npm run lint
npm run build
```
