'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { WishlistDetail } from '@/lib/types';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';
import { currency } from '@/lib/utils';
import { useToast } from './Toast';

export function WishlistEditor({ wishlistId }: { wishlistId?: string }) {
  const [wishlist, setWishlist] = useState<WishlistDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(wishlistId));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { push } = useToast();

  const token = auth.get();

  useEffect(() => {
    if (!wishlistId) return;
    api<WishlistDetail>(`/wishlists/${wishlistId}`, {}, token)
      .then(setWishlist)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wishlistId, token]);

  async function saveWishlist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get('title'),
      description: form.get('description'),
      event_type: form.get('event_type'),
      event_date: form.get('event_date') || null
    };
    try {
      if (wishlistId) {
        await api(`/wishlists/${wishlistId}`, { method: 'PATCH', body: JSON.stringify(payload) }, token);
        push('Wishlist updated');
      } else {
        const created = await api<{ id: string }>(`/wishlists`, { method: 'POST', body: JSON.stringify(payload) }, token);
        push('Wishlist created');
        router.push(`/dashboard/wishlists/${created.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!wishlistId) return;
    const form = new FormData(e.currentTarget);
    try {
      await api(`/wishlists/${wishlistId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          target_price: Number(form.get('target_price')),
          currency: form.get('currency'),
          product_url: form.get('product_url') || null,
          image_url: form.get('image_url') || null,
          description: form.get('description') || null
        })
      }, token);
      push('Item added');
      const updated = await api<WishlistDetail>(`/wishlists/${wishlistId}`, {}, token);
      setWishlist(updated);
      (e.target as HTMLFormElement).reset();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <div className="card p-8">Loading wishlist…</div>;

  return (
    <div className="space-y-5">
      <form onSubmit={saveWishlist} className="card grid gap-3 p-6 md:grid-cols-2">
        <input className="input" name="title" defaultValue={wishlist?.title} placeholder="Wishlist title" required />
        <input className="input" name="event_type" defaultValue={wishlist?.event_type ?? ''} placeholder="Event type" />
        <textarea className="input md:col-span-2" name="description" defaultValue={wishlist?.description ?? ''} placeholder="Description" />
        <input className="input" type="date" name="event_date" defaultValue={wishlist?.event_date ?? ''} />
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save wishlist'}</button>
      </form>

      {error && <div className="card border-rose-200 p-4 text-sm text-rose-600">{error}</div>}

      {wishlistId && (
        <>
          <form onSubmit={addItem} className="card grid gap-3 p-6 md:grid-cols-2">
            <h2 className="md:col-span-2 text-lg font-semibold">Add item</h2>
            <input className="input" name="title" placeholder="Item title" required />
            <input className="input" type="number" min={1} step="0.01" name="target_price" placeholder="Target amount" required />
            <input className="input" name="currency" defaultValue="USD" maxLength={3} required />
            <input className="input" name="product_url" placeholder="Product URL" />
            <input className="input md:col-span-2" name="image_url" placeholder="Image URL" />
            <textarea className="input md:col-span-2" name="description" placeholder="Description" />
            <button className="btn-primary md:col-span-2">Add item</button>
          </form>

          <section className="grid gap-4 md:grid-cols-2">
            {wishlist?.items.filter((item) => !item.is_deleted).map((item) => (
              <article key={item.id} className="card p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <StatusBadge item={item} />
                </div>
                <ProgressBar collected={item.amount_collected} target={item.target_price} />
                <p className="mt-3 text-sm text-slate-600">{currency(item.amount_collected, item.currency)} of {currency(item.target_price, item.currency)}</p>
                <p className="mt-1 text-xs text-slate-500">Owner view remains anonymous by design.</p>
              </article>
            ))}
          </section>

          {wishlist && wishlist.items.filter((item) => !item.is_deleted).length === 0 && (
            <div className="card p-8 text-center text-sm text-slate-600">No items yet. Add your first gift idea to get started.</div>
          )}
        </>
      )}
    </div>
  );
}
