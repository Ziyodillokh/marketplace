'use client';

import { use, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shop/page-header';
import { ProductGrid } from '@/components/shop/product-grid';
import { apiGetCategoryBySlug, apiListProducts } from '@/lib/api/endpoints';
import { useTrackOnMount } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  useTelegramBackButton();
  const { data: category, isLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: () => apiGetCategoryBySlug(slug),
  });

  useTrackOnMount({ type: 'VIEW_CATEGORY', categoryId: category?.id });

  const products = useInfiniteQuery({
    queryKey: ['products', 'by-category', category?.id],
    queryFn: ({ pageParam }) =>
      apiListProducts({ categoryId: category?.id, sort: 'newest', limit: 16, cursor: pageParam }),
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

  return (
    <div>
      <PageHeader title={category?.title ?? '...'} />
      {category?.bannerUrl && (
        <div className="relative aspect-[2.6/1] mx-4 mt-2 rounded-2xl overflow-hidden bg-gray-100">
          <Image src={category.bannerUrl} alt={category.title} fill className="object-cover" />
        </div>
      )}
      {category?.children && category.children.length > 0 && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {category.children.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="whitespace-nowrap h-10 px-4 rounded-full bg-white border border-[var(--color-border)] text-sm font-medium"
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
        ) : (
          <ProductGrid items={items} loading={products.isFetchingNextPage} />
        )}
        <div ref={sentinelRef} className="h-10" />
      </div>
    </div>
  );
}
