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
import {
  apiGetMe,
  apiPublicSettings,
  apiUpdateMe,
  apiOrdersSummary,
  apiFavoritesSummary,
} from '@/lib/api/endpoints';
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
  const { data: ordersSummary } = useQuery({
    queryKey: ['orders-summary'],
    queryFn: apiOrdersSummary,
  });
  const { data: favSummary } = useQuery({
    queryKey: ['favorites-summary'],
    queryFn: apiFavoritesSummary,
  });

  const updateLang = useMutation({
    mutationFn: (language: Locale) => apiUpdateMe({ language }),
    onSuccess: (m) => qc.setQueryData(['me'], m),
  });

  const [langOpen, setLangOpen] = useState(false);

  const displayName =
    me?.firstName ?? tgUser?.first_name ?? me?.username ?? tr(messages, 'profile.guest');
  const subline = me?.username ? `@${me.username}` : '';
  const initials = (displayName ?? '?').slice(0, 1).toUpperCase();
  const avatarUrl = me?.photoUrl ?? tgUser?.photo_url;

  const ordersBadge = ordersSummary?.count ?? 0;
  const favBadge = favSummary?.count ?? 0;

  return (
    <div className="pb-6">
      <PageHeader title={tr(messages, 'profile.title')} />

      {/* Hero kartochka */}
      <section className="px-4 pt-4">
        <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] rounded-3xl p-5 text-white shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur grid place-items-center text-xl font-bold overflow-hidden ring-2 ring-white/30">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold truncate">{displayName}</p>
              {subline && <p className="text-sm text-white/85 truncate">{subline}</p>}
            </div>
          </div>

          {/* Stats rozetkalari — har row: icon · label (flex-1) · big bold count */}
          <div className="mt-4 grid grid-cols-1 gap-2">
            <Link
              href="/orders"
              className="bg-white/15 hover:bg-white/20 backdrop-blur rounded-2xl px-4 h-12 flex items-center gap-3 active:scale-[0.99] transition-all"
            >
              <span className="h-8 w-8 rounded-xl bg-white/20 grid place-items-center shrink-0">
                <ShoppingBag size={16} />
              </span>
              <span className="flex-1 text-sm font-medium">{tr(messages, 'profile.stats.orders')}</span>
              <span className="text-lg font-extrabold tabular-nums">{ordersBadge}</span>
              <ChevronRight size={16} className="text-white/60 -mr-1" />
            </Link>
            <Link
              href="/favorites"
              className="bg-white/15 hover:bg-white/20 backdrop-blur rounded-2xl px-4 h-12 flex items-center gap-3 active:scale-[0.99] transition-all"
            >
              <span className="h-8 w-8 rounded-xl bg-white/20 grid place-items-center shrink-0">
                <Heart size={16} />
              </span>
              <span className="flex-1 text-sm font-medium">{tr(messages, 'profile.stats.favorites')}</span>
              <span className="text-lg font-extrabold tabular-nums">{favBadge}</span>
              <ChevronRight size={16} className="text-white/60 -mr-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 1: Mening hisobim */}
      <section className="px-4 mt-4">
        <MenuCard>
          <MenuRow href="/orders" icon={<ShoppingBag size={20} />} label={tr(messages, 'profile.myOrders')} />
          <MenuRow href="/favorites" icon={<Heart size={20} />} label={tr(messages, 'profile.favorites')} />
          <MenuRow href="/promo-codes" icon={<Tag size={20} />} label={tr(messages, 'profile.promoCodes')} />
        </MenuCard>
      </section>

      {/* Section 2: Aloqa */}
      <section className="px-4 mt-3">
        <MenuCard>
          <MenuRow href="/support" icon={<HelpCircle size={20} />} label={tr(messages, 'profile.support')} />
          <MenuRow href="/about" icon={<Info size={20} />} label={tr(messages, 'profile.about')} />
          {settings?.store.phone && (
            <li>
              <a href={`tel:${settings.store.phone}`} className="w-full px-4 h-14 flex items-center gap-3">
                <span className="text-[var(--color-text-muted)]">
                  <Phone size={20} />
                </span>
                <span className="flex-1 text-sm font-medium">{tr(messages, 'profile.contact')}</span>
                <span className="text-sm text-[var(--color-text-muted)]">{settings.store.phone}</span>
                <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
              </a>
            </li>
          )}
        </MenuCard>
      </section>

      {/* Section 3: Sozlamalar */}
      <section className="px-4 mt-3">
        <MenuCard>
          <li>
            <button
              onClick={() => setLangOpen(true)}
              className="w-full px-4 h-14 flex items-center gap-3 text-left"
            >
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 via-white to-green-500 ring-1 ring-[var(--color-border)] grid place-items-center text-[10px]">
                <Globe2 size={14} className="text-gray-700" />
              </span>
              <span className="flex-1 text-sm font-medium">{tr(messages, 'profile.language')}</span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {locale === 'ru' ? tr(messages, 'language.ru') : tr(messages, 'language.uz')}
              </span>
              <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
            </button>
          </li>
        </MenuCard>
      </section>

      <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">v 1.0.0</p>

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

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <ul className="bg-white rounded-2xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden">
      {children}
    </ul>
  );
}

function MenuRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li>
      <Link href={href} className="w-full px-4 h-14 flex items-center gap-3 active:bg-gray-50">
        <span className="text-[var(--color-text-muted)]">{icon}</span>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
      </Link>
    </li>
  );
}
