'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PublicWishlist, WishlistItem } from '@/lib/types';
import { currency } from '@/lib/utils';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';

export default function PublicWishlistPage({ params }: { params: { slug: string } }) {
  const [wishlist, setWishlist] = useState<PublicWishlist | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    api<PublicWishlist>(`/public/w/${params.slug}`)
      .then(setWishlist)
      .catch(() => router.push('/w/not-found'))
      .finally(() => setLoading(false));
  }, [params.slug, router]);

  useEffect(() => {
    if (!wishlist) return;
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/^http/, 'ws');
    const socket = new WebSocket(`${base}/public/w/${params.slug}/events`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      const incoming: WishlistItem | undefined = payload.item;
      if (!incoming) return;
      setWishlist((current) => {
        if (!current) return current;
        const map = new Map(current.items.map((item) => [item.id, item]));
        map.set(incoming.id, incoming);
        return { ...current, items: [...map.values()].filter((item) => !item.is_deleted) };
      });
    };
    return () => socket.close();
  }, [wishlist, params.slug]);

  const archived = wishlist?.is_archived;
  const items = useMemo(() => wishlist?.items ?? [], [wishlist]);

  async function reserve(itemId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api(`/public/w/${params.slug}/items/${itemId}/reserve`, {
        method: 'POST',
        body: JSON.stringify({ anonymous_note: form.get('anonymous_note') || null })
      });
      push('Reservation saved');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function contribute(itemId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api(`/public/w/${params.slug}/items/${itemId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(form.get('amount')), currency: form.get('currency') || 'USD', message: form.get('message') || null })
      });
      push('Contribution sent 🎉');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <main className="p-6 text-sm">Loading wishlist…</main>;
  if (!wishlist) return null;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="card mb-6 p-6">
        <h1 className="text-3xl font-semibold">{wishlist.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{wishlist.description || 'A shared wishlist for friends and family.'}</p>
        {archived && <p className="mt-3 rounded-xl bg-slate-100 p-2 text-sm">This wishlist is archived. Public actions are unavailable.</p>}
      </header>

      {error && <div className="card mb-6 border-rose-200 p-4 text-sm text-rose-600">{error}</div>}

      {items.length === 0 && <div className="card p-10 text-center text-sm text-slate-600">No items have been added yet. Check back soon.</div>}

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">{item.title}</h2>
              <StatusBadge item={item} />
            </div>
            <p className="mb-3 text-sm text-slate-600">{item.description || 'No details provided.'}</p>
            <ProgressBar collected={item.amount_collected} target={item.target_price} />
            <p className="mt-2 text-sm">{currency(item.amount_collected, item.currency)} of {currency(item.target_price, item.currency)}</p>

            {!archived && (
              <div className="mt-4 grid gap-3">
                {!item.is_reserved && !item.is_fully_funded && (
                  <form className="space-y-2" onSubmit={(e) => reserve(item.id, e)}>
                    <input className="input" name="anonymous_note" placeholder="Anonymous note (optional)" />
                    <button className="btn-secondary w-full">Reserve this item</button>
                  </form>
                )}
                {!item.is_fully_funded && (
                  <form className="grid gap-2" onSubmit={(e) => contribute(item.id, e)}>
                    <div className="grid grid-cols-3 gap-2">
                      <input className="input col-span-2" type="number" min={1} step="0.01" name="amount" placeholder="Amount" required />
                      <input className="input" defaultValue={item.currency} name="currency" maxLength={3} />
                    </div>
                    <input className="input" name="message" placeholder="Message (optional)" />
                    <button className="btn-primary">Contribute</button>
                  </form>
                )}
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
