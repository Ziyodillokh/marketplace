import type { NextConfig } from 'next';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      // Proxy all /api/* requests to backend (same-origin, no CORS, no mixed-content)
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      // Proxy uploads
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
      // Telegram webhook (in case we ever set webhook to webapp domain)
      { source: '/telegram/:path*', destination: `${BACKEND_URL}/telegram/:path*` },
      // Real-time (/user namespace) — prod'da nginx, dev'da shu rewrite
      { source: '/socket.io/:path*', destination: `${BACKEND_URL}/socket.io/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // X-Frame-Options ALLOW-FROM brauzerlar tomonidan qo'llanmaydi — CSP frame-ancestors ishlaydi.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
