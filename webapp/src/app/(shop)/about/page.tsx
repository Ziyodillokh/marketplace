'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shop/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { apiPublicSettings } from '@/lib/api/endpoints';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';

export default function AboutPage() {
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-settings'],
    queryFn: apiPublicSettings,
  });

  return (
    <div>
      <PageHeader title={tr(messages, 'about.title')} />
      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : isError || !settings ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 text-center space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              {locale === 'ru' ? 'Не удалось загрузить' : "Yuklab bo'lmadi"}
            </p>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              {locale === 'ru' ? 'Повторить' : 'Qaytadan urinish'}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 space-y-2 text-sm">
            <h2 className="text-lg font-bold">{settings.store.name}</h2>
            {settings.store.about && (
              <p className="text-[var(--color-text-muted)] whitespace-pre-line">{settings.store.about}</p>
            )}
            {settings.store.address && (
              <p>
                <span className="text-[var(--color-text-muted)]">Manzil: </span>
                {settings.store.address}
              </p>
            )}
            {settings.store.workingHours && (
              <p>
                <span className="text-[var(--color-text-muted)]">Ish vaqti: </span>
                {settings.store.workingHours}
              </p>
            )}
            {settings.store.phone && (
              <p>
                <span className="text-[var(--color-text-muted)]">Telefon: </span>
                <a href={`tel:${settings.store.phone}`} className="text-[var(--color-primary)]">
                  {settings.store.phone}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
