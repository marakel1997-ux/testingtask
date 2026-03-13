import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">The page you requested does not exist or is no longer available.</p>
        <Link href="/" className="btn-primary mt-6">Go home</Link>
      </div>
    </main>
  );
}
