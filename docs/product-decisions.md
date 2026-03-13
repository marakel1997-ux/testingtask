# Product Decisions (MVP)

1. Surprise-first privacy:
   - Owner never sees contributor identity.
   - System stores only anonymous reservation/contribution state for owner consumption.
   - Public UI repeats this promise next to actions to prevent accidental deanonymization concerns.

2. Deletion with funding/reservation consistency:
   - Items with existing contributions are soft deleted and hidden from public cards while preserving totals.
   - Items removed while reserved are also soft deleted so concurrent public tabs converge safely and avoid stale actions.
   - Owner dashboard surfaces a “removed with preserved contributions” section to make totals auditable.

3. Realtime consistency and concurrency:
   - All public viewers of a wishlist receive websocket updates for reservation and funding changes.
   - Reservation/contribution operations use row locking and conflict responses for race safety.
   - Public pages accept websocket snapshots and incremental item events so multiple open tabs stay in sync.

4. Funding invariants:
   - Contributions are blocked once an item is fully funded.
   - Contributions cannot exceed the remaining amount.
   - Exact target contributions mark the item fully funded and release reservation state.

5. Progressive UX and resilience:
   - Manual item entry is always available when URL metadata extraction fails.
   - Empty/loading/error states are explicit on owner and public pages.
   - Invalid public slugs resolve to a dedicated not-found page without leaking internals.
   - Product links are optional and unavailable URLs render with clear fallback copy.
