'use client';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function QtyControl({
  value,
  onChange,
  min = 1,
  max,
  disabled,
  size = 'md',
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const w = size === 'sm' ? 'w-8' : 'w-10';
  return (
    <div className={cn('inline-flex items-center bg-gray-100 rounded-full', size === 'sm' ? 'gap-1' : 'gap-2')}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className={cn('grid place-items-center rounded-full bg-white border border-[var(--color-border)] disabled:opacity-40', h, w)}
        aria-label="Decrement"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[28px] text-center font-semibold text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        disabled={disabled || (max !== undefined && value >= max)}
        className={cn('grid place-items-center rounded-full bg-white border border-[var(--color-border)] disabled:opacity-40', h, w)}
        aria-label="Increment"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
