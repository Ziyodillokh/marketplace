'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge, ORDER_STATUS_LABEL } from '@/components/order-status-badge';
import { apiListAdminOrders } from '@/lib/endpoints';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/cn';

const STATUSES: Array<OrderStatus | 'all'> = ['all', 'PENDING', 'CONFIRMED', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED'];

export default function OrdersPage() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ['orders', { status, q: debouncedSearch }],
    queryFn: ({ pageParam }) =>
      apiListAdminOrders({
        status: status === 'all' ? undefined : status,
        q: debouncedSearch || undefined,
        cursor: pageParam,
        limit: 30,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [query]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <PageHeader title="Buyurtmalar" description={`Jami: ${items.length}+`} />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order # / ism / telefon"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar -mx-4 px-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              'h-9 px-3 rounded-full text-xs font-medium whitespace-nowrap border',
              status === s
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)]',
            )}
          >
            {s === 'all' ? 'Hammasi' : ORDER_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">Buyurtmalar yo&apos;q</div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="bg-white rounded-2xl border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">#{o.orderNumber}</span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">{formatDateTime(o.createdAt)}</p>
                <div className="text-sm mb-2">
                  <span className="text-[var(--color-text-muted)]">Mijoz:</span> {o.receiverName} · {o.receiverPhone}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {o.previewImages.slice(0, 3).map((u, i) => (
                      <div key={i} className="relative h-9 w-9 rounded-lg overflow-hidden border-2 border-white bg-gray-100">
                        <Image src={u} alt="" fill className="object-cover" sizes="36px" />
                      </div>
                    ))}
                    {o.itemsCount > 3 && (
                      <div className="h-9 w-9 rounded-lg bg-gray-100 grid place-items-center text-xs font-semibold">
                        +{o.itemsCount - 3}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-[var(--color-primary)]">{formatMoney(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}
