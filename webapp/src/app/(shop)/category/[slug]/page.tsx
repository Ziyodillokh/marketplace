'use client';

import { use, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { ProductGrid } from '@/components/shop/product-grid';
import { Sheet } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGetCategoryBySlug, apiListProducts, type ListProductsQuery } from '@/lib/api/endpoints';
import { useTrackOnMount } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';

type Sort = NonNullable<ListProductsQuery['sort']>;

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', slug, locale],
    queryFn: () => apiGetCategoryBySlug(slug),
  });

  useTrackOnMount({ type: 'VIEW_CATEGORY', categoryId: category?.id });

  const [sort, setSort] = useState<Sort>('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const productsParams = {
    categoryId: category?.id,
    sort,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    limit: 16,
  };

  const products = useInfiniteQuery({
    queryKey: ['products', 'by-category', category?.id, sort, minPrice, maxPrice],
    queryFn: ({ pageParam }) => apiListProducts({ ...productsParams, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(category?.id),
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && products.hasNextPage && !products.isFetchingNextPage) {
        products.fetchNextPage();
      }
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [products]);

  const items = products.data?.pages.flatMap((p) => p.items) ?? [];
  const activeFilterCount = (sort !== 'newest' ? 1 : 0) + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  return (
    <div>
      <PageHeader title={category?.title ?? '...'} />

      {category?.bannerUrl && (
        <div className="relative aspect-[2.6/1] mx-4 mt-2 rounded-2xl overflow-hidden bg-gray-100">
          <Image src={category.bannerUrl} alt={category.title} fill className="object-cover" />
        </div>
      )}

      {/* Filter / sort bar */}
      <div className="sticky top-14 z-10 bg-[var(--color-bg)] px-4 py-2 flex items-center gap-2 border-b border-[var(--color-border)]">
        <button
          onClick={() => setFilterOpen(true)}
          className="h-10 px-3 rounded-xl bg-white border border-[var(--color-border)] inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <SlidersHorizontal size={16} />
          {tr(messages, 'common.filter')}
          {activeFilterCount > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold grid place-items-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Quick sort chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          {(['newest', 'bestsellers', 'price_asc', 'discount'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`whitespace-nowrap h-10 px-3 rounded-xl text-xs font-medium border shrink-0 ${
                sort === s
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white border-[var(--color-border)]'
              }`}
            >
              {tr(messages, `catalog.sort.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-categories */}
      {category?.children && category.children.length > 0 && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {category.children.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="whitespace-nowrap h-9 px-3 rounded-full bg-white border border-[var(--color-border)] text-xs font-medium"
            >
              {c.title}
            </Link>
          ))}
        </div>
      )}

      <div className="px-4 mt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : items.length === 0 && !products.isLoading ? (
          <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">
            {tr(messages, 'catalog.empty')}
          </div>
        ) : (
          <ProductGrid items={items} loading={products.isFetchingNextPage || products.isLoading} />
        )}
        <div ref={sentinelRef} className="h-10" />
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
                    sort === s
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white border-[var(--color-border)]'
                  }`}
                >
                  {tr(messages, `catalog.sort.${s}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">{locale === 'ru' ? 'Цена' : 'Narx'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">Min</label>
                <Input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">Max</label>
                <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setSort('newest');
                setMinPrice('');
                setMaxPrice('');
              }}
            >
              {tr(messages, 'catalog.clearFilters')}
            </Button>
            <Button fullWidth onClick={() => setFilterOpen(false)}>
              {tr(messages, 'common.submit')}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
