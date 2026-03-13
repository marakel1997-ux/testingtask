import Link from 'next/link';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-lg font-semibold text-brand-900">GiftCircle</Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
          <Link href="/login" className="btn-secondary">Login</Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
