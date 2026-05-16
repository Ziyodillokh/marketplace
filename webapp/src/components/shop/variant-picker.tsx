'use client';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import type { ProductVariant } from '@/lib/api/types';

interface Props {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function VariantPicker({ variants, selectedId, onSelect }: Props) {
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const colors = useMemo(() => unique(variants.map((v) => v.color).filter((x): x is string => !!x)), [variants]);
  const sizes = useMemo(() => unique(variants.map((v) => v.size).filter((x): x is string => !!x)), [variants]);

  const current = variants.find((v) => v.id === selectedId);

  function findIdByPair(color: string | null, size: string | null): string | null {
    const v = variants.find(
      (x) => (color === null || x.color === color) && (size === null || x.size === size),
    );
    return v ? v.id : null;
  }

  return (
    <div className="space-y-4">
      {colors.length > 0 && (
        <div>
          <p className="text-sm text-[var(--color-text-muted)] mb-2">{tr(messages, 'product.color')}</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
              const active = current?.color === c;
              const tryId = findIdByPair(c, current?.size ?? null) ?? findIdByPair(c, null);
              return (
                <button
                  key={c}
                  onClick={() => tryId && onSelect(tryId)}
                  className={cn(
                    'h-10 px-4 rounded-full border text-sm font-medium',
                    active
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white border-[var(--color-border)]',
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {sizes.length > 0 && (
        <div>
          <p className="text-sm text-[var(--color-text-muted)] mb-2">{tr(messages, 'product.size')}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const active = current?.size === s;
              const tryId = findIdByPair(current?.color ?? null, s) ?? findIdByPair(null, s);
              const disabled = !tryId;
              return (
                <button
                  key={s}
                  onClick={() => tryId && onSelect(tryId)}
                  disabled={disabled}
                  className={cn(
                    'h-10 min-w-12 px-3 rounded-full border text-sm font-medium',
                    active
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white border-[var(--color-border)]',
                    disabled && 'opacity-40',
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
