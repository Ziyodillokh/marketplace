'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { haptic } from '@/lib/telegram';
import { apiToggleFavorite } from '@/lib/api/endpoints';
import type { ProductCard as ProductCardDto, CursorPage } from '@/lib/api/types';
import { PriceLabel } from './price-label';
import { ProductCardCartButton } from './product-card-cart-button';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { track } from '@/hooks/use-track';

/**
 * Cache'da bu mahsulot uchun isFavorite ni instant flip qiladi.
 * Barcha cached querylar (products, favorites, related) ko'rib chiqiladi.
 */
function flipFavoriteInCache(
  qc: ReturnType<typeof useQueryClient>,
  productId: string,
  next: boolean,
): void {
  qc.getQueryCache()
    .getAll()
    .forEach((q) => {
      const data = q.state.data as unknown;
      if (!data) return;

      // Array (favorites, related)
      if (Array.isArray(data)) {
        let changed = false;
        const arr = (data as ProductCardDto[]).map((p) => {
          if (p && typeof p === 'object' && 'id' in p && p.id === productId) {
            changed = true;
            return { ...p, isFavorite: next };
          }
          return p;
        });
        if (changed) qc.setQueryData(q.queryKey, arr);
        return;
      }

      const obj = data as Record<string, unknown>;

      // Single page CursorPage
      if (Array.isArray(obj.items)) {
        let changed = false;
        const items = (obj.items as ProductCardDto[]).map((p) => {
          if (p?.id === productId) {
            changed = true;
            return { ...p, isFavorite: next };
          }
          return p;
        });
        if (changed) qc.setQueryData(q.queryKey, { ...obj, items });
        return;
      }

      // Infinite query (pages)
      if (Array.isArray(obj.pages)) {
        let changed = false;
        const pages = (obj.pages as Array<CursorPage<ProductCardDto>>).map((page) => {
          let pageChanged = false;
          const items = page.items.map((p) => {
            if (p?.id === productId) {
              changed = true;
              pageChanged = true;
              return { ...p, isFavorite: next };
            }
            return p;
          });
          return pageChanged ? { ...page, items } : page;
        });
        if (changed) qc.setQueryData(q.queryKey, { ...obj, pages });
        return;
      }

      // Product detail
      if (obj.id === productId && 'isFavorite' in obj) {
        qc.setQueryData(q.queryKey, { ...obj, isFavorite: next });
      }
    });
}

export function ProductCard({ product }: { product: ProductCardDto }) {
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  const qc = useQueryClient();

  const toggleFav = useMutation({
    mutationFn: () => apiToggleFavorite(product.id),
    onMutate: () => {
      haptic('light');
      const next = !product.isFavorite;
      flipFavoriteInCache(qc, product.id, next);
      return { rolledBack: product.isFavorite };
    },
    onSuccess: (data) => {
      flipFavoriteInCache(qc, product.id, data.isFavorite);
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['favorites-summary'] });
      track({
        type: data.isFavorite ? 'FAVORITE_ADD' : 'FAVORITE_REMOVE',
        productId: product.id,
      });
    },
    onError: (_e, _v, ctx) => {
      if (ctx) flipFavoriteInCache(qc, product.id, ctx.rolledBack);
      haptic('error');
    },
  });

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden border border-[var(--color-border)] flex flex-col">
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
              {tr(messages, 'product.outOfStock')}
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

      <div className="px-3 pb-3">
        <ProductCardCartButton productId={product.id} outOfStock={product.outOfStock} />
      </div>

      <button
        type="button"
        onClick={() => toggleFav.mutate()}
        aria-label="Toggle favorite"
        className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white grid place-items-center shadow-sm active:scale-90 transition-transform"
      >
        <Heart
          size={18}
          className={cn(
            'transition-colors',
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
        <div className="h-9 skeleton rounded-xl mt-2" />
      </div>
    </div>
  );
}
