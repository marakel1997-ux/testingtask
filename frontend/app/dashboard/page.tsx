'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Wishlist } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Wishlist[]>('/wishlists', {}, auth.get())
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Your wishlists</h1>
          <p className="text-sm text-slate-600">Manage items, track anonymous reservation status, and share public links.</p>
        </div>
        <Link href="/dashboard/wishlists/new" className="btn-primary">New wishlist</Link>
      </div>

      {loading && <div className="card p-8 text-sm text-slate-600">Loading wishlists...</div>}
      {error && <div className="card border-rose-200 p-8 text-sm text-rose-600">{error}</div>}

      {!loading && !error && data.length === 0 && (
        <div className="card p-10 text-center">
          <h2 className="text-xl font-semibold">No wishlists yet</h2>
          <p className="mt-2 text-sm text-slate-600">Create your first wishlist and start collecting anonymous contributions.</p>
          <Link className="btn-primary mt-6" href="/dashboard/wishlists/new">Create wishlist</Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.map((wishlist) => (
          <article key={wishlist.id} className="card p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{wishlist.title}</h3>
              {wishlist.is_archived && <span className="rounded-full bg-slate-200 px-2 py-1 text-xs">Archived</span>}
            </div>
            <p className="line-clamp-2 text-sm text-slate-600">{wishlist.description || 'No description added yet.'}</p>
            <div className="mt-4 flex gap-2">
              <Link className="btn-secondary" href={`/dashboard/wishlists/${wishlist.id}`}>Edit</Link>
              <Link className="btn-secondary" href={`/w/${wishlist.public_id}`}>View public</Link>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
