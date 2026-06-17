'use client';

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { useTelegramInit } from '@/hooks/use-telegram';
import { useFlushOnUnload } from '@/hooks/use-track';
import { useRealtime } from '@/hooks/use-realtime';
import { useLocaleStore } from '@/stores/locale-store';
import { setApiLocale } from '@/lib/api';
import { apiPublicSettings } from '@/lib/api/endpoints';
import { ToastContainer } from '@/components/ui/toast';

/** Hex rangni biroz to'qlashtiradi (hover holati uchun). */
function darken(hex: string, amt = 0.15): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amt)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amt)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amt)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Katalog tez-tez o'zgarmaydi — uzunroq staleTime bilan sahifalar
            // qayta ochilganda darhol (keshdan) ko'rinadi, tarmoqni kutmaydi.
            staleTime: 5 * 60_000,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
            retryDelay: 500,
          },
        },
      }),
  );

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <QueryClientProvider client={client}>
        <InnerInit>{children}</InnerInit>
        <ToastContainer />
      </QueryClientProvider>
    </>
  );
}

function InnerInit({ children }: { children: React.ReactNode }) {
  useTelegramInit();
  useFlushOnUnload();
  useRealtime();

  const qc = useQueryClient();
  const locale = useLocaleStore((s) => s.locale);
  const prevLocale = useRef(locale);

  // Do'kon brendi — maxsus rangni storefront temasiga qo'llaymiz
  const { data: pub } = useQuery({ queryKey: ['public-settings'], queryFn: apiPublicSettings });
  useEffect(() => {
    const color = pub?.store?.primaryColor;
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', color);
      root.style.setProperty('--color-primary-hover', darken(color));
    }
  }, [pub]);

  useEffect(() => {
    setApiLocale(locale);
    document.documentElement.lang = locale;
    // Til o'zgarganda — barcha cached so'rovlarni qaytadan oling
    if (prevLocale.current !== locale) {
      // resetQueries — cache'ni tozalaydi va active queryni qaytadan fetch qiladi
      // (refetchOnMount:false bo'lgani uchun invalidateQueries yetmaydi)
      void qc.resetQueries();
      prevLocale.current = locale;
    }
  }, [locale, qc]);

  return <>{children}</>;
}
