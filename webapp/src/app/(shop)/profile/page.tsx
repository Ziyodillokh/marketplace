'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Heart,
  ShoppingBag,
  Tag,
  Globe2,
  HelpCircle,
  Info,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { Sheet } from '@/components/ui/sheet';
import { apiGetMe, apiPublicSettings, apiUpdateMe } from '@/lib/api/endpoints';
import { useTelegramBackButton, useTelegramUser } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { cn } from '@/lib/cn';
import type { Locale } from '@/i18n';

export default function ProfilePage() {
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const messages = getMessages(locale);
  const tgUser = useTelegramUser();
  const qc = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: apiGetMe });
  const { data: settings } = useQuery({ queryKey: ['public-settings'], queryFn: apiPublicSettings });

  const updateLang = useMutation({
    mutationFn: (language: Locale) => apiUpdateMe({ language }),
    onSuccess: (m) => {
      qc.setQueryData(['me'], m);
    },
  });

  const [langOpen, setLangOpen] = useState(false);

  const displayName =
    me?.firstName ?? tgUser?.first_name ?? me?.username ?? tr(messages, 'profile.guest');
  const subline = me?.username ? `@${me.username}` : '';
  const initials = (displayName ?? '?').slice(0, 1).toUpperCase();
  const avatarUrl = me?.photoUrl ?? tgUser?.photo_url;

  return (
    <div>
      <PageHeader title={tr(messages, 'profile.title')} />

      <section className="px-4 py-4">
        <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-[var(--color-border)]">
          <div className="h-14 w-14 rounded-full bg-gray-100 grid place-items-center text-lg font-bold overflow-hidden">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            {subline && <p className="text-sm text-[var(--color-text-muted)] truncate">{subline}</p>}
          </div>
        </div>
      </section>

      <nav className="px-4">
        <ul className="bg-white rounded-2xl border border-[var(--color-border)] divide-y overflow-hidden">
          <Row href="/orders" icon={<ShoppingBag size={18} />} label={tr(messages, 'profile.myOrders')} />
          <Row href="/favorites" icon={<Heart size={18} />} label={tr(messages, 'profile.favorites')} />
          <Row href="/promo-codes" icon={<Tag size={18} />} label={tr(messages, 'profile.promoCodes')} />
          <li>
            <button
              onClick={() => setLangOpen(true)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left"
            >
              <Globe2 size={18} className="text-[var(--color-text-muted)]" />
              <span className="flex-1 text-sm font-medium">{tr(messages, 'profile.language')}</span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {locale === 'ru' ? tr(messages, 'language.ru') : tr(messages, 'language.uz')}
              </span>
              <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
            </button>
          </li>
          <Row href="/support" icon={<HelpCircle size={18} />} label={tr(messages, 'profile.support')} />
          <Row href="/about" icon={<Info size={18} />} label={tr(messages, 'profile.about')} />
          {settings?.store.phone && (
            <li>
              <a href={`tel:${settings.store.phone}`} className="w-full px-4 py-3 flex items-center gap-3">
                <Phone size={18} className="text-[var(--color-text-muted)]" />
                <span className="flex-1 text-sm font-medium">{tr(messages, 'profile.contact')}</span>
                <span className="text-sm text-[var(--color-text-muted)]">{settings.store.phone}</span>
              </a>
            </li>
          )}
        </ul>
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">v 1.0.0</p>
      </nav>

      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={tr(messages, 'language.title')}>
        <div className="space-y-2 py-2">
          {(['uz', 'ru'] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => {
                setLocale(lng);
                updateLang.mutate(lng);
                setLangOpen(false);
              }}
              className={cn(
                'w-full h-12 px-4 rounded-2xl border text-left',
                locale === lng
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white border-[var(--color-border)]',
              )}
            >
              {lng === 'uz' ? "🇺🇿 O'zbekcha" : '🇷🇺 Русский'}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function Row({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <li>
      <Link href={href} className="w-full px-4 py-3 flex items-center gap-3">
        <span className="text-[var(--color-text-muted)]">{icon}</span>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
      </Link>
    </li>
  );
}
