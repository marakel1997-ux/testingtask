import asyncio
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi.encoders import jsonable_encoder
from starlette.websockets import WebSocket

from app.models import WishlistItem
from app.schemas.wishlist import WishlistItemOut


def serialize_item(item: WishlistItem) -> dict[str, Any]:
    return WishlistItemOut.model_validate(item).model_dump(mode='json')


class RealtimeBroker:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, public_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[public_id].add(websocket)

    async def disconnect(self, public_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            sockets = self._connections.get(public_id)
            if not sockets:
                return
            sockets.discard(websocket)
            if not sockets:
                self._connections.pop(public_id, None)

    async def broadcast(self, public_id: str, event: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._connections.get(public_id, set()))

        if not sockets:
            return

        payload = jsonable_encoder(event)
        dead_sockets: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                dead_sockets.append(socket)

        if not dead_sockets:
            return

        async with self._lock:
            active = self._connections.get(public_id)
            if not active:
                return
            for socket in dead_sockets:
                active.discard(socket)
            if not active:
                self._connections.pop(public_id, None)


realtime_broker = RealtimeBroker()


def build_item_event(event_type: str, public_id: str, item: WishlistItem, **extra: Any) -> dict[str, Any]:
    payload = {
        'event': event_type,
        'public_id': public_id,
        'item_id': str(item.id),
        'occurred_at': datetime.now(timezone.utc).isoformat(),
        'item': serialize_item(item),
    }
    payload.update(extra)
    return payload


def build_snapshot_event(public_id: str, items: list[WishlistItem]) -> dict[str, Any]:
    return {
        'event': 'snapshot',
        'public_id': public_id,
        'occurred_at': datetime.now(timezone.utc).isoformat(),
        'items': [serialize_item(item) for item in items],
    }

