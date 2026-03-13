import Link from 'next/link';

export default function InvalidWishlistPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="card max-w-lg p-8 text-center">
        <h1 className="text-2xl font-semibold">Wishlist unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">This wishlist link is invalid, archived, or has been removed.</p>
        <Link href="/" className="btn-primary mt-6">Return to home</Link>
      </section>
    </main>
  );
}
