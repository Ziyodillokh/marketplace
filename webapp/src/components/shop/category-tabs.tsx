'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiListCategories } from '@/lib/api/endpoints';
import { cn } from '@/lib/cn';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { track } from '@/hooks/use-track';

export function CategoryTabs({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  // Locale queryKey'ga ham qo'shildi — til o'zgarganda darhol yangi tarjima yuklanadi
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', 'root', locale],
    queryFn: () => apiListCategories({ onlyRoot: true }),
  });

  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackRef.current) return;
    const active = trackRef.current.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedId]);

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div ref={trackRef} className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-3">
      <Pill
        active={selectedId === null}
        onClick={() => {
          onSelect(null);
          track({ type: 'APPLY_FILTER', payload: { category: null } });
        }}
      >
        {tr(messages, 'common.all')}
      </Pill>
      {categories?.map((c) => (
        <Pill
          key={c.id}
          active={selectedId === c.id}
          onClick={() => {
            onSelect(c.id);
            track({ type: 'APPLY_FILTER', categoryId: c.id });
          }}
        >
          {c.title}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-active={active}
      onClick={onClick}
      className={cn(
        'whitespace-nowrap h-10 px-4 rounded-full text-sm font-medium border transition-colors shrink-0',
        active
          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
          : 'bg-white text-[var(--color-text)] border-[var(--color-border)]',
      )}
    >
      {children}
    </button>
  );
}
