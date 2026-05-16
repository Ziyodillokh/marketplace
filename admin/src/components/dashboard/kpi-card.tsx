import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function KpiCard({
  title,
  value,
  icon,
  delta,
  hint,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  delta?: number;
  hint?: string;
}) {
  const isUp = (delta ?? 0) > 0;
  const isDown = (delta ?? 0) < 0;
  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--color-text-muted)]">{title}</span>
        <div className="h-8 w-8 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center text-xs font-medium',
              isUp && 'text-[var(--color-success)]',
              isDown && 'text-[var(--color-danger)]',
              !isUp && !isDown && 'text-[var(--color-text-muted)]',
            )}
          >
            {isUp && <TrendingUp size={12} className="mr-0.5" />}
            {isDown && <TrendingDown size={12} className="mr-0.5" />}
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>}
      </div>
    </div>
  );
}
