import { AppShell } from '@/components/AppShell';
import { WishlistEditor } from '@/components/WishlistEditor';

export default function EditWishlistPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <h1 className="mb-4 text-3xl font-semibold">Edit wishlist</h1>
      <WishlistEditor wishlistId={params.id} />
    </AppShell>
  );
}
