from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User, Wishlist, WishlistItem
from app.schemas.wishlist import (
    WishlistCreate,
    WishlistDetailOut,
    WishlistItemCreate,
    WishlistItemOut,
    WishlistItemUpdate,
    WishlistOut,
    WishlistUpdate,
)
from app.services.wishlist_service import generate_public_id, get_owned_item_or_404, get_owned_wishlist_or_404

router = APIRouter(prefix='/wishlists', tags=['wishlists'])


@router.get('', response_model=list[WishlistOut])
def list_wishlists(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(Wishlist).where(Wishlist.owner_id == current_user.id).order_by(Wishlist.created_at.desc())).scalars().all()
    return rows


@router.post('', response_model=WishlistOut, status_code=201)
def create_wishlist(payload: WishlistCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wishlist = Wishlist(owner_id=current_user.id, public_id=generate_public_id(), **payload.model_dump())
    db.add(wishlist)
    db.commit()
    db.refresh(wishlist)
    return wishlist


@router.get('/{wishlist_id}', response_model=WishlistDetailOut)
def get_wishlist(wishlist_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wishlist = db.execute(
        select(Wishlist)
        .where(Wishlist.id == wishlist_id, Wishlist.owner_id == current_user.id)
        .options(selectinload(Wishlist.items))
    ).scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail='Wishlist not found')
    return wishlist


@router.patch('/{wishlist_id}', response_model=WishlistOut)
def update_wishlist(wishlist_id: UUID, payload: WishlistUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wishlist = get_owned_wishlist_or_404(db, current_user.id, wishlist_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(wishlist, key, value)
    db.commit()
    db.refresh(wishlist)
    return wishlist


@router.delete('/{wishlist_id}', status_code=204)
def archive_wishlist(wishlist_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wishlist = get_owned_wishlist_or_404(db, current_user.id, wishlist_id)
    wishlist.is_archived = True
    db.commit()


@router.post('/{wishlist_id}/items', response_model=WishlistItemOut, status_code=201)
def create_item(wishlist_id: UUID, payload: WishlistItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _wishlist = get_owned_wishlist_or_404(db, current_user.id, wishlist_id)
    item = WishlistItem(wishlist_id=wishlist_id, **payload.model_dump())
    item.currency = item.currency.upper()
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch('/{wishlist_id}/items/{item_id}', response_model=WishlistItemOut)
def update_item(wishlist_id: UUID, item_id: UUID, payload: WishlistItemUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = get_owned_item_or_404(db, current_user.id, wishlist_id, item_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    if item.currency:
        item.currency = item.currency.upper()
    db.commit()
    db.refresh(item)
    return item


@router.delete('/{wishlist_id}/items/{item_id}', status_code=204)
def delete_item(wishlist_id: UUID, item_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = get_owned_item_or_404(db, current_user.id, wishlist_id, item_id)
    has_contribs = db.execute(select(WishlistItem.id).where(WishlistItem.id == item.id, WishlistItem.amount_collected > 0)).scalar_one_or_none()
    if has_contribs:
        item.is_deleted = True
        item.deleted_reason = 'owner_removed_with_contributions'
    else:
        db.delete(item)
    db.commit()
