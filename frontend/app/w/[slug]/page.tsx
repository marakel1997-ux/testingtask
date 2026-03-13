'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PublicReserveResponse, PublicWishlist, WishlistItem } from '@/lib/types';
import { currency } from '@/lib/utils';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';

const CONNECTION_WARNING = 'Live updates disconnected. You can still refresh to see the latest status.';

const reservationKey = (slug: string, itemId: string) => `gc-reservation:${slug}:${itemId}`;

function normalizeError(message: string) {
  if (message.includes('already reserved')) return 'Someone else reserved this item moments ago. Pick another item or contribute instead.';
  if (message.includes('already fully funded') || message.includes('already fully')) return 'This item is already fully funded. Thanks for helping!';
  if (message.includes('exceeds remaining amount')) return `${message}. Please enter a smaller amount.`;
  if (message.includes('Item not found')) return 'This item is no longer available. The owner may have removed it.';
  if (message.includes('Wishlist not found')) return 'This public link is invalid or has expired.';
  if (message.includes('Wishlist is archived')) return 'This wishlist has been archived. New reservations and contributions are disabled.';
  if (message.includes('Invalid release token')) return 'Only the person who reserved this item can release it from this browser.';
  return message;
}

export default function PublicWishlistPage({ params }: { params: { slug: string } }) {
  const [wishlist, setWishlist] = useState<PublicWishlist | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reserveLoadingId, setReserveLoadingId] = useState<string | null>(null);
  const [contributeLoadingId, setContributeLoadingId] = useState<string | null>(null);
  const [releaseLoadingId, setReleaseLoadingId] = useState<string | null>(null);
  const [connectionWarning, setConnectionWarning] = useState('');
  const router = useRouter();
  const { push } = useToast();

  useEffect(() => {
    setLoading(true);
    setError('');
    api<PublicWishlist>(`/public/w/${params.slug}`)
      .then(setWishlist)
      .catch(() => router.push('/w/not-found'))
      .finally(() => setLoading(false));
  }, [params.slug, router]);

  useEffect(() => {
    if (!wishlist) return;
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/^http/, 'ws');
    const socket = new WebSocket(`${base}/public/w/${params.slug}/events`);

    socket.onopen = () => setConnectionWarning('');
    socket.onclose = () => setConnectionWarning(CONNECTION_WARNING);
    socket.onerror = () => setConnectionWarning(CONNECTION_WARNING);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.event === 'snapshot' && Array.isArray(payload.items)) {
        setWishlist((current) => (current ? { ...current, items: payload.items.filter((item: WishlistItem) => !item.is_deleted) } : current));
        return;
      }
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
  }, [params.slug, wishlist?.public_id]);

  const archived = wishlist?.is_archived;

  const hasReleaseToken = (itemId: string) => typeof window !== 'undefined' && Boolean(localStorage.getItem(reservationKey(params.slug, itemId)));
  const items = useMemo(() => wishlist?.items ?? [], [wishlist]);

  async function reserve(itemId: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError('');
    setReserveLoadingId(itemId);
    try {
      const reserved = await api<PublicReserveResponse>(`/public/w/${params.slug}/items/${itemId}/reserve`, {
        method: 'POST',
        body: JSON.stringify({ anonymous_note: form.get('anonymous_note') || null })
      });
      localStorage.setItem(reservationKey(params.slug, itemId), reserved.release_token);
      push('Reserved. You can release this later from this browser.');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(normalizeError((err as Error).message));
    } finally {
      setReserveLoadingId(null);
    }
  }


  async function release(itemId: string) {
    const releaseToken = localStorage.getItem(reservationKey(params.slug, itemId));
    if (!releaseToken) {
      setError('We could not find your reservation token in this browser.');
      return;
    }

    setError('');
    setReleaseLoadingId(itemId);
    try {
      await api(`/public/w/${params.slug}/items/${itemId}/release`, {
        method: 'POST',
        body: JSON.stringify({ release_token: releaseToken })
      });
      localStorage.removeItem(reservationKey(params.slug, itemId));
      push('Reservation released.');
    } catch (err) {
      setError(normalizeError((err as Error).message));
    } finally {
      setReleaseLoadingId(null);
    }
  }

  async function contribute(item: WishlistItem, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const amount = Number(form.get('amount'));

    if (Number.isNaN(amount) || amount <= 0) {
      setError('Please enter a valid contribution amount greater than 0.');
      return;
    }

    const remaining = Number(item.target_price) - Number(item.amount_collected);
    if (amount > remaining) {
      setError(`Please contribute ${currency(remaining.toFixed(2), item.currency)} or less for this item.`);
      return;
    }

    setError('');
    setContributeLoadingId(item.id);
    try {
      await api(`/public/w/${params.slug}/items/${item.id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount, currency: form.get('currency') || 'USD', message: form.get('message') || null })
      });
      push('Contribution received 🎉');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(normalizeError((err as Error).message));
    } finally {
      setContributeLoadingId(null);
    }
  }

  if (loading) return <main className="p-6 text-sm">Loading wishlist…</main>;
  if (!wishlist) return null;

  return (
    <main className="mx-auto max-w-5xl p-3 sm:p-6">
      <header className="card mb-4 p-4 sm:mb-6 sm:p-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">{wishlist.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{wishlist.description || 'A shared wishlist for friends and family.'}</p>
        <p className="mt-2 text-xs text-slate-500">Privacy promise: the owner can see reservation/funding progress, but never who you are.</p>
        {archived && <p className="mt-3 rounded-xl bg-slate-100 p-2 text-sm">This wishlist is archived. Public actions are unavailable.</p>}
      </header>

      {connectionWarning && <div className="card mb-4 border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{connectionWarning}</div>}
      {error && <div className="card mb-4 border-rose-200 p-3 text-sm text-rose-600 sm:mb-6 sm:p-4">{error}</div>}

      {items.length === 0 && <div className="card p-8 text-center text-sm text-slate-600 sm:p-10">No items have been added yet. Check back soon.</div>}

      <section className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const remaining = Number(item.target_price) - Number(item.amount_collected);
          return (
            <article key={item.id} className="card p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-semibold">{item.title}</h2>
                <StatusBadge item={item} />
              </div>
              <p className="mb-3 text-sm text-slate-600">{item.description || 'No details provided.'}</p>
              <ProgressBar collected={item.amount_collected} target={item.target_price} />
              <p className="mt-2 text-sm">{currency(item.amount_collected, item.currency)} of {currency(item.target_price, item.currency)}</p>
              {item.product_url && (
                <Link className="mt-2 inline-flex text-sm text-brand-600 underline" href={item.product_url} target="_blank" rel="noopener noreferrer">
                  View product
                </Link>
              )}
              {!item.product_url && <p className="mt-2 text-xs text-slate-500">No product link provided by the owner.</p>}

              {!archived && (
                <div className="mt-4 grid gap-3">
                  {!item.is_reserved && !item.is_fully_funded && (
                    <form className="space-y-2" onSubmit={(e) => reserve(item.id, e)}>
                      <input className="input" name="anonymous_note" placeholder="Optional anonymous note" />
                      <button className="btn-secondary w-full" disabled={reserveLoadingId === item.id}>
                        {reserveLoadingId === item.id ? 'Reserving…' : 'Reserve anonymously'}
                      </button>
                    </form>
                  )}
                  {item.is_reserved && !item.is_fully_funded && hasReleaseToken(item.id) && (
                    <button type="button" className="btn-secondary" onClick={() => release(item.id)} disabled={releaseLoadingId === item.id}>
                      {releaseLoadingId === item.id ? 'Releasing…' : 'Release my reservation'}
                    </button>
                  )}
                  {!item.is_fully_funded && (
                    <form className="grid gap-2" onSubmit={(e) => contribute(item, e)}>
                      <p className="text-xs text-slate-500">Remaining: {currency(remaining.toFixed(2), item.currency)}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <input className="input col-span-2" type="number" min={0.01} max={Math.max(remaining, 0.01)} step="0.01" name="amount" placeholder="Amount" required />
                        <input className="input" defaultValue={item.currency} name="currency" maxLength={3} />
                      </div>
                      <input className="input" name="message" placeholder="Optional message" />
                      <button className="btn-primary" disabled={contributeLoadingId === item.id}>
                        {contributeLoadingId === item.id ? 'Sending…' : 'Contribute anonymously'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
