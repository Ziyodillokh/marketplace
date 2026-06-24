import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sellio Admin',
  description: "Sellio — Telegram do'kon boshqaruvi",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}  
