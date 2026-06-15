'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Upload, Store, Bot, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { toast } from '@/stores/toast-store';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/cn';
import {
  apiSellerBusinessTypes,
  apiSellerMe,
  apiSellerOnboard,
  apiSellerTariffs,
  apiSellerUploadLogo,
  apiSellerValidateBot,
  apiTelegramLogin,
  type BusinessTypeOption,
  type TariffOption,
} from '@/lib/endpoints';

interface TgUser {
  first_name?: string;
  last_name?: string;
}
interface TgWebApp {
  initData: string;
  initDataUnsafe?: { user?: TgUser };
  ready?: () => void;
  expand?: () => void;
}
declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js';
const BOT_URL = 'https://t.me/selliostorebot';

function loadTelegramSdk(): Promise<TgWebApp | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    if (window.Telegram?.WebApp) return resolve(window.Telegram.WebApp);
    const done = () => resolve(window.Telegram?.WebApp ?? null);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', done);
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = done;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

function formatPrice(v: number): string {
  return v === 0 ? 'Bepul' : `${v.toLocaleString('ru-RU')} so'm/oy`;
}

const STEPS = ["Do'kon", 'Tarif', 'Bot'];

export default function RegisterPage() {
  const router = useRouter();
  const setAdmin = useAuthStore((s) => s.setAdmin);

  const [phase, setPhase] = useState<'loading' | 'wizard' | 'no-telegram'>('loading');
  const [step, setStep] = useState(1);
  const [initData, setInitData] = useState('');

  const [types, setTypes] = useState<BusinessTypeOption[]>([]);
  const [tariffs, setTariffs] = useState<TariffOption[]>([]);

  // Step 1
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Step 2
  const [tariff, setTariff] = useState('FREE');
  // Step 3
  const [botToken, setBotToken] = useState('');
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [checkingBot, setCheckingBot] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const wa = await loadTelegramSdk();
      if (cancelled) return;
      wa?.ready?.();
      wa?.expand?.();

      const id = wa?.initData ?? '';
      if (!id) {
        setPhase('no-telegram');
        return;
      }
      setInitData(id);

      const u = wa?.initDataUnsafe?.user;
      if (u) setOwnerName([u.first_name, u.last_name].filter(Boolean).join(' ').trim());

      apiSellerBusinessTypes().then((t) => !cancelled && setTypes(t)).catch(() => undefined);
      apiSellerTariffs().then((t) => !cancelled && setTariffs(t)).catch(() => undefined);

      try {
        const profile = await apiSellerMe(id);
        if (cancelled) return;
        if (profile.registered) {
          const res = await apiTelegramLogin(id);
          setAccessToken(res.accessToken);
          setAdmin(res.admin);
          router.replace('/');
          return;
        }
      } catch {
        // formani ko'rsatamiz
      }
      if (!cancelled) setPhase('wizard');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPickLogo(file: File | undefined) {
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function nextFromStep1() {
    if (!shopName.trim() || !ownerName.trim() || !phone.trim() || !businessType) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    setStep(2);
  }

  async function checkBot() {
    if (!botToken.trim()) return;
    setCheckingBot(true);
    setBotUsername(null);
    try {
      const res = await apiSellerValidateBot(botToken.trim());
      if (res.ok && res.username) {
        setBotUsername(res.username);
        toast.success(`Bot topildi: @${res.username}`);
      } else {
        toast.error(res.error ?? 'Bot token yaroqsiz');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCheckingBot(false);
    }
  }

  async function finish(skipBot: boolean) {
    setSubmitting(true);
    try {
      const token = skipBot ? undefined : botToken.trim() || undefined;
      if (token && !botUsername) {
        const check = await apiSellerValidateBot(token);
        if (!check.ok) {
          toast.error(check.error ?? 'Bot token yaroqsiz');
          setSubmitting(false);
          return;
        }
      }

      let logoUrl: string | undefined;
      if (logoFile) {
        try {
          const up = await apiSellerUploadLogo(logoFile);
          logoUrl = up.url;
        } catch {
          toast.error('Logo yuklanmadi — Sellio default qoldiriladi');
        }
      }

      await apiSellerOnboard({
        initData,
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: phone.trim(),
        businessType,
        tariffPlan: tariff,
        logoUrl,
        botToken: token,
      });
      const res = await apiTelegramLogin(initData);
      setAccessToken(res.accessToken);
      setAdmin(res.admin);
      toast.success("Do'koningiz yaratildi! 🎉");
      router.replace('/');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="h-10 w-10 border-4 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === 'no-telegram') {
    return (
      <div className="min-h-dvh grid place-items-center px-4 text-center">
        <div className="max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Sellio" className="h-14 w-14 object-contain mx-auto mb-3" />
          <h1 className="text-lg font-bold mb-1">Telegram orqali oching</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Ro'yxatdan o'tish Sellio bot ichida ishlaydi. Quyidagi tugma orqali botni oching.
          </p>
          <a href={BOT_URL} className="inline-block">
            <Button>Sellio botini ochish</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 py-6 bg-gradient-to-br from-[var(--color-bg)] to-blue-50">
      <div className="w-full max-w-md mx-auto">
        {/* Brand + stepper */}
        <div className="flex flex-col items-center mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Sellio" className="h-11 w-11 object-contain mb-2" />
          <h1 className="text-xl font-bold tracking-tight">Sellio</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Do'koningizni oching</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-5">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                    active && 'bg-[var(--color-primary)] text-white',
                    done && 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]',
                    !active && !done && 'bg-white text-[var(--color-text-muted)] border border-[var(--color-border)]',
                  )}
                >
                  <span className="grid place-items-center h-4 w-4 rounded-full bg-white/25 text-[10px]">
                    {done ? <Check size={11} /> : n}
                  </span>
                  {label}
                </div>
                {n < STEPS.length && <span className="w-3 h-px bg-[var(--color-border)]" />}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-sm">
          {/* ── STEP 1: Do'kon ma'lumotlari ── */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Store size={18} className="text-[var(--color-primary)]" />
                <h2 className="font-semibold">Do'kon ma'lumotlari</h2>
              </div>

              <Field label="Do'kon nomi *">
                <Input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Masalan: Bek Store"
                  maxLength={80}
                />
              </Field>
              <Field label="Ismingiz *">
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ism Familiya"
                  maxLength={80}
                />
              </Field>
              <Field label="Telefon raqam *">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  maxLength={30}
                />
              </Field>
              <Field label="Biznes turi *">
                <Select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                  <option value="" disabled>
                    Tanlang…
                  </option>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Logo (ixtiyoriy)" hint="Bo'lmasa Sellio standart logosi ishlatiladi">
                <label className="flex items-center gap-3 h-14 px-3 rounded-xl border border-dashed border-[var(--color-border)] bg-white cursor-pointer">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="logo" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="inline-flex h-10 w-10 rounded-lg bg-[var(--color-bg)] items-center justify-center text-[var(--color-text-muted)]">
                      <Upload size={18} />
                    </span>
                  )}
                  <span className="text-sm text-[var(--color-text-muted)] truncate">
                    {logoFile ? logoFile.name : 'Rasm tanlash (PNG/JPG)'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => onPickLogo(e.target.files?.[0])}
                  />
                </label>
              </Field>

              <Button fullWidth size="lg" onClick={nextFromStep1}>
                Keyingi
              </Button>
            </div>
          )}

          {/* ── STEP 2: Tarif ── */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Crown size={18} className="text-[var(--color-primary)]" />
                <h2 className="font-semibold">Tarifni tanlang</h2>
              </div>

              <div className="space-y-2.5">
                {tariffs.map((t) => {
                  const selected = tariff === t.value;
                  return (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setTariff(t.value)}
                      className={cn(
                        'w-full text-left rounded-2xl border p-4 transition-colors',
                        selected
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.03]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50',
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t.label}</span>
                          {t.popular && (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full">
                              Mashhur
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            'h-5 w-5 rounded-full border-2 grid place-items-center',
                            selected
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                              : 'border-[var(--color-border)]',
                          )}
                        >
                          {selected && <Check size={12} />}
                        </span>
                      </div>
                      <p className="text-sm font-bold">{formatPrice(t.priceMonthly)}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.tagline}</p>
                      <ul className="mt-2 space-y-1">
                        {t.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <Check size={13} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="secondary" fullWidth size="lg" onClick={() => setStep(1)}>
                  Orqaga
                </Button>
                <Button fullWidth size="lg" onClick={() => setStep(3)}>
                  Keyingi
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Bot ── */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot size={18} className="text-[var(--color-primary)]" />
                <h2 className="font-semibold">Telegram botingizni ulang</h2>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] -mt-1">
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] font-medium"
                >
                  @BotFather
                </a>
                'da <span className="font-medium">/newbot</span> orqali bot yarating va tokenni nusxalang.
                Bu — mijozlaringiz do'koningizni ochadigan bot.
              </p>

              <Field label="Bot token (ixtiyoriy)">
                <div className="flex gap-2">
                  <Input
                    value={botToken}
                    onChange={(e) => {
                      setBotToken(e.target.value);
                      setBotUsername(null);
                    }}
                    placeholder="123456:ABC-DEF…"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <Button
                    variant="secondary"
                    onClick={checkBot}
                    loading={checkingBot}
                    disabled={!botToken.trim()}
                  >
                    Tekshirish
                  </Button>
                </div>
              </Field>
              {botUsername && (
                <p className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium">
                  <Check size={15} /> @{botUsername} ulanadi
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="secondary" fullWidth size="lg" onClick={() => setStep(2)}>
                  Orqaga
                </Button>
                <Button fullWidth size="lg" loading={submitting} onClick={() => finish(false)}>
                  Yakunlash
                </Button>
              </div>
              <button
                type="button"
                onClick={() => finish(true)}
                disabled={submitting}
                className="w-full text-center text-sm text-[var(--color-text-muted)] py-1 disabled:opacity-50"
              >
                Botni keyinroq ulayman →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
