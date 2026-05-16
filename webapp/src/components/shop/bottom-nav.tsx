'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGetCartSummary, apiFavoritesSummary } from '@/lib/api/endpoints';
import { cn } from '@/lib/cn';
import { useLocaleStore } from '@/stores/locale-store';
import { tr, getMessages } from '@/i18n';

const items = [
  { href: '/', label: 'catalog', icon: LayoutGrid, isActive: (p: string) => p === '/' || p.startsWith('/category') || p.startsWith('/catalog') || p.startsWith('/product') || p.startsWith('/search') },
  { href: '/cart', label: 'cart', icon: ShoppingCart, isActive: (p: string) => p.startsWith('/cart') },
  { href: '/favorites', label: 'favorites', icon: Heart, isActive: (p: string) => p.startsWith('/favorites') },
  { href: '/profile', label: 'profile', icon: User, isActive: (p: string) => p.startsWith('/profile') || p.startsWith('/orders') || p.startsWith('/support') || p.startsWith('/promo-codes') || p.startsWith('/about') },
];

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: cartSummary } = useQuery({
    queryKey: ['cart-summary'],
    queryFn: apiGetCartSummary,
    staleTime: 30_000,
  });
  const { data: favCount } = useQuery({
    queryKey: ['favorites-summary'],
    queryFn: apiFavoritesSummary,
    staleTime: 30_000,
  });

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {items.map((it) => {
          const active = it.isActive(pathname);
          const badge =
            it.label === 'cart'
              ? cartSummary?.count
              : it.label === 'favorites'
                ? favCount?.count
                : undefined;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 relative',
                  active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]',
                )}
              >
                <div className="relative">
                  <it.icon size={22} />
                  {badge && badge > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-danger)] text-white text-[10px] font-bold grid place-items-center">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] font-medium">{tr(messages, `nav.${it.label}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
