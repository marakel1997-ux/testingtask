# GiftCircle MVP (Social Wishlist App)

Production-oriented MVP for social wishlists with anonymous reservations, partial gift funding, and realtime updates.

## 1) Proposed Architecture

### Monorepo Layout
- `frontend/`: Next.js (App Router) + TypeScript + Tailwind CSS.
- `backend/`: FastAPI + SQLAlchemy + Alembic + PostgreSQL.
- `docs/`: Product and technical decision notes.

### High-Level Design
- **Frontend (Next.js)**
  - Private owner dashboard (authenticated): create/manage wishlists and items.
  - Public wishlist page (no auth): reserve/contribute anonymously.
  - WebSocket client subscription for realtime item state updates.
  - Form validation with shared schema patterns (Zod client-side).

- **Backend (FastAPI)**
  - REST API for CRUD/auth/public actions.
  - WebSocket hub for per-wishlist channels.
  - Domain services enforcing product rules (duplicate reservation prevention, funding consistency, soft-delete behavior).
  - URL metadata extraction endpoint for item autofill.

- **Data Layer (PostgreSQL)**
  - Normalized core entities with soft delete/archive flags.
  - Aggregated fields for fast public rendering (`amount_collected`, `is_reserved`, `is_fully_funded`).
  - Migration-driven schema changes via Alembic.

### Realtime Strategy
- WebSocket endpoint scoped by `wishlist_public_id`.
- Backend broadcasts item state changes (reservation/contribution/item lifecycle).
- Frontend optimistic UI + server reconciliation on events.

### Security & Privacy
- Owner auth: email + password (JWT access/refresh).
- Public pages never expose contributor identity.
- Owner API responses include only anonymous funding/reservation status.
- Write endpoints protected by rate limiting + basic abuse controls (MVP-safe defaults).

## 2) Proposed Database Schema

### `users`
- `id` (PK, UUID)
- `email` (unique, indexed)
- `password_hash`
- `display_name` (optional)
- `created_at`, `updated_at`

### `wishlists`
- `id` (PK, UUID)
- `owner_id` (FK -> users.id, indexed)
- `title`
- `description` (optional)
- `event_type` (birthday/holiday/custom)
- `event_date` (optional)
- `public_id` (unique, URL-safe token, indexed)
- `is_archived` (bool)
- `created_at`, `updated_at`

### `wishlist_items`
- `id` (PK, UUID)
- `wishlist_id` (FK -> wishlists.id, indexed)
- `title`
- `product_url`
- `image_url` (optional)
- `description` (optional)
- `target_price` (numeric(10,2))
- `currency` (char(3), default `USD`)
- `amount_collected` (numeric(10,2), default `0`)
- `is_reserved` (bool, derived + stored cache)
- `is_fully_funded` (bool, derived + stored cache)
- `is_deleted` (bool soft delete flag)
- `deleted_reason` (nullable; e.g. `owner_removed_with_contributions`)
- `created_at`, `updated_at`

### `reservations`
- `id` (PK, UUID)
- `wishlist_item_id` (FK -> wishlist_items.id, unique where active)
- `status` (`active`, `released`)
- `anonymous_note` (optional)
- `created_at`, `updated_at`

### `contributions`
- `id` (PK, UUID)
- `wishlist_item_id` (FK -> wishlist_items.id, indexed)
- `amount` (numeric(10,2), >0)
- `currency` (char(3))
- `message` (optional)
- `created_at`

### Optional utility tables (MVP-ready)
- `refresh_tokens` for secure session handling.
- `audit_events` for operational debugging.

### Key Constraints/Rules
- Active reservation uniqueness per item.
- `amount_collected` equals sum(contributions.amount) via service-layer update + DB check safety.
- Item delete behavior:
  - If no contributions: hard delete allowed.
  - If contributions exist: soft-delete item, preserve title snapshot + funding totals.

## 3) Planned REST API Routes

Base prefix: `/api/v1`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Owner Wishlist Management (auth required)
- `GET /wishlists`
- `POST /wishlists`
- `GET /wishlists/{wishlist_id}`
- `PATCH /wishlists/{wishlist_id}`
- `DELETE /wishlists/{wishlist_id}` (archive or delete per policy)
- `POST /wishlists/{wishlist_id}/archive`
- `POST /wishlists/{wishlist_id}/unarchive`

### Owner Item Management (auth required)
- `POST /wishlists/{wishlist_id}/items`
- `PATCH /wishlists/{wishlist_id}/items/{item_id}`
- `DELETE /wishlists/{wishlist_id}/items/{item_id}`

### Public Read (no auth)
- `GET /public/w/{public_id}` (wishlist + visible items)

### Public Actions (no auth)
- `POST /public/w/{public_id}/items/{item_id}/reserve`
- `POST /public/w/{public_id}/items/{item_id}/release`
- `POST /public/w/{public_id}/items/{item_id}/contribute`

### Metadata Autofill
- `POST /metadata/extract` with `{ url }` -> `{ title, image_url, price, currency }`

## 4) Planned Frontend Pages

### Public
- `/w/[publicId]` — public wishlist page with reserve/contribute interactions.
- `/w/not-found` — polished invalid/expired link page.

### Auth
- `/login`
- `/register`

### Owner App
- `/app` — dashboard overview and create wishlist CTA.
- `/app/wishlists/new`
- `/app/wishlists/[wishlistId]` — edit wishlist, manage items, view anonymous progress.
- `/app/wishlists/[wishlistId]/settings`

### Shared UX states
- Skeleton loaders, error toasts, empty state illustrations, mobile-optimized cards, funding badges, and progress bars.

## 5) Planned Realtime Events (WebSocket)

Channel: `wishlist:{public_id}`

### Server -> Client events
- `wishlist.snapshot`
  - initial state when connected.
- `item.reservation.updated`
  - `{ item_id, is_reserved }`
- `item.contribution.added`
  - `{ item_id, amount_collected, is_fully_funded, contribution_count }`
- `item.updated`
  - item edits visible to public.
- `item.soft_deleted`
  - preserve funded placeholder semantics.
- `wishlist.archived`
  - public page transitions to archived state.

### Client behavior
- Public viewers subscribe on page load and patch local cache.
- Owner dashboard subscribes to same channel but receives only anonymized payloads.

## 6) Initial Project Structure Created

```text
.
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ db/
│  │  ├─ models/
│  │  ├─ realtime/
│  │  ├─ schemas/
│  │  └─ services/
│  ├─ alembic/
│  │  └─ versions/
│  ├─ tests/
│  ├─ .env.example
│  └─ README.md
├─ frontend/
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  ├─ styles/
│  ├─ .env.example
│  └─ README.md
└─ docs/
   └─ product-decisions.md
```

## Product Decision Notes (MVP)
- Anonymous-only contributor model to preserve surprise by default.
- Reservation is single-active-lock per item.
- Funding supports unlimited partial contributions from public visitors.
- Owner-facing views never receive contributor identity fields.

