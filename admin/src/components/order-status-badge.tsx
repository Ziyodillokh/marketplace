import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/types';

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Yangi',
  CONFIRMED: 'Tasdiqlangan',
  ON_THE_WAY: "Yo'lda",
  DELIVERED: 'Yetkazilgan',
  CANCELLED: 'Bekor qilingan',
};

const TONES: Record<OrderStatus, 'amber' | 'blue' | 'indigo' | 'green' | 'red'> = {
  PENDING: 'amber',
  CONFIRMED: 'blue',
  ON_THE_WAY: 'indigo',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}

export const ORDER_STATUS_LABEL = LABELS;
