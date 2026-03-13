'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { useToast } from '@/components/Toast';

export default function RegisterPage() {
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
      const data = await api<{ access_token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          display_name: form.get('display_name')
        })
      });
      auth.set(data.access_token);
      push('Account created. Welcome!');
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
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Start managing wishlists in minutes.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input name="display_name" placeholder="Display name" className="input" />
          <input required name="email" type="email" placeholder="Email" className="input" />
          <input required minLength={8} name="password" type="password" placeholder="Password" className="input" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
        <p className="mt-4 text-sm">Already registered? <Link href="/login" className="text-brand-600">Sign in</Link></p>
      </div>
    </AppShell>
  );
}
