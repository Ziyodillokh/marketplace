'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useTelegramInit } from '@/hooks/use-telegram';
import { useFlushOnUnload } from '@/hooks/use-track';
import { useLocaleStore } from '@/stores/locale-store';
import { setApiLocale } from '@/lib/api';
import { ToastContainer } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            retry: 1,
            retryDelay: 500,
          },
        },
      }),
  );

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
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
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    setApiLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return <>{children}</>;
}
