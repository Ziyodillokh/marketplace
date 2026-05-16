'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { OrderStatusBadge } from '@/components/shop/order-status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiListOrders } from '@/lib/api/endpoints';
import { useTrackOnMount } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { formatMoney, formatDateTime } from '@/lib/format';
import type { OrderStatus } from '@/lib/api/types';
import { cn } from '@/lib/cn';

type TabKey = 'active' | 'completed' | 'cancelled';
const TAB_STATUSES: Record<TabKey, OrderStatus[]> = {
  active: ['PENDING', 'CONFIRMED', 'ON_THE_WAY'],
  completed: ['DELIVERED'],
  cancelled: ['CANCELLED'],
};

export default function OrdersPage() {
  useTrackOnMount({ type: 'VIEW_ORDERS' });
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  const [tab, setTab] = useState<TabKey>('active');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: () => apiListOrders({ limit: 50 }),
  });

  const items = (data?.items ?? []).filter((o) => TAB_STATUSES[tab].includes(o.status));

  return (
    <div>
      <PageHeader title={tr(messages, 'orders.title')} />
      <div className="flex gap-2 px-4 py-3">
        {(Object.keys(TAB_STATUSES) as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'h-9 px-4 rounded-full text-sm font-medium',
              tab === t
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-white text-[var(--color-text-muted)] border border-[var(--color-border)]',
            )}
          >
            {tr(messages, `orders.tabs.${t}`)}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : items.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={48} />} title={tr(messages, 'orders.empty')} />
        ) : (
          items.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="block bg-white rounded-2xl border border-[var(--color-border)] p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">#{o.orderNumber}</span>
                <OrderStatusBadge status={o.status} locale={locale} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">{formatDateTime(o.createdAt, locale)}</p>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {o.previewImages.slice(0, 3).map((u, i) => (
                    <div key={i} className="relative h-10 w-10 rounded-lg overflow-hidden border-2 border-white bg-gray-100">
                      <Image src={u} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                  ))}
                  {o.itemsCount > 3 && (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 grid place-items-center text-xs font-semibold">
                      +{o.itemsCount - 3}
                    </div>
                  )}
                </div>
                <span className="font-bold text-[var(--color-primary)]">{formatMoney(o.total, locale)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
