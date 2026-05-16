'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Input, Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { apiListAdminUsers } from '@/lib/endpoints';
import { formatRelative } from '@/lib/format';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [blocked, setBlocked] = useState<'all' | 'yes' | 'no'>('all');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ['admin-users', { q: debounced, blocked }],
    queryFn: ({ pageParam }) =>
      apiListAdminUsers({
        q: debounced || undefined,
        isBlocked: blocked === 'all' ? undefined : blocked === 'yes',
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
      <PageHeader title="Foydalanuvchilar" description={`${items.length}+ ko'rsatildi`} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 max-w-2xl">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Telegram ID / @username / ism / telefon" className="pl-9" />
        </div>
        <Select value={blocked} onChange={(e) => setBlocked(e.target.value as 'all' | 'yes' | 'no')}>
          <option value="all">Hammasi</option>
          <option value="no">Faol</option>
          <option value="yes">Bloklangan</option>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">Topilmadi</div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((u) => (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                className="bg-white rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors p-3 flex items-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center font-semibold overflow-hidden shrink-0">
                  {u.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (u.firstName ?? u.username ?? '?').slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {u.firstName ?? u.username ?? `ID ${u.telegramId}`}
                    </p>
                    {u.isBlocked && <Badge tone="red">Blok</Badge>}
                  </div>
                  {u.username && <p className="text-xs text-[var(--color-text-muted)] truncate">@{u.username}</p>}
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-0.5">
                    <span>📦 {u.ordersCount}</span>
                    <span>🛒 {u.cartCount}</span>
                    <span>❤️ {u.favoritesCount}</span>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{formatRelative(u.lastSeenAt)}</span>
              </Link>
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}
