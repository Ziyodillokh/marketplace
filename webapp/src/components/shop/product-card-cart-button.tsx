'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import {
  apiAddToCart,
  apiGetCart,
  apiUpdateCartQty,
  apiRemoveCartItem,
} from '@/lib/api/endpoints';
import { haptic } from '@/lib/telegram';
import { toast } from '@/stores/toast-store';
import { track } from '@/hooks/use-track';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import type { CartItem, CartView, ProductCard } from '@/lib/api/types';

interface Props {
  product: Pick<ProductCard, 'id' | 'title' | 'price' | 'imageUrl' | 'hasVariants' | 'defaultVariantId' | 'outOfStock'>;
}

/**
 * Universal cart tugmasi — barcha mahsulotlar uchun bir xil UX:
 * - Click "Savatga / В корзину" → optimistik (darhol) +1 qty controller chiqadi
 * - Variant'li mahsulot uchun: defaultVariantId bilan birinchi mavjud variantni qo'shadi
 * - Click takrorlansa qty oshadi
 * - − bossa kamayadi, 1 da bossa o'chadi
 *
 * Tugma `stopPropagation` qiladi — kartochka ustki qismida bossa product detail'ga ketadi,
 * tugmani bossa esa hech qaerga ketmaydi.
 */
export function ProductCardCartButton({ product }: Props) {
  const qc = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: cartItem } = useQuery<CartView, Error, CartItem | null>({
    queryKey: ['cart'],
    queryFn: apiGetCart,
    // Faqat shu mahsulot uchun item — boshqa mahsulot o'zgarsa re-render bo'lmaydi
    select: (data) =>
      data.items.find((i) =>
        product.hasVariants
          ? i.productId === product.id && i.variantId === product.defaultVariantId
          : i.productId === product.id,
      ) ?? null,
    staleTime: 30_000,
    notifyOnChangeProps: ['data'],
  });

  // Optimistik qo'shish: cache'da darhol item paydo bo'ladi
  const addMutation = useMutation({
    mutationFn: () =>
      apiAddToCart({
        productId: product.id,
        variantId: product.defaultVariantId ?? undefined,
        quantity: 1,
      }),
    onMutate: async () => {
      haptic('light');
      await qc.cancelQueries({ queryKey: ['cart'] });
      const prev = qc.getQueryData<CartView>(['cart']);
      if (prev) {
        const optimisticItem: CartItem = {
          id: `temp-${product.id}-${Date.now()}`,
          productId: product.id,
          variantId: product.defaultVariantId,
          title: product.title,
          variantLabel: null,
          imageUrl: product.imageUrl,
          unitPrice: product.price,
          oldPrice: null,
          quantity: 1,
          stock: 999,
          lineTotal: product.price,
        };
        const items = [...prev.items, optimisticItem];
        const count = items.reduce((a, x) => a + x.quantity, 0);
        const subtotal = items.reduce((a, x) => a + x.lineTotal, 0);
        qc.setQueryData<CartView>(['cart'], { items, summary: { count, subtotal } });
      }
      return { prev };
    },
    onSuccess: () => {
      haptic('success');
      track({ type: 'CART_ADD', productId: product.id });
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
    },
    onError: (err: Error, _v, ctx) => {
      haptic('error');
      if (ctx?.prev) qc.setQueryData(['cart'], ctx.prev);
      toast.error(err.message);
    },
  });

  const incrementMutation = useMutation({
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

  // Tugmaning klik-handler'i:
  // stopPropagation + preventDefault — kartochka link'ini bosib o'tib ketishni oldini olamiz
  const stop = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (product.outOfStock) {
    return (
      <button
        disabled
        onClick={stop}
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
          stop(e);
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
    <div
      onClick={stop}
      onPointerDown={stop}
      className="w-full h-9 rounded-xl bg-[var(--color-primary)]/10 inline-flex items-center justify-between px-1"
    >
      <button
        onClick={(e) => {
          stop(e);
          if (cartItem.quantity <= 1) {
            removeMutation.mutate();
          } else {
            incrementMutation.mutate(cartItem.quantity - 1);
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
          stop(e);
          incrementMutation.mutate(cartItem.quantity + 1);
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
