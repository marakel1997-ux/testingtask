from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Wishlist
from app.schemas.wishlist import PublicContributeRequest, PublicReserveRequest, PublicWishlistOut, WishlistItemOut
from app.services.wishlist_service import contribute_to_item, get_public_wishlist_or_404, release_item, reserve_item

router = APIRouter(prefix='/public/w', tags=['public'])


@router.get('/{public_id}', response_model=PublicWishlistOut)
def get_public_wishlist(public_id: str, db: Session = Depends(get_db)):
    wishlist = db.execute(select(Wishlist).where(Wishlist.public_id == public_id).options(selectinload(Wishlist.items))).scalar_one_or_none()
    if not wishlist:
        get_public_wishlist_or_404(db, public_id)
    visible_items = [i for i in wishlist.items if not i.is_deleted]
    return PublicWishlistOut(
        public_id=wishlist.public_id,
        title=wishlist.title,
        description=wishlist.description,
        event_type=wishlist.event_type,
        event_date=wishlist.event_date,
        is_archived=wishlist.is_archived,
        items=[WishlistItemOut.model_validate(i) for i in visible_items],
    )


@router.post('/{public_id}/items/{item_id}/reserve', response_model=WishlistItemOut)
def reserve(public_id: str, item_id: UUID, payload: PublicReserveRequest, db: Session = Depends(get_db)):
    item = reserve_item(db, public_id, item_id, payload.anonymous_note)
    db.commit()
    db.refresh(item)
    return item


@router.post('/{public_id}/items/{item_id}/release', response_model=WishlistItemOut)
def release(public_id: str, item_id: UUID, db: Session = Depends(get_db)):
    item = release_item(db, public_id, item_id)
    db.commit()
    db.refresh(item)
    return item


@router.post('/{public_id}/items/{item_id}/contribute', response_model=WishlistItemOut)
def contribute(public_id: str, item_id: UUID, payload: PublicContributeRequest, db: Session = Depends(get_db)):
    item = contribute_to_item(db, public_id, item_id, payload.amount, payload.currency, payload.message)
    db.commit()
    db.refresh(item)
    return item
