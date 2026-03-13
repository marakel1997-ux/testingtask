import { progressPercent } from '@/lib/utils';

export function ProgressBar({ collected, target }: { collected: string; target: string }) {
  const percent = progressPercent(collected, target);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>Funding progress</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
