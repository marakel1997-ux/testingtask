'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);

    try {
      const data = await api<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
      });
      auth.set(data.access_token);
      push('Logged in successfully.');
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md card p-6">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to manage your wishlists.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input required name="email" type="email" placeholder="Email" className="input" />
          <input required name="password" type="password" placeholder="Password" className="input" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="mt-4 text-sm">No account yet? <Link href="/register" className="text-brand-600">Create one</Link></p>
      </div>
    </AppShell>
  );
}
