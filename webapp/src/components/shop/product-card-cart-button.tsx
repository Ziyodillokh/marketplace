'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { apiAddToCart, apiGetCart, apiUpdateCartQty, apiRemoveCartItem } from '@/lib/api/endpoints';
import { haptic } from '@/lib/telegram';
import { toast } from '@/stores/toast-store';
import { track } from '@/hooks/use-track';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import type { CartItem, CartView } from '@/lib/api/types';

interface Props {
  productId: string;
  outOfStock: boolean;
}

/**
 * Kartochka pastida "В корзину" / "− N +" controller.
 * Performance: `select` faqat shu mahsulot uchun cart item — boshqa o'zgarishlarda re-render bo'lmaydi.
 */
export function ProductCardCartButton({ productId, outOfStock }: Props) {
  const qc = useQueryClient();
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: cartItem } = useQuery<CartView, Error, CartItem | null>({
    queryKey: ['cart'],
    queryFn: apiGetCart,
    select: (data) => data.items.find((i) => i.productId === productId) ?? null,
    staleTime: 30_000,
    notifyOnChangeProps: ['data'],
  });

  const addMutation = useMutation({
    mutationFn: () => apiAddToCart({ productId, quantity: 1 }),
    onMutate: () => haptic('light'),
    onSuccess: () => {
      haptic('success');
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
      track({ type: 'CART_ADD', productId });
    },
    onError: (err: Error) => {
      if (err.message?.toLowerCase().includes('variant')) {
        router.push(`/product/${productId}`);
        return;
      }
      haptic('error');
      toast.error(err.message);
    },
  });

  const updateQtyMutation = useMutation({
    mutationFn: (qty: number) => apiUpdateCartQty(cartItem!.id, qty),
    onMutate: async (qty) => {
      haptic('light');
      await qc.cancelQueries({ queryKey: ['cart'] });
      const prev = qc.getQueryData<CartView>(['cart']);
      if (prev) {
        const items = prev.items.map((i) =>
          i.id === cartItem!.id ? { ...i, quantity: qty, lineTotal: i.unitPrice * qty } : i,
        );
        const count = items.reduce((a, x) => a + x.quantity, 0);
        const subtotal = items.reduce((a, x) => a + x.lineTotal, 0);
        qc.setQueryData<CartView>(['cart'], { items, summary: { count, subtotal } });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['cart'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => apiRemoveCartItem(cartItem!.id),
    onMutate: async () => {
      haptic('light');
      await qc.cancelQueries({ queryKey: ['cart'] });
      const prev = qc.getQueryData<CartView>(['cart']);
      if (prev) {
        const items = prev.items.filter((i) => i.id !== cartItem!.id);
        const count = items.reduce((a, x) => a + x.quantity, 0);
        const subtotal = items.reduce((a, x) => a + x.lineTotal, 0);
        qc.setQueryData<CartView>(['cart'], { items, summary: { count, subtotal } });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['cart'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
    },
  });

  if (outOfStock) {
    return (
      <button
        disabled
        className="w-full h-9 rounded-xl bg-gray-100 text-[var(--color-text-muted)] text-xs font-semibold cursor-not-allowed"
      >
        {tr(messages, 'product.outOfStock')}
      </button>
    );
  }

  if (!cartItem) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addMutation.mutate();
        }}
        disabled={addMutation.isPending}
        className="w-full h-9 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-60"
      >
        <ShoppingCart size={14} />
        {tr(messages, 'product.addToCartShort')}
      </button>
    );
  }

  return (
    <div className="w-full h-9 rounded-xl bg-[var(--color-primary)]/10 inline-flex items-center justify-between px-1">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (cartItem.quantity <= 1) {
            removeMutation.mutate();
          } else {
            updateQtyMutation.mutate(cartItem.quantity - 1);
          }
        }}
        className="h-7 w-7 grid place-items-center rounded-lg bg-white shadow-sm active:scale-95 transition-transform"
        aria-label="Decrement"
      >
        <Minus size={14} className="text-[var(--color-primary)]" />
      </button>
      <span className="text-sm font-bold text-[var(--color-primary)] min-w-[24px] text-center">
        {cartItem.quantity}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updateQtyMutation.mutate(cartItem.quantity + 1);
        }}
        disabled={cartItem.quantity >= cartItem.stock}
        className="h-7 w-7 grid place-items-center rounded-lg bg-white shadow-sm active:scale-95 transition-transform disabled:opacity-40"
        aria-label="Increment"
      >
        <Plus size={14} className="text-[var(--color-primary)]" />
      </button>
    </div>
  );
}
