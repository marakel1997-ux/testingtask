# Backend (FastAPI)

Implemented MVP backend for GiftCircle.

## Run

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## Included
- FastAPI app with modular routers.
- PostgreSQL SQLAlchemy models.
- Alembic migration (`0001_initial`).
- JWT auth with email/password (`register`, `login`, `me`).
- Owner wishlist CRUD + item CRUD.
- Public wishlist read by slug (`public_id`).
- Public reserve/release and contribution endpoints.
- Race-condition-safe reservation flow using row locks + partial unique index.
- Privacy rule enforced by schema design and responses (no reserver/contributor identity exposed to owners).

## Not Yet Included
- Refresh token/logout flow.
- Websocket realtime events.
- URL metadata extraction.
- Rate limiting / anti-abuse controls.
- End-to-end automated tests.
