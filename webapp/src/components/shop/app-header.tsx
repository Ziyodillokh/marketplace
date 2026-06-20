'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Info, Search } from 'lucide-react';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { apiPublicSettings } from '@/lib/api/endpoints';

export function AppHeader({ title }: { title?: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  // Paid tariflarda (branded) do'kon o'z nomini ko'rsatadi; Free'da "Marketplace"
  const { data: pub } = useQuery({ queryKey: ['public-settings'], queryFn: apiPublicSettings });
  const heading =
    title ??
    (pub?.store?.branded && pub.store.name ? pub.store.name : tr(messages, 'appName'));
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-bg)] border-b border-[var(--color-border)]/40 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-bg)]/85">
      <div className="px-4 h-14 flex items-center justify-between gap-3 max-w-md mx-auto">
        <Link
          href="/about"
          aria-label="About"
          className="h-9 w-9 rounded-full bg-white border border-[var(--color-border)] grid place-items-center"
        >
          <Info size={18} className="text-[var(--color-text-muted)]" />
        </Link>
        <h1 className="text-base font-bold flex-1 text-center truncate px-1">{heading}</h1>
        <Link
          href="/search"
          aria-label="Search"
          className="h-9 w-9 rounded-full bg-white border border-[var(--color-border)] grid place-items-center"
        >
          <Search size={18} className="text-[var(--color-text-muted)]" />
        </Link>
      </div>
    </header>
  );
}
