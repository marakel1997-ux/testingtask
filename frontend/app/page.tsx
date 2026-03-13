import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

export default function LandingPage() {
  return (
    <AppShell>
      <section className="grid gap-6 rounded-3xl bg-gradient-to-br from-brand-900 to-brand-500 p-8 text-white md:grid-cols-2 md:p-12">
        <div>
          <p className="mb-2 text-sm uppercase tracking-wider text-white/70">GiftCircle</p>
          <h1 className="mb-4 text-4xl font-bold leading-tight">Organize wishlists your circle can reserve and fund in realtime.</h1>
          <p className="text-white/85">Create polished public wishlists in minutes. No signup needed for visitors to reserve or contribute.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/register" className="btn rounded-xl bg-white px-5 py-3 font-semibold text-brand-900 hover:bg-slate-100">Get started</Link>
            <Link href="/login" className="btn rounded-xl border border-white/30 px-5 py-3 text-white hover:bg-white/10">Sign in</Link>
          </div>
        </div>
        <div className="card p-6 text-slate-900">
          <h2 className="mb-3 text-lg font-semibold">Why teams love it</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>• Anonymous reservations and partial funding support</li>
            <li>• Beautiful progress bars and clear availability badges</li>
            <li>• Owner dashboard with clean cards and mobile-ready layouts</li>
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
