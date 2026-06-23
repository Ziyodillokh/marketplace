'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Plus, Search, ImageOff } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiAdminCategoriesTree, apiListAdminProducts } from '@/lib/endpoints';
import { formatMoney } from '@/lib/format';
import type { AdminCategoryNode } from '@/lib/types';

function flatten(nodes: AdminCategoryNode[], depth = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: '— '.repeat(depth) + n.titleUz });
    out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const { data: categories } = useQuery({ queryKey: ['categories', 'tree'], queryFn: apiAdminCategoriesTree });
  const flatCategories = categories ? flatten(categories) : [];

  const query = useInfiniteQuery({
    queryKey: ['admin-products', { q: debounced, categoryId, status }],
    queryFn: ({ pageParam }) =>
      apiListAdminProducts({
        q: debounced || undefined,
        categoryId: categoryId || undefined,
        status: status === 'all' ? undefined : status,
        cursor: pageParam,
        limit: 24,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [query]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <PageHeader
        title="Mahsulotlar"
        rightSlot={
          <Link href="/products/new">
            <Button size="sm">
              <Plus size={16} /> Yangi
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9" />
        </div>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Barcha kategoriyalar</option>
          {flatCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'active' | 'inactive')}>
          <option value="all">Hammasi</option>
          <option value="active">Faol</option>
          <option value="inactive">Faol emas</option>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">Mahsulot topilmadi</div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.id}`}
                className="group bg-white rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-md transition-all duration-200 overflow-hidden flex"
              >
                {/* Rasm + overlay belgilar */}
                <div className="relative h-28 w-28 bg-[var(--color-bg)] shrink-0 overflow-hidden">
                  <div className="h-full w-full transition-transform duration-300 group-hover:scale-105">
                    <Thumb url={p.imageUrl} />
                  </div>
                  {p.discountPct ? (
                    <span className="absolute top-1.5 left-1.5 rounded-md bg-[var(--color-danger)] text-white text-[10px] font-bold px-1.5 py-0.5 shadow-sm">
                      −{p.discountPct}%
                    </span>
                  ) : null}
                  {p.isFeatured && (
                    <span className="absolute top-1.5 right-1.5 h-5 w-5 grid place-items-center rounded-full bg-amber-400 text-white text-[11px] shadow-sm">
                      ★
                    </span>
                  )}
                  {!p.isActive && (
                    <span className="absolute inset-0 bg-white/55 grid place-items-center">
                      <span className="text-[10px] font-semibold text-[var(--color-text-muted)] bg-white/90 rounded-md px-1.5 py-0.5">
                        Faol emas
                      </span>
                    </span>
                  )}
                </div>

                {/* Ma'lumot */}
                <div className="p-3 flex-1 min-w-0 flex flex-col">
                  <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                    {p.titleUz}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                    {p.brand ? `${p.brand} · ` : ''}{p.categoryTitle}
                  </p>

                  <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--color-text)] truncate">
                        {formatMoney(p.basePrice)}
                      </div>
                      {p.oldPrice ? (
                        <div className="text-[11px] text-[var(--color-text-muted)] line-through truncate">
                          {formatMoney(p.oldPrice)}
                        </div>
                      ) : null}
                    </div>
                    <StockPill stock={p.totalStock} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}

/** Qoldiq holati — 0 bo'lsa qizil "Tugagan", oz bo'lsa sariq, yetarli bo'lsa yashil. */
function StockPill({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="shrink-0 rounded-full bg-red-50 text-[var(--color-danger)] text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap">
        Tugagan
      </span>
    );
  }
  const tone = stock <= 5 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
  return (
    <span className={`shrink-0 rounded-full text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap ${tone}`}>
      {stock} dona
    </span>
  );
}

/** Mahsulot rasmi — yo'q yoki yuklanmasa (404) toza placeholder ko'rsatadi. */
function Thumb({ url }: { url: string | null }) {
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div className="h-full w-full grid place-items-center text-gray-300">
        <ImageOff size={22} />
      </div>
    );
  }
  return (
    <Image src={url} alt="" fill className="object-cover" sizes="96px" onError={() => setError(true)} />
  );
}
