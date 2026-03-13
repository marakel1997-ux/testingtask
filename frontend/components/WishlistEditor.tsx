'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { WishlistDetail } from '@/lib/types';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';
import { currency } from '@/lib/utils';
import { useToast } from './Toast';

function ownerError(message: string) {
  if (message.includes('Wishlist not found')) return 'We could not find this wishlist. It may have been deleted.';
  if (message.includes('Item not found')) return 'This item no longer exists.';
  return message;
}

export function WishlistEditor({ wishlistId }: { wishlistId?: string }) {
  const [wishlist, setWishlist] = useState<WishlistDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(wishlistId));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [itemSaving, setItemSaving] = useState(false);
  const router = useRouter();
  const { push } = useToast();

  const token = auth.get();

  useEffect(() => {
    if (!wishlistId) return;
    api<WishlistDetail>(`/wishlists/${wishlistId}`, {}, token)
      .then(setWishlist)
      .catch((e) => setError(ownerError(e.message)))
      .finally(() => setLoading(false));
  }, [wishlistId, token]);

  const visibleItems = useMemo(() => wishlist?.items.filter((item) => !item.is_deleted) ?? [], [wishlist]);
  const softDeletedItems = useMemo(() => wishlist?.items.filter((item) => item.is_deleted) ?? [], [wishlist]);

  async function refreshWishlist() {
    if (!wishlistId) return;
    const updated = await api<WishlistDetail>(`/wishlists/${wishlistId}`, {}, token);
    setWishlist(updated);
  }

  async function saveWishlist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
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
        push('Wishlist details saved');
      } else {
        const created = await api<{ id: string }>(`/wishlists`, { method: 'POST', body: JSON.stringify(payload) }, token);
        push('Wishlist created');
        router.push(`/dashboard/wishlists/${created.id}`);
      }
    } catch (e) {
      setError(ownerError((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  async function addItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!wishlistId) return;
    const form = new FormData(e.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const targetPrice = Number(form.get('target_price'));
    const productUrl = String(form.get('product_url') ?? '').trim();

    if (!title) {
      setError('Please add an item title.');
      return;
    }
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      setError('Target amount must be greater than 0.');
      return;
    }
    if (productUrl && !/^https?:\/\//i.test(productUrl)) {
      setError('Product URL must start with http:// or https://.');
      return;
    }

    setError('');
    setItemSaving(true);
    try {
      await api(`/wishlists/${wishlistId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          target_price: targetPrice,
          currency: form.get('currency'),
          product_url: productUrl || null,
          image_url: String(form.get('image_url') ?? '').trim() || null,
          description: String(form.get('description') ?? '').trim() || null
        })
      }, token);
      push('Item added');
      await refreshWishlist();
      (e.target as HTMLFormElement).reset();
    } catch (e) {
      setError(ownerError((e as Error).message));
    } finally {
      setItemSaving(false);
    }
  }

  if (loading) return <div className="card p-8 text-sm text-slate-600">Loading wishlist…</div>;

  return (
    <div className="space-y-5">
      <form onSubmit={saveWishlist} className="card grid gap-3 p-5 md:grid-cols-2 md:p-6">
        <input className="input" name="title" defaultValue={wishlist?.title} placeholder="Wishlist title" required />
        <input className="input" name="event_type" defaultValue={wishlist?.event_type ?? ''} placeholder="Event type" />
        <textarea className="input md:col-span-2" name="description" defaultValue={wishlist?.description ?? ''} placeholder="Description" />
        <input className="input" type="date" name="event_date" defaultValue={wishlist?.event_date ?? ''} />
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save wishlist details'}</button>
      </form>

      {wishlist && (
        <div className="card p-4 text-sm text-slate-700">
          <p className="font-medium">Share link</p>
          <Link href={`/w/${wishlist.public_id}`} className="text-brand-600 underline">/w/{wishlist.public_id}</Link>
          <p className="mt-2 text-xs text-slate-500">Contributors stay anonymous to the owner, including names and contact details.</p>
        </div>
      )}

      {error && <div className="card border-rose-200 p-4 text-sm text-rose-600">{error}</div>}

      {wishlistId && (
        <>
          <form onSubmit={addItem} className="card grid gap-3 p-5 md:grid-cols-2 md:p-6">
            <h2 className="text-lg font-semibold md:col-span-2">Add item</h2>
            <input className="input" name="title" placeholder="Item title" required />
            <input className="input" type="number" min={0.01} step="0.01" name="target_price" placeholder="Target amount" required />
            <input className="input" name="currency" defaultValue="USD" maxLength={3} required />
            <input className="input" name="product_url" placeholder="Product URL (optional)" />
            <input className="input md:col-span-2" name="image_url" placeholder="Image URL (optional)" />
            <textarea className="input md:col-span-2" name="description" placeholder="Description" />
            <p className="text-xs text-slate-500 md:col-span-2">Autofill is optional in this MVP. If product metadata fails, enter details manually and continue.</p>
            <button className="btn-primary md:col-span-2" disabled={itemSaving}>{itemSaving ? 'Adding item…' : 'Add item to wishlist'}</button>
          </form>

          <section className="grid gap-4 md:grid-cols-2">
            {visibleItems.map((item) => (
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

          {softDeletedItems.length > 0 && (
            <section className="card p-5 text-sm">
              <h3 className="font-semibold">Removed items with preserved contributions</h3>
              <p className="mt-1 text-slate-600">These items were removed after receiving contributions, so funding totals are still retained for consistency.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
                {softDeletedItems.map((item) => (
                  <li key={item.id}>{item.title} — {currency(item.amount_collected, item.currency)} collected</li>
                ))}
              </ul>
            </section>
          )}

          {wishlist && visibleItems.length === 0 && (
            <div className="card p-8 text-center text-sm text-slate-600">No active items yet. Add your first gift idea to get started.</div>
          )}
        </>
      )}
    </div>
  );
}
