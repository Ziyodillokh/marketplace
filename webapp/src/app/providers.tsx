'use client';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { useTelegramInit } from '@/hooks/use-telegram';
import { useFlushOnUnload } from '@/hooks/use-track';
import { useRealtime } from '@/hooks/use-realtime';
import { useLocaleStore } from '@/stores/locale-store';
import { setApiLocale } from '@/lib/api';
import { ToastContainer } from '@/components/ui/toast';

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
