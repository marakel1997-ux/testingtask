# Backend (FastAPI)

Planned backend API for GiftCircle MVP.

## Stack
- FastAPI
- PostgreSQL
- SQLAlchemy + Alembic
- WebSockets for realtime updates

## Initial Notes
- REST endpoints for auth/wishlist/item/public actions.
- Realtime broadcast channel per public wishlist ID.
- Strong service-layer enforcement for reservation and funding rules.
