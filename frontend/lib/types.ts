export type WishlistItem = {
  id: string;
  title: string;
  product_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  target_price: string;
  currency: string;
  amount_collected: string;
  is_reserved: boolean;
  is_fully_funded: boolean;
  is_deleted: boolean;
  deleted_reason?: string | null;
};

export type Wishlist = {
  id: string;
  public_id: string;
  title: string;
  description?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  is_archived: boolean;
};

export type WishlistDetail = Wishlist & { items: WishlistItem[] };

export type PublicWishlist = Omit<Wishlist, 'id'> & { items: WishlistItem[] };

export type ItemMetadataAutofill = {
  ok: boolean;
  title?: string | null;
  image_url?: string | null;
  target_price?: string | number | null;
  product_url?: string | null;
  fallback_title: string;
  message: string;
};


export type PublicReserveResponse = {
  item: WishlistItem;
  release_token: string;
};
