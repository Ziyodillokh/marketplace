'use client';

import { useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { apiPublicPromos } from '@/lib/api/endpoints';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { formatMoney, formatDate } from '@/lib/format';
import { toast } from '@/stores/toast-store';
import { haptic } from '@/lib/telegram';

export default function PromoCodesPage() {
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ['public-promos'],
    queryFn: apiPublicPromos,
  });

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      haptic('success');
      toast.success(`${code} ✓`);
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <PageHeader title={tr(messages, 'promo.title')} />
      <div className="px-4 py-4 space-y-3">
        <p className="text-sm text-[var(--color-text-muted)]">{tr(messages, 'promo.publicHint')}</p>
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : promos.length === 0 ? (
          <EmptyState icon={<Tag size={48} />} title={tr(messages, 'promo.title')} />
        ) : (
          promos.map((p) => (
            <button
              key={p.id}
              onClick={() => copy(p.code)}
              className="w-full text-left bg-white rounded-2xl border border-dashed border-[var(--color-primary)] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[var(--color-primary)]">{p.code}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {p.type === 'PERCENT' ? `−${p.value}%` : `−${formatMoney(p.value, locale)}`}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                {locale === 'ru' ? p.descriptionRu ?? '' : p.descriptionUz ?? ''}
              </p>
              {p.expiresAt && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  ⏳ {formatDate(p.expiresAt, locale)}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
