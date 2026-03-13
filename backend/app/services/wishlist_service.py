import secrets
import re
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models import Contribution, Reservation, Wishlist, WishlistItem

PUBLIC_ID_PATTERN = re.compile(r'^[A-Za-z0-9_-]{6,32}$')


def generate_public_id() -> str:
    return secrets.token_urlsafe(9)


def get_owned_wishlist_or_404(db: Session, owner_id: UUID, wishlist_id: UUID) -> Wishlist:
    stmt: Select[tuple[Wishlist]] = select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == owner_id)
    wishlist = db.execute(stmt).scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Wishlist not found')
    return wishlist


def get_public_wishlist_or_404(db: Session, public_id: str) -> Wishlist:
    if not PUBLIC_ID_PATTERN.match(public_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Wishlist not found')
    wishlist = db.execute(select(Wishlist).where(Wishlist.public_id == public_id)).scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Wishlist not found')
    return wishlist


def get_owned_item_or_404(db: Session, owner_id: UUID, wishlist_id: UUID, item_id: UUID) -> WishlistItem:
    item = db.execute(
        select(WishlistItem).join(Wishlist).where(
            Wishlist.id == wishlist_id,
            Wishlist.owner_id == owner_id,
            WishlistItem.id == item_id,
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Item not found')
    return item


def reserve_item(db: Session, public_id: str, item_id: UUID, anonymous_note: str | None) -> tuple[WishlistItem, str]:
    wishlist = get_public_wishlist_or_404(db, public_id)
    if wishlist.is_archived:
        raise HTTPException(status_code=400, detail='Wishlist is archived')

    item = db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item_id, WishlistItem.wishlist_id == wishlist.id, WishlistItem.is_deleted.is_(False))
        .with_for_update()
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail='Item not found')
    if item.is_fully_funded:
        raise HTTPException(status_code=409, detail='Item already fully funded')
    if item.is_reserved:
        raise HTTPException(status_code=409, detail='Item already reserved')

    release_token = secrets.token_urlsafe(24)
    reservation = Reservation(wishlist_item_id=item.id, status='active', release_token=release_token, anonymous_note=anonymous_note)
    item.is_reserved = True
    db.add(reservation)
    db.flush()
    return item, release_token


def release_item(db: Session, public_id: str, item_id: UUID, release_token: str) -> WishlistItem:
    wishlist = get_public_wishlist_or_404(db, public_id)
    item = db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item_id, WishlistItem.wishlist_id == wishlist.id, WishlistItem.is_deleted.is_(False))
        .with_for_update()
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail='Item not found')

    active_res = db.execute(
        select(Reservation)
        .where(
            Reservation.wishlist_item_id == item.id,
            Reservation.status == 'active',
            Reservation.release_token == release_token,
        )
        .with_for_update()
    ).scalar_one_or_none()
    if not active_res:
        raise HTTPException(status_code=403, detail='Invalid release token')

    active_res.status = 'released'
    item.is_reserved = False
    db.flush()
    return item


def contribute_to_item(db: Session, public_id: str, item_id: UUID, amount: Decimal, currency: str, message: str | None) -> tuple[WishlistItem, bool]:
    wishlist = get_public_wishlist_or_404(db, public_id)
    if wishlist.is_archived:
        raise HTTPException(status_code=400, detail='Wishlist is archived')

    item = db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item_id, WishlistItem.wishlist_id == wishlist.id, WishlistItem.is_deleted.is_(False))
        .with_for_update()
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail='Item not found')

    if currency.upper() != item.currency.upper():
        raise HTTPException(status_code=400, detail='Currency mismatch')

    if item.is_fully_funded:
        raise HTTPException(status_code=409, detail='Item is already fully funded')

    remaining = item.target_price - item.amount_collected
    if amount > remaining:
        raise HTTPException(
            status_code=409,
            detail=f'Contribution exceeds remaining amount ({remaining} {item.currency.upper()})',
        )

    contrib = Contribution(wishlist_item_id=item.id, amount=amount, currency=currency.upper(), message=message)
    db.add(contrib)
    db.flush()

    total = db.execute(select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.wishlist_item_id == item.id)).scalar_one()
    was_fully_funded = item.is_fully_funded
    item.amount_collected = total
    item.is_fully_funded = total >= item.target_price
    if item.is_fully_funded and item.is_reserved:
        active_res = db.execute(
            select(Reservation)
            .where(Reservation.wishlist_item_id == item.id, Reservation.status == 'active')
            .with_for_update()
        ).scalar_one_or_none()
        if active_res:
            active_res.status = 'released'
        item.is_reserved = False
    db.flush()
    return item, (not was_fully_funded and item.is_fully_funded)
