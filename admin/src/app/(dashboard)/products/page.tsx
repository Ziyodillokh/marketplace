'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
                className="bg-white rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors overflow-hidden flex"
              >
                <div className="relative h-24 w-24 bg-gray-100 shrink-0">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-gray-300 text-xs">No img</div>
                  )}
                </div>
                <div className="p-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {p.isActive ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">Off</Badge>}
                    {p.isFeatured && <Badge tone="amber">★</Badge>}
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{p.titleUz}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{p.categoryTitle}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-sm font-bold text-[var(--color-primary)]">{formatMoney(p.basePrice)}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">qoldiq: {p.totalStock}</span>
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
