import { WishlistItem } from '@/lib/types';

export function itemStatus(item: WishlistItem) {
  if (item.is_fully_funded) return { label: 'Fully funded', classes: 'bg-emerald-100 text-emerald-700' };
  if (Number(item.amount_collected) > 0) return { label: 'Funding in progress', classes: 'bg-amber-100 text-amber-700' };
  if (item.is_reserved) return { label: 'Reserved', classes: 'bg-violet-100 text-violet-700' };
  return { label: 'Available', classes: 'bg-sky-100 text-sky-700' };
}

export function StatusBadge({ item }: { item: WishlistItem }) {
  const status = itemStatus(item);
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.classes}`}>{status.label}</span>;
}
