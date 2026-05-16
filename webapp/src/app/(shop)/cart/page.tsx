'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { QtyControl } from '@/components/shop/qty-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiApplyPromo,
  apiGetCart,
  apiPublicSettings,
  apiRemoveCartItem,
  apiUpdateCartQty,
} from '@/lib/api/endpoints';
import { useTrackOnMount, track } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { usePromoStore } from '@/stores/promo-store';
import { toast } from '@/stores/toast-store';
import { haptic } from '@/lib/telegram';

export default function CartPage() {
  useTrackOnMount({ type: 'VIEW_CART' });
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  const qc = useQueryClient();
  const { applied: appliedPromo, apply: applyPromo, clear: clearPromo } = usePromoStore();

  const { data: cart, isLoading } = useQuery({ queryKey: ['cart'], queryFn: apiGetCart });
  const { data: settings } = useQuery({ queryKey: ['public-settings'], queryFn: apiPublicSettings });

  const updateQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => apiUpdateCartQty(id, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
    },
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => apiRemoveCartItem(id),
    onSuccess: (_d, id) => {
      track({ type: 'CART_REMOVE', payload: { itemId: id } });
      haptic('light');
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
    },
  });

  const [promoInput, setPromoInput] = useState('');
  const applyPromoMut = useMutation({
    mutationFn: (code: string) => apiApplyPromo(code),
    onSuccess: (res) => {
      applyPromo(res);
      setPromoInput('');
      haptic('success');
      toast.success(tr(messages, 'cart.promoApplied'));
      track({ type: 'PROMO_APPLY', payload: { code: res.code, discount: res.discountAmount } });
    },
    onError: (err: Error) => {
      haptic('error');
      toast.error(err.message);
    },
  });

  const subtotal = cart?.summary.subtotal ?? 0;
  const discountAmount = appliedPromo
    ? Math.min(
        appliedPromo.type === 'PERCENT'
          ? Math.floor((subtotal * appliedPromo.value) / 100)
          : appliedPromo.value,
        subtotal,
      )
    : 0;
  const deliveryFee =
    !settings || subtotal - discountAmount >= settings.business.freeDeliveryThreshold
      ? 0
      : settings.business.deliveryFee;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);
  const minOrder = settings?.business.minOrderAmount ?? 0;
  const belowMin = subtotal < minOrder;

  if (isLoading) {
    return (
      <div>
        <PageHeader title={tr(messages, 'cart.title')} />
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div>
        <PageHeader title={tr(messages, 'cart.title')} />
        <EmptyState
          icon={<ShoppingCart size={48} />}
          title={tr(messages, 'cart.empty')}
          action={
            <Link href="/">
              <Button>{tr(messages, 'cart.goToCatalog')}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="pb-40">
      <PageHeader title={tr(messages, 'cart.title')} />
      <ul className="px-4 py-3 space-y-3">
        {cart.items.map((item) => (
          <li key={item.id} className="bg-white rounded-2xl p-3 flex gap-3 border border-[var(--color-border)]">
            <Link href={`/product/${item.productId}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
              {item.imageUrl && <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="80px" />}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/product/${item.productId}`} className="text-sm font-medium line-clamp-2">{item.title}</Link>
              {item.variantLabel && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.variantLabel}</p>
              )}
              <p className="text-sm font-semibold text-[var(--color-primary)] mt-1">{formatMoney(item.unitPrice, locale)}</p>
              <div className="flex items-center justify-between mt-2">
                <QtyControl
                  value={item.quantity}
                  size="sm"
                  max={item.stock}
                  onChange={(qty) => {
                    track({ type: 'CART_UPDATE_QTY', payload: { itemId: item.id, qty } });
                    updateQty.mutate({ id: item.id, qty });
                  }}
                />
                <button
                  onClick={() => removeItem.mutate(item.id)}
                  className="h-8 w-8 grid place-items-center text-[var(--color-text-muted)]"
                  aria-label="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="px-4 mt-2">
        {appliedPromo ? (
          <div className="bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-2xl p-3 flex items-center justify-between">
            <span className="text-sm font-semibold">{appliedPromo.code} — {tr(messages, 'common.applied')}</span>
            <button
              onClick={() => {
                clearPromo();
                track({ type: 'PROMO_REMOVE', payload: { code: appliedPromo.code } });
              }}
              className="text-sm font-medium"
            >
              {tr(messages, 'common.remove')}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder={tr(messages, 'cart.promoPlaceholder')}
            />
            <Button
              variant="secondary"
              loading={applyPromoMut.isPending}
              onClick={() => promoInput && applyPromoMut.mutate(promoInput)}
              disabled={!promoInput}
            >
              {tr(messages, 'cart.applyPromo')}
            </Button>
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-2 text-sm">
        <Row label={tr(messages, 'cart.subtotal')} value={formatMoney(subtotal, locale)} />
        {discountAmount > 0 && (
          <Row label={tr(messages, 'cart.discount')} value={`−${formatMoney(discountAmount, locale)}`} className="text-[var(--color-success)]" />
        )}
        <Row
          label={tr(messages, 'cart.delivery')}
          value={deliveryFee === 0 ? tr(messages, 'common.free') : formatMoney(deliveryFee, locale)}
        />
      </div>

      {belowMin && (
        <p className="px-4 mt-3 text-sm text-[var(--color-danger)]">
          {tr(messages, 'cart.minOrderHint', { amount: formatMoney(minOrder, locale) })}
        </p>
      )}

      <div className="fixed bottom-[72px] inset-x-0 max-w-md mx-auto bg-white border-t border-[var(--color-border)] px-4 py-3 z-20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--color-text-muted)]">{tr(messages, 'cart.total')}</span>
          <span className="text-xl font-bold text-[var(--color-primary)]">{formatMoney(total, locale)}</span>
        </div>
        <Link href="/cart/checkout" onClick={() => track({ type: 'CHECKOUT_START' })}>
          <Button fullWidth size="lg" disabled={belowMin}>{tr(messages, 'cart.checkout')}</Button>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className ?? ''}`}>
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
