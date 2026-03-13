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
- WebSocket realtime feed for public viewers at `GET /api/v1/public/w/{public_id}/events` (WebSocket).

## Realtime event model (brief)
- Subscribe each public viewer to `ws://<host>/api/v1/public/w/{public_id}/events`.
- On connect, server sends a `snapshot` event with the current visible item list. This is the baseline state used after reconnects.
- Incremental events are then pushed for mutations:
  - `item_reserved`
  - `reservation_canceled`
  - `contribution_added`
  - `item_fully_funded` (sent when crossing from not fully funded to fully funded)
  - `item_soft_deleted`
- Every incremental event includes `event`, `public_id`, `item_id`, `occurred_at`, and the latest `item` object. Frontends should upsert by `item_id` and trust the latest payload.

## Not Yet Included
- Refresh token/logout flow.
- URL metadata extraction.
- Rate limiting / anti-abuse controls.
- End-to-end automated tests.
