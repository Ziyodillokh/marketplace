'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { toast } from '@/stores/toast-store';
import { setAccessToken } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import {
  apiSellerBusinessTypes,
  apiSellerMe,
  apiSellerOnboard,
  apiSellerUploadLogo,
  apiTelegramLogin,
  type BusinessTypeOption,
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

/** Telegram WebApp SDK'ni yuklaydi va WebApp obyektini qaytaradi (yoki null). */
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

export default function RegisterPage() {
  const router = useRouter();
  const setAdmin = useAuthStore((s) => s.setAdmin);

  const [phase, setPhase] = useState<'loading' | 'form' | 'no-telegram'>('loading');
  const [initData, setInitData] = useState('');
  const [types, setTypes] = useState<BusinessTypeOption[]>([]);

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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

      apiSellerBusinessTypes()
        .then((t) => !cancelled && setTypes(t))
        .catch(() => undefined);

      // Allaqachon ro'yxatdan o'tganmi → to'g'ridan-to'g'ri panelga
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
        // tekshiruv muvaffaqiyatsiz — formani ko'rsatamiz
      }
      if (!cancelled) setPhase('form');
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shopName.trim() || !ownerName.trim() || !phone.trim() || !businessType) {
      toast.error("Barcha majburiy maydonlarni to'ldiring");
      return;
    }
    setSubmitting(true);
    try {
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
        logoUrl,
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
          <div className="inline-flex h-12 w-12 rounded-2xl bg-[var(--color-primary)] text-white items-center justify-center mb-3">
            <Store size={22} />
          </div>
          <h1 className="text-lg font-bold mb-1">Telegram orqali oching</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Ro'yxatdan o'tish Telegram bot ichida ishlaydi. Quyidagi tugma orqali botni oching.
          </p>
          <a href={BOT_URL} className="inline-block">
            <Button>Sellio botini ochish</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4 py-8 bg-gradient-to-br from-[var(--color-bg)] to-blue-50">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-[var(--color-border)] p-6 shadow-sm">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-[var(--color-primary)] text-white items-center justify-center mb-3">
            <Store size={22} />
          </div>
          <h1 className="text-xl font-bold">Do'koningizni oching</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Bir necha qadamda Sellio'da savdoni boshlang
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Do'kon nomi *">
            <Input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Masalan: Bek Store"
              maxLength={80}
              required
            />
          </Field>

          <Field label="Ismingiz *">
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ism Familiya"
              maxLength={80}
              required
            />
          </Field>

          <Field label="Telefon raqam *">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              maxLength={30}
              required
            />
          </Field>

          <Field label="Biznes turi *">
            <Select value={businessType} onChange={(e) => setBusinessType(e.target.value)} required>
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
              <span className="text-sm text-[var(--color-text-muted)]">
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

          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Do'konni yaratish
          </Button>
        </form>
      </div>
    </div>
  );
}
