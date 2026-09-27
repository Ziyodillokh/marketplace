/**
 * Ruxsat etilgan frontend origin'lar — HTTP CORS va Socket.IO uchun bitta manba.
 *
 * Funksiya ko'rinishida: qiymat har so'rovda hisoblanadi, shuning uchun
 * dekorator (gateway) import vaqtida .env hali yuklanmagan bo'lsa ham to'g'ri
 * ishlaydi. Dev tunnel/localhost origin'lari FAQAT production bo'lmaganda.
 */
type OriginCb = (err: Error | null, allow?: boolean) => void;

function envOrigins(): string[] {
  return [
    process.env.WEBAPP_URL,
    process.env.ADMIN_URL,
    process.env.SUPERADMIN_URL,
    process.env.LANDING_URL,
  ].filter((v): v is string => Boolean(v));
}

const PROD_PATTERNS: RegExp[] = [/^https:\/\/(.+\.)?selliostore\.uz$/];
const DEV_PATTERNS: RegExp[] = [
  /\.ngrok-free\.app$/,
  /\.ngrok\.io$/,
  /\.trycloudflare\.com$/,
  /\.loca\.lt$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

export function isAllowedOrigin(origin: string): boolean {
  if (envOrigins().includes(origin)) return true;
  if (PROD_PATTERNS.some((re) => re.test(origin))) return true;
  if (process.env.NODE_ENV !== 'production' && DEV_PATTERNS.some((re) => re.test(origin))) {
    return true;
  }
  return false;
}

/** `cors.origin` uchun callback (express cors va socket.io ikkalasi ham qabul qiladi). */
export function corsOriginFn(origin: string | undefined, cb: OriginCb): void {
  // Origin yo'q = same-origin / server-to-server (Telegram webhook, curl) — ruxsat.
  if (!origin) return cb(null, true);
  cb(null, isAllowedOrigin(origin));
}
