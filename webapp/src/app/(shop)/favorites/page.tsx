'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shop/page-header';
import { ProductGrid } from '@/components/shop/product-grid';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiListFavorites } from '@/lib/api/endpoints';
import { useTrackOnMount } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';

export default function FavoritesPage() {
  useTrackOnMount({ type: 'VIEW_FAVORITES' });
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: apiListFavorites,
  });

  return (
    <div>
      <PageHeader title={tr(messages, 'favorites.title')} />
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Heart size={48} />}
            title={tr(messages, 'favorites.empty')}
            action={
              <Link href="/">
                <Button>{tr(messages, 'cart.goToCatalog')}</Button>
              </Link>
            }
          />
        ) : (
          <ProductGrid items={items} />
        )}
      </div>
    </div>
  );
}
