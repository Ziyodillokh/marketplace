'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Field, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge, ORDER_STATUS_LABEL } from '@/components/order-status-badge';
import { apiGetAdminOrder, apiSendOrderMessage, apiUpdateOrderStatus } from '@/lib/endpoints';
import { formatDateTime, formatMoney } from '@/lib/format';
import { toast } from '@/stores/toast-store';
import type { OrderStatus } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const admin = useAuthStore((s) => s.admin);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiGetAdminOrder(id),
  });

  const updateStatus = useMutation({
    mutationFn: ({ status }: { status: OrderStatus }) => apiUpdateOrderStatus(id, status),
    onSuccess: (data) => {
      qc.setQueryData(['order', id], data);
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Status yangilandi');
    },
    onError: (err: Error) => toast.error(err.message),
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

  const nextStatuses = STATUS_FLOW[order.status];
  const canEdit = admin?.role === 'SUPERADMIN' || admin?.role === 'ADMIN' || admin?.role === 'MANAGER';

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
          <Card>
            <CardHeader title="Status" action={<OrderStatusBadge status={order.status} />} />
            {canEdit && nextStatuses.length > 0 && (
              <div className="p-4 flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === 'CANCELLED' ? 'danger' : 'primary'}
                    loading={updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ status: s })}
                  >
                    {ORDER_STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>
            )}
            {order.events.length > 0 && (
              <div className="px-4 pb-4">
                <h4 className="text-xs font-semibold text-[var(--color-text-muted)] mb-2">Timeline</h4>
                <ol className="space-y-2">
                  {order.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 text-sm">
                      <span className="inline-block h-2 w-2 mt-1.5 rounded-full bg-[var(--color-primary)]" />
                      <div className="flex-1">
                        <div className="font-medium">{ORDER_STATUS_LABEL[e.status]}</div>
                        {e.comment && <div className="text-xs text-[var(--color-text-muted)]">{e.comment}</div>}
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">{formatDateTime(e.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>

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
              <a
                href={`/users/${order.user.id}`}
                className="block mt-3 text-xs text-[var(--color-primary)] font-medium"
              >
                Foydalanuvchini ko&apos;rish →
              </a>
            </div>
          </Card>

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
                To&apos;lov: {order.paymentMethod === 'CARD_ON_DELIVERY' ? 'Karta (yetkazganda)' : 'Naqd (yetkazganda)'}
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
