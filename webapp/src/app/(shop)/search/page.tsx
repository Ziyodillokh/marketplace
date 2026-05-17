'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductGrid } from '@/components/shop/product-grid';
import { apiListProducts, type ListProductsQuery } from '@/lib/api/endpoints';
import { useTrackOnMount, track } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';

function SearchInner() {
  useTrackOnMount({ type: 'VIEW_CATALOG' });
  useTelegramBackButton();
  const sp = useSearchParams();
  const initialQ = sp.get('q') ?? '';
  const categoryId = sp.get('categoryId') ?? undefined;
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [sort, setSort] = useState<NonNullable<ListProductsQuery['sort']>>('newest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (debouncedQ.length >= 2) track({ type: 'SEARCH_QUERY', payload: { q: debouncedQ } });
  }, [debouncedQ]);

  const params: ListProductsQuery = {
    q: debouncedQ || undefined,
    categoryId,
    sort,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    limit: 16,
  };

  const query = useInfiniteQuery({
    queryKey: ['catalog-search', params],
    queryFn: ({ pageParam }) => apiListProducts({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [query]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <PageHeader title={tr(messages, 'common.search')} />
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr(messages, 'common.search')}
            className="pl-10"
            autoFocus
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="h-12 w-12 rounded-2xl bg-white border border-[var(--color-border)] grid place-items-center"
          aria-label="Filter"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      <div className="px-4">
        {!query.isLoading && items.length === 0 ? (
          <EmptyState
            title={tr(messages, 'catalog.empty')}
            action={
              <Button
                onClick={() => {
                  setQ('');
                  setMinPrice('');
                  setMaxPrice('');
                  setSort('newest');
                }}
              >
                {tr(messages, 'catalog.clearFilters')}
              </Button>
            }
          />
        ) : (
          <>
            <ProductGrid items={items} loading={query.isFetchingNextPage || query.isLoading} />
            <div ref={sentinelRef} className="h-10" />
          </>
        )}
      </div>

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title={tr(messages, 'common.filter')}>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-semibold mb-2">{tr(messages, 'common.sort')}</p>
            <div className="grid grid-cols-2 gap-2">
              {(['newest', 'price_asc', 'price_desc', 'bestsellers', 'discount'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`h-10 px-3 rounded-xl border text-sm ${
                    sort === s ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white border-[var(--color-border)]'
                  }`}
                >
                  {tr(messages, `catalog.sort.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[var(--color-text-muted)]">Min</label>
              <Input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-[var(--color-text-muted)]">Max</label>
              <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>
          <Button fullWidth onClick={() => setFilterOpen(false)}>
            {tr(messages, 'common.submit')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
