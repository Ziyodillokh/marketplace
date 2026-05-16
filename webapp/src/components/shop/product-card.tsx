'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/telegram';
import { apiToggleFavorite } from '@/lib/api/endpoints';
import type { ProductCard as ProductCardDto } from '@/lib/api/types';
import { PriceLabel } from './price-label';
import { useLocaleStore } from '@/stores/locale-store';
import { track } from '@/hooks/use-track';

export function ProductCard({ product }: { product: ProductCardDto }) {
  const locale = useLocaleStore((s) => s.locale);
  const qc = useQueryClient();
  const toggleFav = useMutation({
    mutationFn: () => apiToggleFavorite(product.id),
    onMutate: () => haptic('light'),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['favorites-summary'] });
      track({
        type: data.isFavorite ? 'FAVORITE_ADD' : 'FAVORITE_REMOVE',
        productId: product.id,
      });
    },
  });

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden border border-[var(--color-border)]">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square bg-gray-50">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-gray-300">No image</div>
          )}
          {product.discountPct && product.discountPct > 0 ? (
            <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-[var(--color-danger)] text-white text-xs font-bold">
              −{product.discountPct}%
            </span>
          ) : null}
          {product.outOfStock && (
            <span className="absolute inset-0 bg-white/70 grid place-items-center text-xs font-semibold text-[var(--color-text-muted)]">
              Tugadi
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
          <div className="mt-2">
            <PriceLabel price={product.price} oldPrice={product.oldPrice} locale={locale} size="sm" />
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleFav.mutate()}
        disabled={toggleFav.isPending}
        aria-label="Toggle favorite"
        className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white grid place-items-center shadow-sm"
      >
        <Heart
          size={18}
          className={cn(
            product.isFavorite ? 'fill-[var(--color-favorite)] text-[var(--color-favorite)]' : 'text-gray-400',
          )}
        />
      </button>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[var(--color-border)]">
      <div className="aspect-square skeleton rounded-none" />
      <div className="p-3 space-y-2">
        <div className="h-3 skeleton w-3/4 rounded" />
        <div className="h-3 skeleton w-1/2 rounded" />
        <div className="h-4 skeleton w-1/2 rounded mt-2" />
      </div>
    </div>
  );
}
