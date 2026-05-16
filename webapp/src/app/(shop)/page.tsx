'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/shop/app-header';
import { BannerCarousel } from '@/components/shop/banner-carousel';
import { CategoryTabs } from '@/components/shop/category-tabs';
import { ProductGrid } from '@/components/shop/product-grid';
import { ProductCardSkeleton } from '@/components/shop/product-card';
import { apiListProducts } from '@/lib/api/endpoints';
import { useTrackOnMount, track } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';

export default function HomePage() {
  useTrackOnMount({ type: 'VIEW_HOME' });
  useTelegramBackButton();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: bestsellers, isLoading: loadingBest } = useQuery({
    queryKey: ['products', 'bestsellers', categoryId],
    queryFn: () =>
      apiListProducts({ sort: 'bestsellers', limit: 10, categoryId: categoryId ?? undefined }),
  });

  const newest = useInfiniteQuery({
    queryKey: ['products', 'newest', categoryId],
    queryFn: ({ pageParam }) =>
      apiListProducts({
        sort: 'newest',
        limit: 12,
        cursor: pageParam,
        categoryId: categoryId ?? undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && newest.hasNextPage && !newest.isFetchingNextPage) {
        newest.fetchNextPage();
      }
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [newest]);

  const newestItems = newest.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <AppHeader />

      <section className="px-4 py-3">
        <BannerCarousel />
      </section>

      <section>
        <CategoryTabs selectedId={categoryId} onSelect={setCategoryId} />
      </section>

      <section className="px-4">
        <h2 className="text-lg font-bold mb-3">{tr(messages, 'home.bestsellers')}</h2>
        {loadingBest ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <ProductGrid items={bestsellers?.items ?? []} />
        )}
      </section>

      <section className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3">{tr(messages, 'home.newArrivals')}</h2>
        <ProductGrid items={newestItems} loading={newest.isFetchingNextPage} />
        <div ref={sentinelRef} className="h-10" />
      </section>
    </div>
  );
}
