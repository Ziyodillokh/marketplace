'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  BarChart3,
  Tag,
  MessageCircle,
  Image as ImageIcon,
  Link2,
  Megaphone,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { apiLogout } from '@/lib/endpoints';
import { setAccessToken } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Brand } from '@/components/brand';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  superadminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Buyurtmalar', icon: ShoppingCart },
  { href: '/products', label: 'Mahsulotlar', icon: Package },
  { href: '/categories', label: 'Kategoriyalar', icon: Layers },
  { href: '/users', label: 'Foydalanuvchilar', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/promo-codes', label: 'Promo kodlar', icon: Tag },
  { href: '/support', label: 'Support', icon: MessageCircle },
  { href: '/banners', label: 'Bannerlar', icon: ImageIcon },
  { href: '/broadcasts', label: 'Xabarnomalar', icon: Megaphone },
  { href: '/related-rules', label: 'Related rules', icon: Link2 },
  { href: '/settings', label: 'Sozlamalar', icon: Settings },
  { href: '/admins', label: 'Adminlar', icon: ShieldCheck, superadminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const admin = useAuthStore((s) => s.admin);

  const logout = useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      setAccessToken(null);
      window.location.href = '/login';
    },
  });

  const visibleNav = NAV.filter((it) => !it.superadminOnly || admin?.role === 'SUPERADMIN');

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[var(--color-border)] bg-white shrink-0 h-dvh sticky top-0">
      <div className="px-5 h-14 flex items-center border-b border-[var(--color-border)]">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {visibleNav.map((it) => {
            const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    active
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'text-[var(--color-text)] hover:bg-gray-50',
                  )}
                >
                  <it.icon size={18} />
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center font-semibold text-sm">
            {admin?.fullName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{admin?.fullName}</p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{admin?.role}</p>
          </div>
        </div>
        <button
          onClick={() => logout.mutate()}
          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:bg-gray-50"
        >
          <LogOut size={16} /> Chiqish
        </button>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === '/';
  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="px-3 h-14 flex items-center gap-1">
        {!isRoot && (
          <button
            onClick={() => router.back()}
            aria-label="Orqaga"
            className="h-9 w-9 grid place-items-center rounded-full text-[var(--color-text)] hover:bg-gray-100 active:scale-95 transition"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <Brand />
      </div>
    </header>
  );
}

const BOTTOM_NAV: NavItem[] = [
  { href: '/', label: 'Bosh', icon: LayoutDashboard },
  { href: '/orders', label: 'Orderlar', icon: ShoppingCart },
  { href: '/products', label: 'Maxsulot', icon: Package },
  { href: '/users', label: 'Userlar', icon: Users },
  { href: '/more', label: 'Boshqa', icon: Layers },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/85 backdrop-blur-md border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5 px-1 pt-1">
        {BOTTOM_NAV.map((it) => {
          const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 mx-1 rounded-xl transition-colors',
                  active
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'text-[var(--color-text-muted)] active:bg-gray-100',
                )}
              >
                <it.icon size={20} />
                <span className="text-[10px] font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
