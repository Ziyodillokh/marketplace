'use client';

import { useState } from 'react';
import { Check, Package, Truck, CheckCircle2, X, Clock, ChevronRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUpdateOrderStatus } from '@/lib/endpoints';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/stores/toast-store';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/cn';

const STATUSES: Array<{
  status: OrderStatus;
  label: string;
  icon: typeof Check;
  tone: string;
}> = [
  { status: 'PENDING', label: 'Yangi', icon: Clock, tone: 'amber' },
  { status: 'CONFIRMED', label: 'Tasdiqlangan', icon: Check, tone: 'blue' },
  { status: 'ON_THE_WAY', label: "Yo'lda", icon: Truck, tone: 'indigo' },
  { status: 'DELIVERED', label: 'Yetkazilgan', icon: CheckCircle2, tone: 'green' },
];

const FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ON_THE_WAY', 'CANCELLED'],
  ON_THE_WAY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const TONE_BG: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
  gray: 'bg-gray-100 text-gray-500 border-gray-200',
};

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  canEdit: boolean;
}

export function OrderStatusChanger({ orderId, currentStatus, canEdit }: Props) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrderStatus | null>(null);
  const [comment, setComment] = useState('');

  const update = useMutation({
    mutationFn: () => apiUpdateOrderStatus(orderId, targetStatus!, comment || undefined),
    onSuccess: (data) => {
      qc.setQueryData(['order', orderId], data);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Status yangilandi');
      setPickerOpen(false);
      setComment('');
      setTargetStatus(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const currentIdx = STATUSES.findIndex((s) => s.status === currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';
  const nextStatuses = FLOW[currentStatus];

  return (
    <Card>
      <CardHeader title="Buyurtma holati" />
      <div className="p-4">
        {/* Timeline */}
        <div className="relative mb-4">
          <div className="flex items-center justify-between gap-1">
            {STATUSES.map((s, i) => {
              const reached = !isCancelled && i <= currentIdx;
              const isCurrent = !isCancelled && i === currentIdx;
              const Icon = s.icon;
              return (
                <div key={s.status} className="flex-1 flex flex-col items-center relative">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-full grid place-items-center border-2 transition-all',
                      reached
                        ? TONE_BG[s.tone]
                        : 'bg-white text-gray-300 border-gray-200',
                      isCurrent && 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-110',
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <span className={cn('text-[10px] mt-1.5 font-medium text-center', reached ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]')}>
                    {s.label}
                  </span>
                  {i < STATUSES.length - 1 && (
                    <div
                      className={cn(
                        'absolute top-[18px] left-[calc(50%+18px)] right-[calc(-50%+18px)] h-0.5',
                        reached && i < currentIdx ? 'bg-[var(--color-primary)]' : 'bg-gray-200',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {isCancelled && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-sm font-medium text-center flex items-center justify-center gap-2">
              <X size={16} /> Bekor qilingan
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canEdit && nextStatuses.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {nextStatuses.map((s) => {
              const config = STATUSES.find((x) => x.status === s);
              const isCancel = s === 'CANCELLED';
              return (
                <button
                  key={s}
                  onClick={() => {
                    setTargetStatus(s);
                    setPickerOpen(true);
                  }}
                  className={cn(
                    'h-11 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors',
                    isCancel
                      ? 'bg-rose-50 text-[var(--color-danger)] hover:bg-rose-100 border border-rose-200'
                      : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
                  )}
                >
                  {isCancel ? <X size={14} /> : <ChevronRight size={14} />}
                  {isCancel ? 'Bekor qilish' : config?.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setComment('');
          setTargetStatus(null);
        }}
        title={`Statusni "${STATUSES.find((s) => s.status === targetStatus)?.label ?? 'Bekor qilingan'}" ga o'zgartirish`}
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Buyurtma statusi o&apos;zgaradi va mijozga bot orqali xabar yuboriladi.
          </p>
          <Field label="Izoh (ixtiyoriy)">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Mijozga sabab yoki qo'shimcha ma'lumot..."
              rows={3}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              fullWidth
              variant={targetStatus === 'CANCELLED' ? 'danger' : 'primary'}
              loading={update.isPending}
              onClick={() => update.mutate()}
            >
              Tasdiqlash
            </Button>
            <Button variant="secondary" onClick={() => setPickerOpen(false)}>
              Bekor
            </Button>
          </div>
        </div>
      </Sheet>
    </Card>
  );
}
