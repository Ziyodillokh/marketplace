'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Search, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { apiListAdminProducts } from '@/lib/endpoints';
import type { AdminProductListItem } from '@/lib/types';

export interface RelatedProductMini {
  id: string;
  titleUz: string;
  titleRu?: string;
  basePrice: number;
  imageUrl: string | null;
}

/**
 * Post-purchase tavsiyalar uchun mahsulot tanlovchi.
 * - Qidiruv orqali mahsulot topib, "Qo'shish" tugmasi bilan ro'yxatga qo'shadi.
 * - Joylashish tartibini drag-handle ko'rsatib turibmiz (hozircha re-order yo'q — kerak bo'lsa keyin).
 */
export function RelatedProductsPicker({
  excludeProductId,
  value,
  onChange,
}: {
  excludeProductId?: string;
  value: RelatedProductMini[];
  onChange: (next: RelatedProductMini[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', 'related-search', debounced],
    queryFn: () => apiListAdminProducts({ q: debounced || undefined, limit: 15, status: 'active' }),
    enabled: open,
  });

  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value]);

  const results = (data?.items ?? []).filter(
    (p) => p.id !== excludeProductId && !selectedIds.has(p.id),
  );

  function add(p: AdminProductListItem) {
    onChange([
      ...value,
      {
        id: p.id,
        titleUz: p.titleUz,
        titleRu: p.titleRu,
        basePrice: p.basePrice,
        imageUrl: p.imageUrl,
      },
    ]);
  }

  function remove(id: string) {
    onChange(value.filter((p) => p.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    const idx = value.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const next = [...value];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {/* Tanlangan ro'yxat */}
      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-[var(--color-border)]"
            >
              <span className="text-xs text-[var(--color-text-muted)] w-5 text-center">{i + 1}</span>
              <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                {p.imageUrl && (
                  <Image src={p.imageUrl} alt={p.titleUz} fill className="object-cover" sizes="40px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.titleUz}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {Math.round(p.basePrice).toLocaleString('ru-RU').replace(/,/g, ' ')} so&apos;m
                </p>
              </div>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(p.id, -1)}
                  disabled={i === 0}
                  className="text-[var(--color-text-muted)] disabled:opacity-30 leading-none p-0.5"
                  aria-label="Tepaga"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(p.id, 1)}
                  disabled={i === value.length - 1}
                  className="text-[var(--color-text-muted)] disabled:opacity-30 leading-none p-0.5"
                  aria-label="Pastga"
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="h-8 w-8 grid place-items-center text-[var(--color-danger)] hover:bg-rose-50 rounded-lg"
                aria-label="O'chirish"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)] italic">
          Hech qaysi mahsulot tanlanmagan. Foydalanuvchi bu mahsulotni sotib olganda,
          biriktirilgan tavsiyalar bot orqali yuboriladi.
        </p>
      )}

      {/* Qidiruv */}
      <div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Tavsiya etish uchun mahsulot qidirish..."
            className="pl-9"
          />
        </div>

        {open && (
          <div className="mt-2 border border-[var(--color-border)] rounded-xl max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">Yuklanmoqda...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
                {debounced ? 'Topilmadi' : 'Boshlash uchun nom kiriting'}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {results.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                      {p.imageUrl && (
                        <Image src={p.imageUrl} alt={p.titleUz} fill className="object-cover" sizes="40px" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.titleUz}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {p.categoryTitle} • {Math.round(p.basePrice).toLocaleString('ru-RU').replace(/,/g, ' ')} so&apos;m
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => add(p)}
                      className="h-8 px-2 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Qo&apos;shish
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
