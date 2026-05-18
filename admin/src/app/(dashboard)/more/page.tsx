'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import {
  BarChart3,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  Link2,
  LogOut,
  Megaphone,
  MessageCircle,
  Settings,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { apiLogout } from '@/lib/endpoints';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Item {
  href: string;
  icon: typeof Settings;
  label: string;
  superadminOnly?: boolean;
}

const ITEMS: Item[] = [
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/categories', icon: Layers, label: 'Kategoriyalar' },
  { href: '/promo-codes', icon: Tag, label: 'Promo kodlar' },
  { href: '/support', icon: MessageCircle, label: 'Support' },
  { href: '/banners', icon: ImageIcon, label: 'Bannerlar' },
  { href: '/broadcasts', icon: Megaphone, label: 'Xabarnomalar' },
  { href: '/related-rules', icon: Link2, label: 'Related rules' },
  { href: '/settings', icon: Settings, label: 'Sozlamalar' },
  { href: '/admins', icon: ShieldCheck, label: 'Adminlar', superadminOnly: true },
];

export default function MorePage() {
  const admin = useAuthStore((s) => s.admin);
  const logout = useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      setAccessToken(null);
      window.location.href = '/login';
    },
  });
  const visible = ITEMS.filter((i) => !i.superadminOnly || admin?.role === 'SUPERADMIN');

  return (
    <div>
      <PageHeader title="Boshqa" />

      <Card>
        <ul className="divide-y divide-[var(--color-border)]">
          {visible.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
                <span className="h-9 w-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center">
                  <it.icon size={18} />
                </span>
                <span className="flex-1 text-sm font-medium">{it.label}</span>
                <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
              </Link>
            </li>
          ))}
          <li>
            <button onClick={() => logout.mutate()} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 text-left">
              <span className="h-9 w-9 rounded-xl bg-rose-50 text-[var(--color-danger)] grid place-items-center">
                <LogOut size={18} />
              </span>
              <span className="flex-1 text-sm font-medium">Chiqish</span>
            </button>
          </li>
        </ul>
      </Card>
    </div>
  );
}
