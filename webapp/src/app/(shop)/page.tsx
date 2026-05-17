'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { AppHeader } from '@/components/shop/app-header';
import { BannerCarousel } from '@/components/shop/banner-carousel';
import { ProductGrid } from '@/components/shop/product-grid';
import { ProductCardSkeleton } from '@/components/shop/product-card';
import { apiListProducts } from '@/lib/api/endpoints';
import { useTrackOnMount } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';

export default function HomePage() {
  useTrackOnMount({ type: 'VIEW_HOME' });
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: bestsellers, isLoading: loadingBest } = useQuery({
    queryKey: ['products', 'bestsellers', null],
    queryFn: () => apiListProducts({ sort: 'bestsellers', limit: 10 }),
  });

  const newest = useInfiniteQuery({
    queryKey: ['products', 'newest', null],
    queryFn: ({ pageParam }) =>
      apiListProducts({ sort: 'newest', limit: 12, cursor: pageParam }),
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

      <section className="px-4">
        <SectionHeader
          title={tr(messages, 'home.bestsellers')}
          viewAllHref="/catalog"
          viewAllLabel={tr(messages, 'home.viewAll')}
        />
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
        <SectionHeader
          title={tr(messages, 'home.newArrivals')}
          viewAllHref="/catalog"
          viewAllLabel={tr(messages, 'home.viewAll')}
        />
        <ProductGrid items={newestItems} loading={newest.isFetchingNextPage} />
        <div ref={sentinelRef} className="h-10" />
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <Link
        href={viewAllHref}
        className="text-xs font-semibold text-[var(--color-primary)] inline-flex items-center gap-0.5 active:opacity-70"
      >
        {viewAllLabel}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
