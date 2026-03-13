from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class WishlistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    event_type: str | None = Field(default=None, max_length=50)
    event_date: date | None = None


class WishlistUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    event_type: str | None = Field(default=None, max_length=50)
    event_date: date | None = None
    is_archived: bool | None = None


class WishlistItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    product_url: str | None = None
    image_url: str | None = None
    description: str | None = None
    target_price: Decimal = Field(gt=0)
    currency: str = Field(default='USD', min_length=3, max_length=3)


class WishlistItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    product_url: str | None = None
    image_url: str | None = None
    description: str | None = None
    target_price: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)


class MetadataAutofillRequest(BaseModel):
    url: str = Field(min_length=1, max_length=1000)


class MetadataAutofillOut(BaseModel):
    ok: bool
    title: str | None = None
    image_url: str | None = None
    target_price: Decimal | None = None
    product_url: str | None = None
    fallback_title: str
    message: str


class PublicReserveRequest(BaseModel):
    anonymous_note: str | None = Field(default=None, max_length=500)


class PublicContributeRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    currency: str = Field(default='USD', min_length=3, max_length=3)
    message: str | None = Field(default=None, max_length=500)


class WishlistItemOut(ORMModel):
    id: UUID
    title: str
    product_url: str | None = None
    image_url: str | None = None
    description: str | None = None
    target_price: Decimal
    currency: str
    amount_collected: Decimal
    is_reserved: bool
    is_fully_funded: bool
    is_deleted: bool
    deleted_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class WishlistOut(ORMModel):
    id: UUID
    public_id: str
    title: str
    description: str | None = None
    event_type: str | None = None
    event_date: date | None = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime


class WishlistDetailOut(WishlistOut):
    items: list[WishlistItemOut]


class PublicWishlistOut(BaseModel):
    public_id: str
    title: str
    description: str | None = None
    event_type: str | None = None
    event_date: date | None = None
    is_archived: bool
    items: list[WishlistItemOut]
