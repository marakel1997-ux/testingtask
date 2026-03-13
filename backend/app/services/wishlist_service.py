import secrets
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models import Contribution, Reservation, Wishlist, WishlistItem


def generate_public_id() -> str:
    return secrets.token_urlsafe(9)


def get_owned_wishlist_or_404(db: Session, owner_id: UUID, wishlist_id: UUID) -> Wishlist:
    stmt: Select[tuple[Wishlist]] = select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == owner_id)
    wishlist = db.execute(stmt).scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Wishlist not found')
    return wishlist


def get_public_wishlist_or_404(db: Session, public_id: str) -> Wishlist:
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


def reserve_item(db: Session, public_id: str, item_id: UUID, anonymous_note: str | None) -> WishlistItem:
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
    if item.is_reserved:
        raise HTTPException(status_code=409, detail='Item already reserved')

    reservation = Reservation(wishlist_item_id=item.id, status='active', anonymous_note=anonymous_note)
    item.is_reserved = True
    db.add(reservation)
    db.flush()
    return item


def release_item(db: Session, public_id: str, item_id: UUID) -> WishlistItem:
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
        .where(Reservation.wishlist_item_id == item.id, Reservation.status == 'active')
        .with_for_update()
    ).scalar_one_or_none()
    if active_res:
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

    contrib = Contribution(wishlist_item_id=item.id, amount=amount, currency=currency.upper(), message=message)
    db.add(contrib)
    db.flush()

    total = db.execute(select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.wishlist_item_id == item.id)).scalar_one()
    was_fully_funded = item.is_fully_funded
    item.amount_collected = total
    item.is_fully_funded = total >= item.target_price
    db.flush()
    return item, (not was_fully_funded and item.is_fully_funded)
