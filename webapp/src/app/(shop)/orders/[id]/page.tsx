'use client';

import { use, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, Clock, Upload } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiCancelOrder, apiGetOrder, apiPublicSettings, apiUploadOrderReceipt } from '@/lib/api/endpoints';
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

  const { data: pub } = useQuery({ queryKey: ['public-settings'], queryFn: apiPublicSettings });
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadReceipt = useMutation({
    mutationFn: (file: File) => apiUploadOrderReceipt(id, file),
    onSuccess: () => {
      haptic('success');
      toast.success(locale === 'ru' ? 'Чек отправлен на проверку' : 'Chek tekshiruvga yuborildi');
      qc.invalidateQueries({ queryKey: ['order', id] });
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

  // Oldindan to'lov (chek): qisman bo'lsa qolgani yetkazib berishda to'lanadi
  const prepay = order.prepayAmount || 0;
  const isPartialPrepay = order.paymentMethod === 'CARD_TRANSFER' && prepay > 0 && prepay < order.total;
  const remaining = order.total - prepay;

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

      {order.paymentMethod === 'CARD_TRANSFER' && (
        <section className="px-4 pt-1 pb-3">
          {order.prepaidAt ? (
            <div className="rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-3 flex items-start gap-2">
              <CheckCircle2 size={20} className="text-[var(--color-success)] shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-success)]">
                  {order.paidAt
                    ? locale === 'ru'
                      ? 'Оплата подтверждена'
                      : "To'lov tasdiqlandi"
                    : locale === 'ru'
                      ? 'Предоплата подтверждена'
                      : "Oldindan to'lov tasdiqlandi"}
                </p>
                {!order.paidAt && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {locale === 'ru'
                      ? `Остаток ${formatMoney(remaining, locale)} — при доставке`
                      : `Qolgani ${formatMoney(remaining, locale)} — yetkazib berishda`}
                  </p>
                )}
              </div>
            </div>
          ) : order.paymentReceiptUrl ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-3 flex items-center gap-3">
              <Clock size={20} className="text-amber-500 shrink-0" />
              <p className="text-sm text-[var(--color-text-muted)]">
                {locale === 'ru'
                  ? 'Чек отправлен. Ожидайте подтверждения продавца.'
                  : "Chek yuborildi. Sotuvchi tasdiqlashini kuting."}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[var(--color-primary)]" />
                <p className="text-sm font-semibold">
                  {locale === 'ru' ? 'Оплата картой' : "Karta orqali to'lov"}
                </p>
              </div>
              {pub?.cardPayment && (
                <div className="rounded-xl bg-white border border-[var(--color-border)] p-3">
                  <p className="font-mono text-base font-semibold tracking-wide">{pub.cardPayment.number}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{pub.cardPayment.holder}</p>
                </div>
              )}
              {prepay > 0 && (
                <div className="rounded-xl bg-white border border-[var(--color-border)] p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">
                      {isPartialPrepay
                        ? locale === 'ru'
                          ? 'К оплате сейчас'
                          : "Hozir to'lash"
                        : locale === 'ru'
                          ? 'К оплате'
                          : "To'lash"}
                    </span>
                    <span className="font-semibold text-[var(--color-primary)]">{formatMoney(prepay, locale)}</span>
                  </div>
                  {isPartialPrepay && (
                    <div className="flex justify-between mt-1">
                      <span className="text-[var(--color-text-muted)]">
                        {locale === 'ru' ? 'При доставке' : 'Yetkazib berishda'}
                      </span>
                      <span className="font-medium">{formatMoney(remaining, locale)}</span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-[var(--color-text-muted)]">
                {locale === 'ru'
                  ? 'Переведите сумму на карту и загрузите чек (скриншот).'
                  : "Kartaga pul o'tkazib, chek (skrinshot)ni yuklang."}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadReceipt.mutate(f);
                }}
              />
              <Button
                fullWidth
                loading={uploadReceipt.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} /> {locale === 'ru' ? 'Загрузить чек' : 'Chek yuklash'}
              </Button>
            </div>
          )}
        </section>
      )}

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
        {isPartialPrepay && (
          <>
            <Row
              label={locale === 'ru' ? 'Предоплата (чек)' : "Oldindan (chek)"}
              value={formatMoney(prepay, locale)}
            />
            <Row
              label={locale === 'ru' ? 'При доставке' : 'Yetkazib berishda'}
              value={formatMoney(remaining, locale)}
            />
          </>
        )}
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
