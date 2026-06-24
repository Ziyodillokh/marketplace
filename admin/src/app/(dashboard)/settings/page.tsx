'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, ShoppingCart, Truck, Gift, Bot, Users as UsersIcon, CreditCard, Lock, Palette, Upload, LifeBuoy, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiListSettings,
  apiMyStore,
  apiRemoveStoreBot,
  apiSetStoreBot,
  apiUpdateStoreInfo,
  apiUpdateStorePayments,
  apiUpdateStoreBranding,
  apiUpdateStoreCardPayment,
  apiUpdateStoreDelivery,
  apiUpdateStorePrepayment,
  apiSendSupport,
  apiUploadImage,
  apiUpsertSetting,
} from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';
import { TariffUpgrade } from '@/components/tariff-upgrade';

interface StoreSettings {
  name?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  about?: string;
}

interface BusinessSettings {
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  currency: string;
}

const BUSINESS_DEFAULTS: BusinessSettings = {
  minOrderAmount: 30000,
  deliveryFee: 25000,
  freeDeliveryThreshold: 500000,
  currency: 'UZS',
};

const CURRENCY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'UZS', label: "UZS — so'm" },
  { value: 'USD', label: 'USD — dollar' },
  { value: 'RUB', label: 'RUB — rubl' },
];

const TARIFF_LABELS: Record<string, string> = {
  FREE: 'Free',
  STANDARD: 'Standart',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

function formatMoneyInput(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '';
  return new Intl.NumberFormat('ru-RU').format(value).replace(/,/g, ' ');
}

function parseMoneyInput(text: string): number {
  const digits = text.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

export default function SettingsPage() {
  const qc = useQueryClient();

  // Do'kon (tenant) — ma'lumotlar, bot token va tarif
  const { data: storeInfo, isLoading } = useQuery({ queryKey: ['my-store'], queryFn: apiMyStore });
  const tenant = storeInfo?.tenant ?? null;

  const [store, setStore] = useState<StoreSettings>({});

  useEffect(() => {
    if (tenant) {
      setStore({
        name: tenant.shopName ?? '',
        phone: tenant.phone ?? '',
        address: tenant.address ?? '',
        workingHours: tenant.workingHours ?? '',
        about: tenant.about ?? '',
      });
    }
  }, [tenant]);

  const save = useMutation({
    mutationFn: () => apiUpdateStoreInfo(store),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success('Saqlandi');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [botToken, setBotToken] = useState('');
  const setBot = useMutation({
    mutationFn: () => apiSetStoreBot(botToken.trim()),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      setBotToken('');
      toast.success(`Bot ulandi: @${r.username}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const removeBot = useMutation({
    mutationFn: apiRemoveStoreBot,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success("Bot o'chirildi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Onlayn to'lov (Payme/Click) merchant ma'lumotlari
  const onlinePaymentAllowed = storeInfo?.limits?.onlinePayment ?? false;
  const [pay, setPay] = useState({
    paymeMerchantId: '',
    paymeKey: '',
    clickServiceId: '',
    clickMerchantId: '',
    clickMerchantUserId: '',
    clickSecretKey: '',
  });
  useEffect(() => {
    if (tenant) {
      setPay((s) => ({
        ...s,
        paymeMerchantId: tenant.payme.merchantId,
        clickServiceId: tenant.click.serviceId,
        clickMerchantId: tenant.click.merchantId,
        clickMerchantUserId: tenant.click.merchantUserId,
      }));
    }
  }, [tenant]);
  const savePay = useMutation({
    mutationFn: () => apiUpdateStorePayments(pay),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      setPay((s) => ({ ...s, paymeKey: '', clickSecretKey: '' }));
      toast.success("To'lov sozlamalari saqlandi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Karta o'tkazma to'lovi (chek + kanal orqali tasdiqlash)
  const [card, setCard] = useState({ cardNumber: '', cardHolder: '', channelId: '' });
  useEffect(() => {
    if (tenant) {
      setCard({
        cardNumber: tenant.cardPayment.cardNumber,
        cardHolder: tenant.cardPayment.cardHolder,
        channelId: tenant.cardPayment.channelId,
      });
    }
  }, [tenant]);
  const saveCard = useMutation({
    mutationFn: () => apiUpdateStoreCardPayment(card),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success("Karta to'lovi saqlandi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Yetkazib berish — yoqish/o'chirish + narx + bepul chegara
  const [delivery, setDelivery] = useState({ enabled: true, fee: 0, freeFrom: 0 });
  useEffect(() => {
    if (tenant) {
      setDelivery({
        enabled: tenant.delivery.enabled,
        fee: tenant.delivery.fee,
        freeFrom: tenant.delivery.freeFrom ?? 0,
      });
    }
  }, [tenant]);
  const saveDelivery = useMutation({
    mutationFn: () =>
      apiUpdateStoreDelivery({
        enabled: delivery.enabled,
        fee: delivery.fee,
        freeFrom: delivery.freeFrom > 0 ? delivery.freeFrom : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success('Yetkazib berish saqlandi');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Oldindan to'lov (chek) — yoqish + ulush (foiz)
  const [prepay, setPrepay] = useState({ enabled: false, percent: 100 });
  useEffect(() => {
    if (tenant) {
      setPrepay({ enabled: tenant.prepayment.enabled, percent: tenant.prepayment.percent });
    }
  }, [tenant]);
  const savePrepay = useMutation({
    mutationFn: () =>
      apiUpdateStorePrepayment({
        enabled: prepay.enabled,
        percent: Math.min(100, Math.max(1, prepay.percent || 100)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success("Oldindan to'lov saqlandi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Brending — maxsus rang + logo
  const brandingAllowed = storeInfo?.limits?.branding ?? false;
  const [brand, setBrand] = useState({ primaryColor: '#2F6BFF', logoUrl: '' });
  const [logoUploading, setLogoUploading] = useState(false);
  useEffect(() => {
    if (tenant) {
      setBrand({ primaryColor: tenant.primaryColor || '#2F6BFF', logoUrl: tenant.logoUrl || '' });
    }
  }, [tenant]);
  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    setLogoUploading(true);
    try {
      const r = await apiUploadImage(file);
      setBrand((b) => ({ ...b, logoUrl: r.url }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLogoUploading(false);
    }
  }
  const saveBrand = useMutation({
    mutationFn: () =>
      apiUpdateStoreBranding({ primaryColor: brand.primaryColor, logoUrl: brand.logoUrl || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success('Brending saqlandi');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Qo'llab-quvvatlash — platformaga yordam so'rovi
  const prioritySupport = storeInfo?.limits?.prioritySupport ?? false;
  const [supportMsg, setSupportMsg] = useState('');
  const sendSupport = useMutation({
    mutationFn: () => apiSendSupport(supportMsg.trim()),
    onSuccess: (r) => {
      setSupportMsg('');
      toast.success(r.priority ? 'Ustuvor so\'rovingiz yuborildi — tez orada javob beramiz' : 'So\'rovingiz yuborildi');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Biznes qoidalari (key="business" Settings'da saqlanadi)
  const { data: settingsList } = useQuery({ queryKey: ['admin-settings'], queryFn: apiListSettings });
  const savedBusiness = (settingsList?.find((s) => s.key === 'business')?.value ?? null) as
    | Partial<BusinessSettings>
    | null;

  const [business, setBusiness] = useState<BusinessSettings>(BUSINESS_DEFAULTS);
  // Faqat birinchi yuklash paytida server qiymatlarini state'ga ko'chiramiz.
  // Refetch (masalan, focus'da React Query qayta yuklashida) form'ni
  // o'zgartirmasin — foydalanuvchi yozayotgan qiymatlar yo'qolib qoladi.
  const businessInitializedRef = useRef(false);

  useEffect(() => {
    if (businessInitializedRef.current) return;
    if (!settingsList) return;
    setBusiness({
      minOrderAmount: Number(savedBusiness?.minOrderAmount ?? BUSINESS_DEFAULTS.minOrderAmount),
      deliveryFee: Number(savedBusiness?.deliveryFee ?? BUSINESS_DEFAULTS.deliveryFee),
      freeDeliveryThreshold: Number(
        savedBusiness?.freeDeliveryThreshold ?? BUSINESS_DEFAULTS.freeDeliveryThreshold,
      ),
      currency: String(savedBusiness?.currency ?? BUSINESS_DEFAULTS.currency),
    });
    businessInitializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsList]);

  const saveBusiness = useMutation({
    mutationFn: () => apiUpsertSetting('business', business as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Biznes qoidalari saqlandi');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const businessChanged =
    savedBusiness === null
      ? business.minOrderAmount !== BUSINESS_DEFAULTS.minOrderAmount ||
        business.deliveryFee !== BUSINESS_DEFAULTS.deliveryFee ||
        business.freeDeliveryThreshold !== BUSINESS_DEFAULTS.freeDeliveryThreshold ||
        business.currency !== BUSINESS_DEFAULTS.currency
      : Number(savedBusiness.minOrderAmount ?? BUSINESS_DEFAULTS.minOrderAmount) !== business.minOrderAmount ||
        Number(savedBusiness.deliveryFee ?? BUSINESS_DEFAULTS.deliveryFee) !== business.deliveryFee ||
        Number(savedBusiness.freeDeliveryThreshold ?? BUSINESS_DEFAULTS.freeDeliveryThreshold) !==
          business.freeDeliveryThreshold ||
        String(savedBusiness.currency ?? BUSINESS_DEFAULTS.currency) !== business.currency;

  if (isLoading) return <Skeleton className="h-80" />;

  return (
    <div>
      <PageHeader title="Sozlamalar" />

      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader title="Do'kon ma'lumotlari" />
          <CardBody className="space-y-3">
            <Field label="Nomi">
              <Input value={store.name ?? ''} onChange={(e) => setStore({ ...store, name: e.target.value })} />
            </Field>
            <Field label="Telefon">
              <Input value={store.phone ?? ''} onChange={(e) => setStore({ ...store, phone: e.target.value })} />
            </Field>
            <Field label="Manzil">
              <Input value={store.address ?? ''} onChange={(e) => setStore({ ...store, address: e.target.value })} />
            </Field>
            <Field label="Ish vaqti">
              <Input value={store.workingHours ?? ''} onChange={(e) => setStore({ ...store, workingHours: e.target.value })} />
            </Field>
            <Field label="Biz haqimizda">
              <Textarea value={store.about ?? ''} onChange={(e) => setStore({ ...store, about: e.target.value })} rows={4} />
            </Field>
            <Button loading={save.isPending} onClick={() => save.mutate()}>Saqlash</Button>
          </CardBody>
        </Card>

        {tenant && (
          <Card>
            <CardHeader title="Telegram bot" />
            <CardBody className="space-y-3">
              {tenant.botUsername ? (
                <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-[var(--color-primary)]/10 to-blue-50">
                    {tenant.botPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tenant.botPhotoUrl}
                        alt={tenant.botUsername ?? 'bot'}
                        className="h-14 w-14 rounded-2xl object-cover shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-blue-500 text-white grid place-items-center shrink-0 shadow-sm">
                        <Bot size={26} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold truncate">@{tenant.botUsername}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Faol
                        </span>
                      </div>
                      <a
                        href={`https://t.me/${tenant.botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--color-primary)]"
                      >
                        t.me/{tenant.botUsername}
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-t border-[var(--color-border)]">
                    <div className="px-4 py-3 text-center">
                      <p className="text-lg font-extrabold leading-none">{tenant.customersCount}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1 flex items-center justify-center gap-1">
                        <UsersIcon size={12} /> Mijozlar
                      </p>
                    </div>
                    <button
                      onClick={() => removeBot.mutate()}
                      disabled={removeBot.isPending}
                      className="px-4 py-3 text-center text-[var(--color-danger)] text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                    >
                      Botni uzish
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-5 text-center">
                  <div className="inline-flex h-12 w-12 rounded-2xl bg-[var(--color-bg)] text-[var(--color-text-muted)] items-center justify-center mb-2">
                    <Bot size={24} />
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Hozircha bot ulanmagan. Pastdan tokeningizni kiriting.
                  </p>
                </div>
              )}
              <Field
                label={tenant.botUsername ? 'Botni almashtirish' : 'Bot token'}
                hint="@BotFather → /newbot → tokenni nusxalang"
              >
                <Input
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456:ABC-DEF…"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </Field>
              <Button loading={setBot.isPending} disabled={!botToken.trim()} onClick={() => setBot.mutate()}>
                {tenant.botUsername ? 'Almashtirish' : 'Ulash'}
              </Button>
            </CardBody>
          </Card>
        )}

        {tenant && (
          <Card>
            <CardHeader title="Tarif" />
            <CardBody className="space-y-3 text-sm">
              {tenant.pendingTariff && (
                <p className="text-amber-600">
                  To&apos;lov kutilmoqda:{' '}
                  <span className="font-semibold">
                    {TARIFF_LABELS[tenant.pendingTariff] ?? tenant.pendingTariff}
                  </span>{' '}
                  — tasdiqlanishi bilan faollashadi
                </p>
              )}
              <TariffUpgrade
                currentPlan={tenant.tariffPlan}
                onClose={() => {
                  qc.invalidateQueries({ queryKey: ['my-store'] });
                }}
              />
            </CardBody>
          </Card>
        )}

        {tenant && (
          <Card>
            <CardHeader title="Onlayn to'lov (Payme / Click)" />
            <CardBody className="space-y-3">
              {!onlinePaymentAllowed ? (
                <div className="flex gap-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-3 text-sm">
                  <Lock size={16} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
                  <p className="text-[var(--color-text-muted)]">
                    Onlayn to&apos;lov (Payme/Click) <b>Standart</b> va undan yuqori tariflarda. Yuqoridagi
                    &quot;Tarif&quot; bo&apos;limidan yangilang.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 font-semibold">
                    <CreditCard size={16} className="text-[var(--color-primary)]" /> Payme
                  </div>
                  <Field label="Merchant ID">
                    <Input
                      value={pay.paymeMerchantId}
                      onChange={(e) => setPay({ ...pay, paymeMerchantId: e.target.value })}
                      placeholder="Payme merchant ID"
                    />
                  </Field>
                  <Field label={tenant.payme.hasKey ? 'Kalit (almashtirish uchun yangisini yozing)' : 'Kalit (Key)'}>
                    <Input
                      type="password"
                      value={pay.paymeKey}
                      onChange={(e) => setPay({ ...pay, paymeKey: e.target.value })}
                      placeholder={tenant.payme.hasKey ? '•••••• (o\'rnatilgan)' : 'Payme key'}
                      autoComplete="off"
                    />
                  </Field>

                  <div className="flex items-center gap-2 font-semibold pt-2">
                    <CreditCard size={16} className="text-[var(--color-primary)]" /> Click
                  </div>
                  <Field label="Service ID">
                    <Input value={pay.clickServiceId} onChange={(e) => setPay({ ...pay, clickServiceId: e.target.value })} />
                  </Field>
                  <Field label="Merchant ID">
                    <Input value={pay.clickMerchantId} onChange={(e) => setPay({ ...pay, clickMerchantId: e.target.value })} />
                  </Field>
                  <Field label="Merchant User ID">
                    <Input value={pay.clickMerchantUserId} onChange={(e) => setPay({ ...pay, clickMerchantUserId: e.target.value })} />
                  </Field>
                  <Field label={tenant.click.hasSecret ? 'Secret key (almashtirish uchun yangisini yozing)' : 'Secret key'}>
                    <Input
                      type="password"
                      value={pay.clickSecretKey}
                      onChange={(e) => setPay({ ...pay, clickSecretKey: e.target.value })}
                      placeholder={tenant.click.hasSecret ? '•••••• (o\'rnatilgan)' : 'Click secret key'}
                      autoComplete="off"
                    />
                  </Field>

                  <Button loading={savePay.isPending} onClick={() => savePay.mutate()}>
                    Saqlash
                  </Button>

                  <div className="rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed break-all">
                    <p className="font-medium text-[var(--color-text)] mb-1">Kabinetda sozlanadigan URL&apos;lar:</p>
                    Payme endpoint: https://selliostore.uz/api/payments/payme/{tenant.id}
                    <br />
                    Click Prepare: https://selliostore.uz/api/payments/click/prepare
                    <br />
                    Click Complete: https://selliostore.uz/api/payments/click/complete
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        )}

        {tenant && (
          <Card>
            <CardHeader title="Karta orqali to'lov (chek + kanal)" />
            <CardBody className="space-y-3">
              <div className="flex gap-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-3 py-2.5 text-xs">
                <Info size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                <p className="text-[var(--color-text-muted)]">
                  Mijoz kartangizga pul o&apos;tkazib, chek rasmini yuklaydi. Chek{' '}
                  <b className="text-[var(--color-text)]">tasdiqlash kanaliga</b> tugmalar bilan tushadi —
                  siz tasdiqlaganingizda mijozning buyurtmasi tasdiqlanadi.
                </p>
              </div>

              <Field label="Karta raqami">
                <Input
                  value={card.cardNumber}
                  onChange={(e) => setCard({ ...card, cardNumber: e.target.value })}
                  placeholder="8600 1234 5678 9012"
                  inputMode="numeric"
                  className="font-mono"
                />
              </Field>
              <Field label="Karta egasi (ism familiya)">
                <Input
                  value={card.cardHolder}
                  onChange={(e) => setCard({ ...card, cardHolder: e.target.value })}
                  placeholder="DIYORBEK TURSUNOV"
                />
              </Field>
              <Field
                label="Tasdiqlash kanali ID"
                hint="Botingiz shu kanalga admin bo'lishi shart. Masalan: -1001234567890 yoki @kanal"
              >
                <Input
                  value={card.channelId}
                  onChange={(e) => setCard({ ...card, channelId: e.target.value })}
                  placeholder="-1001234567890"
                  className="font-mono"
                />
              </Field>

              <Button loading={saveCard.isPending} onClick={() => saveCard.mutate()}>
                Saqlash
              </Button>

              <div className="flex items-start gap-2 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                <CreditCard size={14} className="shrink-0 mt-0.5" />
                Karta raqami va kanal to&apos;ldirilsa — do&apos;koningiz to&apos;lov sahifasida
                &quot;Karta orqali&quot; varianti paydo bo&apos;ladi.
              </div>
            </CardBody>
          </Card>
        )}

        {tenant && (
          <Card>
            <CardHeader title="Yetkazib berish" />
            <CardBody className="space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">
                  <span className="font-medium">Yetkazib berish bor</span>
                  <span className="block text-xs text-[var(--color-text-muted)]">
                    O&apos;chirilsa — faqat olib ketish (narx olinmaydi)
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={delivery.enabled}
                  onClick={() => setDelivery({ ...delivery, enabled: !delivery.enabled })}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${delivery.enabled ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${delivery.enabled ? 'translate-x-5' : ''}`}
                  />
                </button>
              </label>

              {delivery.enabled && (
                <>
                  <Field label="Yetkazib berish narxi (so'm)">
                    <Input
                      value={formatMoneyInput(delivery.fee)}
                      onChange={(e) => setDelivery({ ...delivery, fee: parseMoneyInput(e.target.value) })}
                      placeholder="25 000"
                      inputMode="numeric"
                    />
                  </Field>
                  <Field
                    label="Bepul yetkazib berish chegarasi (so'm)"
                    hint="Shu summadan yuqori buyurtmaga bepul. 0 — bepul chegara yo'q."
                  >
                    <Input
                      value={formatMoneyInput(delivery.freeFrom)}
                      onChange={(e) => setDelivery({ ...delivery, freeFrom: parseMoneyInput(e.target.value) })}
                      placeholder="500 000"
                      inputMode="numeric"
                    />
                  </Field>
                </>
              )}

              <Button loading={saveDelivery.isPending} onClick={() => saveDelivery.mutate()}>
                Saqlash
              </Button>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Truck size={14} /> Narx checkout va buyurtmaga avtomatik qo&apos;llanadi.
              </div>
            </CardBody>
          </Card>
        )}

        {tenant && (
          <Card>
            <CardHeader title="Oldindan to'lov (chek orqali)" />
            <CardBody className="space-y-3">
              <div className="flex gap-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-3 py-2.5 text-xs">
                <Info size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                <p className="text-[var(--color-text-muted)]">
                  Mijoz <b className="text-[var(--color-text)]">&quot;Karta orqali (chek)&quot;</b> ni
                  tanlasa — summaning bir qismini yoki to&apos;lig&apos;ini oldindan to&apos;lab, chekni
                  yuklaydi. Qolgani yetkazib berishda olinadi.
                </p>
              </div>

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Oldindan to&apos;lov majburiy</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prepay.enabled}
                  onClick={() => setPrepay({ ...prepay, enabled: !prepay.enabled })}
                  className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${prepay.enabled ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${prepay.enabled ? 'translate-x-5' : ''}`}
                  />
                </button>
              </label>

              {prepay.enabled && (
                <Field label="Oldindan to'lov ulushi (%)" hint="100 = to'liq summa. Masalan 30 = 30% oldindan, qolgani yetkazishda.">
                  <Input
                    value={prepay.percent ? String(prepay.percent) : ''}
                    onChange={(e) =>
                      setPrepay({ ...prepay, percent: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })
                    }
                    placeholder="30"
                    inputMode="numeric"
                  />
                </Field>
              )}

              <Button loading={savePrepay.isPending} onClick={() => savePrepay.mutate()}>
                Saqlash
              </Button>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <CreditCard size={14} /> Faqat &quot;Karta orqali (chek)&quot; to&apos;lov usulida amal qiladi.
              </div>
            </CardBody>
          </Card>
        )}

        {tenant && (
          <Card>
            <CardHeader title="Brending" />
            <CardBody className="space-y-3">
              {!brandingAllowed ? (
                <div className="flex gap-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-3 text-sm">
                  <Lock size={16} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
                  <p className="text-[var(--color-text-muted)]">
                    Maxsus rang va logo <b>Standart</b> va undan yuqori tariflarda. Tarifni yangilang.
                  </p>
                </div>
              ) : (
                <>
                  <Field label="Asosiy rang" hint="Do'koningiz tugma va urg'u ranglari">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(brand.primaryColor) ? brand.primaryColor : '#2F6BFF'}
                        onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                        className="h-11 w-14 rounded-lg border border-[var(--color-border)] cursor-pointer bg-white p-1"
                      />
                      <Input
                        value={brand.primaryColor}
                        onChange={(e) => setBrand({ ...brand, primaryColor: e.target.value })}
                        placeholder="#2F6BFF"
                        className="font-mono"
                      />
                    </div>
                  </Field>

                  <Field label="Logo" hint="Do'kon sahifasida ko'rinadi">
                    <label className="flex items-center gap-3 h-16 px-3 rounded-xl border border-dashed border-[var(--color-border)] bg-white cursor-pointer">
                      {brand.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brand.logoUrl} alt="logo" className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <span className="inline-flex h-12 w-12 rounded-lg bg-[var(--color-bg)] items-center justify-center text-[var(--color-text-muted)]">
                          <Upload size={20} />
                        </span>
                      )}
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {logoUploading ? 'Yuklanmoqda…' : brand.logoUrl ? 'Logoni almashtirish' : 'Logo yuklash'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => uploadLogo(e.target.files?.[0])}
                      />
                    </label>
                  </Field>

                  <Button loading={saveBrand.isPending} onClick={() => saveBrand.mutate()}>
                    Saqlash
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <Palette size={14} /> Rang va logo mijozlar do&apos;koningizga qo&apos;llanadi.
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        )}

        {tenant && (
          <Card>
            <CardHeader title="Qo'llab-quvvatlash" />
            <CardBody className="space-y-3">
              <div
                className={`flex gap-3 rounded-xl px-3 py-2.5 text-xs border ${
                  prioritySupport
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-[var(--color-bg)] border-[var(--color-border)]'
                }`}
              >
                <LifeBuoy size={16} className={`shrink-0 mt-0.5 ${prioritySupport ? 'text-amber-600' : 'text-[var(--color-text-muted)]'}`} />
                <p className="text-[var(--color-text-muted)]">
                  {prioritySupport ? (
                    <>
                      ⭐ <b className="text-amber-700">Ustuvor qo&apos;llab-quvvatlash</b> — so&apos;rovlaringiz
                      birinchi navbatda ko&apos;rib chiqiladi.
                    </>
                  ) : (
                    <>
                      Savol yoki muammo bo&apos;lsa bizga yozing. <b>Standart+</b> tariflarda so&apos;rovlar
                      ustuvor (tezroq) ko&apos;riladi.
                    </>
                  )}
                </p>
              </div>
              <Field label="Xabaringiz">
                <Textarea
                  rows={4}
                  value={supportMsg}
                  onChange={(e) => setSupportMsg(e.target.value)}
                  placeholder="Muammo yoki savolingizni yozing…"
                />
              </Field>
              <Button
                loading={sendSupport.isPending}
                disabled={supportMsg.trim().length < 5}
                onClick={() => sendSupport.mutate()}
              >
                <Send size={16} /> Yuborish
              </Button>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Biznes qoidalari" />
          <CardBody className="space-y-4">
            <div className="flex gap-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-3 py-2.5 text-xs">
              <Info size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <p className="text-[var(--color-text-muted)]">
                Bu sozlamalar buyurtma yaratishda ishlatiladi.{' '}
                <span className="text-[var(--color-text)] font-medium">
                  O&apos;zgarishlar darhol kuchga kiradi
                </span>{' '}
                — serverni qayta yoqish shart emas.
              </p>
            </div>

            <Field
              label={
                <span className="flex items-center gap-1.5">
                  <ShoppingCart size={14} /> Minimal buyurtma summasi
                </span>
              }
              hint="Bundan kichik summaga buyurtma berib bo'lmaydi"
            >
              <div className="relative">
                <Input
                  value={formatMoneyInput(business.minOrderAmount)}
                  onChange={(e) =>
                    setBusiness({ ...business, minOrderAmount: parseMoneyInput(e.target.value) })
                  }
                  placeholder="30 000"
                  inputMode="numeric"
                  className="pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] pointer-events-none">
                  {business.currency}
                </span>
              </div>
            </Field>

            <Field
              label={
                <span className="flex items-center gap-1.5">
                  <Truck size={14} /> Yetkazib berish narxi
                </span>
              }
              hint="Har buyurtmaga qo'shiladigan standart yetkazib berish narxi"
            >
              <div className="relative">
                <Input
                  value={formatMoneyInput(business.deliveryFee)}
                  onChange={(e) =>
                    setBusiness({ ...business, deliveryFee: parseMoneyInput(e.target.value) })
                  }
                  placeholder="25 000"
                  inputMode="numeric"
                  className="pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] pointer-events-none">
                  {business.currency}
                </span>
              </div>
            </Field>

            <Field
              label={
                <span className="flex items-center gap-1.5">
                  <Gift size={14} /> Bepul yetkazib berish chegarasi
                </span>
              }
              hint="Buyurtma shundan oshsa, yetkazib berish bepul bo'ladi"
            >
              <div className="relative">
                <Input
                  value={formatMoneyInput(business.freeDeliveryThreshold)}
                  onChange={(e) =>
                    setBusiness({
                      ...business,
                      freeDeliveryThreshold: parseMoneyInput(e.target.value),
                    })
                  }
                  placeholder="500 000"
                  inputMode="numeric"
                  className="pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] pointer-events-none">
                  {business.currency}
                </span>
              </div>
            </Field>

            <Field label="Valyuta" hint="Asosiy valyuta — narxlarda ko'rsatiladi">
              <Select
                value={business.currency}
                onChange={(e) => setBusiness({ ...business, currency: e.target.value })}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Button
              loading={saveBusiness.isPending}
              disabled={!businessChanged}
              onClick={() => saveBusiness.mutate()}
            >
              {businessChanged ? 'Saqlash' : 'Saqlangan'}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
