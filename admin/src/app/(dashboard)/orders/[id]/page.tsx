'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, User, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Field, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge, ORDER_STATUS_LABEL } from '@/components/order-status-badge';
import { OrderStatusChanger } from '@/components/orders/status-changer';
import { LocationPreview } from '@/components/orders/location-preview';
import { apiGetAdminOrder, apiSendOrderMessage } from '@/lib/endpoints';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { PaymentMethod } from '@/lib/types';
import { toast } from '@/stores/toast-store';
import { useAuthStore } from '@/stores/auth-store';

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: 'Naqd (yetkazganda)',
  CARD_ON_DELIVERY: 'Karta (yetkazganda)',
  PAYME: 'Payme (onlayn)',
  CLICK: 'Click (onlayn)',
  CARD_TRANSFER: "Karta orqali (o'tkazma)",
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const admin = useAuthStore((s) => s.admin);
  const router = useRouter();
  const [msgOpen, setMsgOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiGetAdminOrder(id),
  });

  const sendMessage = useMutation({
    mutationFn: () => apiSendOrderMessage(id, msg),
    onSuccess: () => {
      toast.success('Xabar yuborildi');
      setMsg('');
      setMsgOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !order) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const canEdit = admin?.role === 'SUPERADMIN' || admin?.role === 'ADMIN' || admin?.role === 'MANAGER';

  const userActions: { key: string; icon: LucideIcon; label: string; onClick: () => void }[] = [
    { key: 'msg', icon: MessageSquare, label: 'Yozish', onClick: () => setMsgOpen(true) },
    ...(order.user.username
      ? [
          {
            key: 'tg',
            icon: Send,
            label: 'Telegram',
            onClick: () =>
              order.user.username &&
              window.open(`https://t.me/${order.user.username}`, '_blank'),
          },
        ]
      : []),
    { key: 'profile', icon: User, label: 'Profil', onClick: () => router.push(`/users/${order.user.id}`) },
  ];

  return (
    <div>
      <PageHeader
        title={`#${order.orderNumber}`}
        description={formatDateTime(order.createdAt)}
        backHref="/orders"
        rightSlot={
          <Button variant="secondary" size="sm" onClick={() => setMsgOpen(true)}>
            <MessageSquare size={14} /> Xabar
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <OrderStatusChanger
            orderId={order.id}
            currentStatus={order.status}
            canEdit={canEdit}
          />

          {order.events.length > 0 && (
            <Card>
              <CardHeader title="Status tarixi" />
              <div className="px-4 py-3">
                <ol className="space-y-2">
                  {order.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 text-sm">
                      <span className="inline-block h-2 w-2 mt-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">{ORDER_STATUS_LABEL[e.status]}</div>
                        {e.comment && <div className="text-xs text-[var(--color-text-muted)]">{e.comment}</div>}
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)] shrink-0">{formatDateTime(e.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Mahsulotlar" />
            <ul className="divide-y divide-[var(--color-border)]">
              {order.items.map((i) => (
                <li key={i.id} className="p-3 flex items-center gap-3">
                  {i.imageUrl ? (
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <Image src={i.imageUrl} alt="" fill className="object-cover" sizes="56px" />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{i.titleUz}</p>
                    {i.variantLabel && <p className="text-xs text-[var(--color-text-muted)]">{i.variantLabel}</p>}
                    <p className="text-xs text-[var(--color-text-muted)]">× {i.quantity}</p>
                  </div>
                  <p className="font-semibold text-sm whitespace-nowrap">{formatMoney(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={<><User size={14} className="inline mr-1" /> Mijoz</>} />
            <div className="p-4 space-y-1.5 text-sm">
              <p>
                <span className="text-[var(--color-text-muted)]">Ism:</span> {order.receiverName}
              </p>
              <p>
                <span className="text-[var(--color-text-muted)]">Telefon:</span>{' '}
                <a href={`tel:${order.receiverPhone}`} className="text-[var(--color-primary)]">{order.receiverPhone}</a>
              </p>
              <p>
                <span className="text-[var(--color-text-muted)]">Manzil:</span> {order.address}
              </p>
              {order.note && (
                <p>
                  <span className="text-[var(--color-text-muted)]">Izoh:</span> {order.note}
                </p>
              )}
              {order.user.username && (
                <p>
                  <span className="text-[var(--color-text-muted)]">Telegram:</span>{' '}
                  <a
                    href={`https://t.me/${order.user.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-primary)]"
                  >
                    @{order.user.username}
                  </a>
                </p>
              )}
              <div className="pt-2">
                <OrderStatusBadge status={order.status} />
              </div>
              <div
                className={`grid ${userActions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-3 mt-3 border-t border-[var(--color-border)]`}
              >
                {userActions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={a.onClick}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] py-2.5 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]"
                    >
                      <Icon size={18} />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {order.latitude != null && order.longitude != null && (
            <LocationPreview
              latitude={order.latitude}
              longitude={order.longitude}
              address={order.address}
            />
          )}

          <Card>
            <CardHeader title="Hisob" />
            <div className="p-4 space-y-2 text-sm">
              <Row label="Mahsulotlar" value={formatMoney(order.subtotal)} />
              {order.discountAmount > 0 && (
                <Row
                  label={`Chegirma${order.promoSnapshot ? ` (${order.promoSnapshot})` : ''}`}
                  value={`−${formatMoney(order.discountAmount)}`}
                  className="text-[var(--color-success)]"
                />
              )}
              <Row
                label="Yetkazib berish"
                value={order.deliveryFee === 0 ? 'Bepul' : formatMoney(order.deliveryFee)}
              />
              <div className="pt-2 border-t border-[var(--color-border)]">
                <Row label="Jami" value={formatMoney(order.total)} className="text-base font-bold text-[var(--color-primary)]" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] pt-2">
                To&apos;lov: {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Sheet open={msgOpen} onClose={() => setMsgOpen(false)} title="Mijozga xabar yuborish">
        <Field label="Xabar matni">
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} placeholder="Salom! Buyurtmangiz..." />
        </Field>
        <Button
          className="mt-4"
          fullWidth
          loading={sendMessage.isPending}
          disabled={!msg.trim()}
          onClick={() => sendMessage.mutate()}
        >
          Bot orqali yuborish
        </Button>
      </Sheet>
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
