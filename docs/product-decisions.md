# Product Decisions (MVP)

1. Surprise-first privacy:
   - Owner never sees contributor identity.
   - System stores only anonymous reservation/contribution state for owner consumption.

2. Deletion with funding:
   - Items with existing contributions are soft deleted and shown as placeholders to preserve totals.

3. Realtime consistency:
   - All public viewers of a wishlist receive immediate websocket updates for reservation and funding changes.

4. Progressive UX:
   - Manual item entry always available when URL metadata extraction fails.
