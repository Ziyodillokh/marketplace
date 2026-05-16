import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/lib/api/types';
import type { Locale } from '@/i18n';
import { getMessages, tr } from '@/i18n';

export function OrderStatusBadge({ status, locale }: { status: OrderStatus; locale: Locale }) {
  const messages = getMessages(locale);
  const colors: Record<OrderStatus, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    CONFIRMED: 'bg-blue-50 text-blue-700',
    ON_THE_WAY: 'bg-indigo-50 text-indigo-700',
    DELIVERED: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={cn('inline-block px-2.5 py-1 rounded-full text-xs font-medium', colors[status])}>
      {tr(messages, `orders.status.${status}`)}
    </span>
  );
}
