'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiCancelOrder, apiGetOrder } from '@/lib/api/endpoints';
import { useTrackOnMount } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { formatMoney, formatDateTime } from '@/lib/format';
import { useSearchParams } from 'next/navigation';
import { haptic } from '@/lib/telegram';
import { toast } from '@/stores/toast-store';
import type { OrderStatus } from '@/lib/api/types';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useTrackOnMount({ type: 'VIEW_ORDER_DETAIL', payload: { orderId: id } });
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  const sp = useSearchParams();
  const justCreated = sp.get('just-created') === '1';
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiGetOrder(id),
  });

  const cancel = useMutation({
    mutationFn: () => apiCancelOrder(id),
    onSuccess: (data) => {
      haptic('success');
      toast.success(tr(messages, 'orders.status.CANCELLED'));
      qc.setQueryData(['order', id], data);
    },
    onError: (err: Error) => {
      haptic('error');
      toast.error(err.message);
    },
  });

  if (isLoading || !order) {
    return (
      <div>
        <PageHeader title="..." />
        <div className="px-4 py-4 space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const timeline: OrderStatus[] = ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED'];
  const currentIdx = timeline.indexOf(order.status);
  const showTimeline = order.status !== 'CANCELLED';
  const canCancel =
    order.status === 'PENDING' &&
    Date.now() - new Date(order.createdAt).getTime() < 60 * 60 * 1000;

  return (
    <div className="pb-24">
      <PageHeader title={`#${order.orderNumber}`} />

      {justCreated && (
        <div className="px-4 pt-3">
          <div className="bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-2xl p-3 flex items-center gap-2">
            <CheckCircle2 size={20} />
            <p className="text-sm font-medium">{tr(messages, 'checkout.success')}</p>
          </div>
        </div>
      )}

      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <OrderStatusBadge status={order.status} locale={locale} />
          <span className="text-xs text-[var(--color-text-muted)]">{formatDateTime(order.createdAt, locale)}</span>
        </div>

        {showTimeline && (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
            <ol className="relative space-y-3 ml-3">
              {timeline.map((s, i) => {
                const reached = i <= currentIdx;
                return (
                  <li key={s} className="relative pl-6">
                    <span
                      className={`absolute left-0 top-1 h-3 w-3 rounded-full ${reached ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}
                    />
                    {i < timeline.length - 1 && (
                      <span
                        className={`absolute left-[5px] top-4 h-5 w-px ${i < currentIdx ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
                      />
                    )}
                    <span className={`text-sm ${reached ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-muted)]'}`}>
                      {tr(messages, `orders.status.${s}`)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </section>

      <section className="px-4">
        <h2 className="text-sm font-semibold mb-2">Mahsulotlar</h2>
        <ul className="bg-white rounded-2xl border border-[var(--color-border)] divide-y">
          {order.items.map((i) => (
            <li key={i.id} className="p-3 flex gap-3">
              <Link href={`/product/${i.productId}`} className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {i.imageUrl && <Image src={i.imageUrl} alt={i.title} fill className="object-cover" sizes="64px" />}
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-2">{i.title}</p>
                {i.variantLabel && <p className="text-xs text-[var(--color-text-muted)]">{i.variantLabel}</p>}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[var(--color-text-muted)]">× {i.quantity}</span>
                  <span className="text-sm font-semibold">{formatMoney(i.lineTotal, locale)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-4 mt-4 space-y-2 text-sm">
        <Row label={tr(messages, 'cart.subtotal')} value={formatMoney(order.subtotal, locale)} />
        {order.discountAmount > 0 && (
          <Row
            label={`${tr(messages, 'cart.discount')}${order.promoSnapshot ? ` (${order.promoSnapshot})` : ''}`}
            value={`−${formatMoney(order.discountAmount, locale)}`}
            className="text-[var(--color-success)]"
          />
        )}
        <Row
          label={tr(messages, 'cart.delivery')}
          value={order.deliveryFee === 0 ? tr(messages, 'common.free') : formatMoney(order.deliveryFee, locale)}
        />
        <Row
          label={tr(messages, 'cart.total')}
          value={formatMoney(order.total, locale)}
          className="font-bold text-base text-[var(--color-primary)]"
        />
      </section>

      <section className="px-4 mt-4">
        <h2 className="text-sm font-semibold mb-2">Yetkazib berish</h2>
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-3 space-y-1 text-sm">
          <p><span className="text-[var(--color-text-muted)]">{tr(messages, 'checkout.name')}:</span> {order.receiverName}</p>
          <p><span className="text-[var(--color-text-muted)]">{tr(messages, 'checkout.phone')}:</span> {order.receiverPhone}</p>
          <p><span className="text-[var(--color-text-muted)]">{tr(messages, 'checkout.address')}:</span> {order.address}</p>
          {order.note && <p><span className="text-[var(--color-text-muted)]">{tr(messages, 'checkout.note')}:</span> {order.note}</p>}
        </div>
      </section>

      {canCancel && (
        <div className="px-4 mt-5">
          <Button
            variant="secondary"
            fullWidth
            loading={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            {tr(messages, 'orders.cancel')}
          </Button>
        </div>
      )}
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
