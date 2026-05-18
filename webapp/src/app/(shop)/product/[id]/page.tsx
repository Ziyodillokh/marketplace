'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { ProductGallery } from '@/components/shop/product-gallery';
import { VariantPicker } from '@/components/shop/variant-picker';
import { PriceLabel } from '@/components/shop/price-label';
import { RelatedProducts } from '@/components/shop/related-products';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiAddToCart, apiGetProduct, apiToggleFavorite } from '@/lib/api/endpoints';
import { useTrackOnMount, track } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { haptic } from '@/lib/telegram';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/cn';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useTrackOnMount({ type: 'VIEW_PRODUCT', productId: id });
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiGetProduct(id),
  });

  // Track time on page
  useEffect(() => {
    const start = Date.now();
    return () => {
      const durationSec = Math.round((Date.now() - start) / 1000);
      if (durationSec >= 2) {
        track({ type: 'PRODUCT_DURATION', productId: id, payload: { durationSec } });
      }
    };
  }, [id]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (selectedVariantId) return;
    // Birinchi mavjud variantni avtomatik tanlash — variantlar bor bo'lsa ham UX yaxshilanadi
    const firstInStock = data.variants.find((v) => v.stock > 0);
    const firstAny = data.variants[0];
    const pick = firstInStock ?? firstAny;
    if (pick) setSelectedVariantId(pick.id);
  }, [data, selectedVariantId]);

  const selectedVariant = useMemo(
    () => data?.variants.find((v) => v.id === selectedVariantId) ?? null,
    [data, selectedVariantId],
  );

  const qc = useQueryClient();
  const addToCartMutation = useMutation({
    mutationFn: () =>
      apiAddToCart({
        productId: id,
        variantId: selectedVariantId ?? undefined,
        quantity: 1,
      }),
    onSuccess: () => {
      haptic('success');
      toast.success(tr(messages, 'product.inCart'));
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
      qc.invalidateQueries({ queryKey: ['cart'] });
      track({
        type: 'CART_ADD',
        productId: id,
        payload: { variantId: selectedVariantId, price: selectedVariant?.price ?? data?.price },
      });
    },
    onError: (err: Error) => {
      haptic('error');
      toast.error(err.message);
    },
  });

  const toggleFav = useMutation({
    mutationFn: () => apiToggleFavorite(id),
    onSuccess: (res) => {
      haptic('light');
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['favorites-summary'] });
      track({ type: res.isFavorite ? 'FAVORITE_ADD' : 'FAVORITE_REMOVE', productId: id });
    },
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="..." />
        <Skeleton className="aspect-square w-full" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  const variantsExist = data.variants.length > 0;
  const allOutOfStock = variantsExist && data.variants.every((v) => v.stock <= 0);
  const canAdd =
    !variantsExist ||
    (selectedVariant ? selectedVariant.stock > 0 : data.variants.some((v) => v.stock > 0));
  const displayedPrice = selectedVariant?.price ?? data.price;
  const displayedOld = selectedVariant?.oldPrice ?? data.oldPrice;

  const buttonLabel = (() => {
    if (!variantsExist) return tr(messages, 'product.addToCart');
    if (allOutOfStock) return tr(messages, 'product.outOfStock');
    if (!selectedVariant) return tr(messages, 'product.selectVariant');
    if (selectedVariant.stock <= 0) return tr(messages, 'product.outOfStock');
    return tr(messages, 'product.addToCart');
  })();

  return (
    <div>
      <PageHeader title={data.category.title} />

      <div className="relative bg-white">
        <ProductGallery images={data.images.length > 0 ? data.images : [{ id: 'fallback', url: data.imageUrl ?? '' }].filter((x) => x.url)} title={data.title} />
        <button
          onClick={() => toggleFav.mutate()}
          className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white grid place-items-center shadow-sm"
          aria-label="Toggle favorite"
        >
          <Heart
            size={20}
            className={cn(
              data.isFavorite ? 'fill-[var(--color-favorite)] text-[var(--color-favorite)]' : 'text-gray-400',
            )}
          />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          {data.brand && <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{data.brand}</p>}
          <h1 className="text-xl font-bold mt-1">{data.title}</h1>
        </div>

        <div className="flex items-center justify-between">
          <PriceLabel price={displayedPrice} oldPrice={displayedOld} locale={locale} size="lg" />
          {data.discountPct ? (
            <span className="px-2 py-1 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-sm font-bold">
              −{data.discountPct}%
            </span>
          ) : null}
        </div>

        {variantsExist && (
          <VariantPicker
            variants={data.variants}
            selectedId={selectedVariantId}
            onSelect={setSelectedVariantId}
          />
        )}

        {selectedVariant && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {tr(messages, 'product.stockShort', { count: selectedVariant.stock })}
          </p>
        )}

        {data.description && (
          <div>
            <h2 className="font-semibold mb-2">{tr(messages, 'product.description')}</h2>
            <p className={cn('text-sm text-[var(--color-text)] whitespace-pre-line', !descExpanded && 'line-clamp-4')}>{data.description}</p>
            {data.description.length > 200 && (
              <button
                onClick={() => setDescExpanded((v) => !v)}
                className="text-sm text-[var(--color-primary)] inline-flex items-center gap-1 mt-1"
              >
                {descExpanded ? <>{tr(messages, 'common.close')} <ChevronUp size={16} /></> : <>{tr(messages, 'common.more')} <ChevronDown size={16} /></>}
              </button>
            )}
          </div>
        )}

        {data.specs.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">{tr(messages, 'product.specifications')}</h2>
            <div className="bg-white rounded-2xl border border-[var(--color-border)] divide-y">
              {data.specs.map((s, i) => (
                <div key={i} className="flex justify-between text-sm px-4 py-2.5">
                  <span className="text-[var(--color-text-muted)]">{s.label}</span>
                  <span className="font-medium text-right">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RelatedProducts productId={id} />

      <div className="fixed bottom-[72px] inset-x-0 z-20 px-4 py-3 bg-white border-t border-[var(--color-border)] max-w-md mx-auto">
        <Button
          fullWidth
          size="lg"
          disabled={!canAdd || (variantsExist && !selectedVariant)}
          loading={addToCartMutation.isPending}
          onClick={() => addToCartMutation.mutate()}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
