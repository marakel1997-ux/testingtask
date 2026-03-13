import { AppShell } from '@/components/AppShell';
import { WishlistEditor } from '@/components/WishlistEditor';

export default function NewWishlistPage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-3xl font-semibold">Create wishlist</h1>
      <WishlistEditor />
    </AppShell>
  );
}
