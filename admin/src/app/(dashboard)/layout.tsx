'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { MobileBottomNav, MobileTopBar, Sidebar } from '@/components/layout/sidebar';
import { TelegramBackButton } from '@/components/telegram-back-button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { admin, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized && !admin) router.replace('/login');
  }, [initialized, admin, router]);

  if (!admin) return null;

  return (
    <div className="min-h-dvh flex">
      <TelegramBackButton />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar />
        <main className="flex-1 px-4 md:px-6 py-5 md:py-6 pb-24 md:pb-6 overflow-x-hidden">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
