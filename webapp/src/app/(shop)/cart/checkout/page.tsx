'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  apiCreateOrder,
  apiGetCartSummary,
  apiPaymentCheckout,
  apiPublicSettings,
  type CreateOrderBody,
} from '@/lib/api/endpoints';
import type { PaymentMethod } from '@/lib/api/types';
import { formatMoney } from '@/lib/format';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import { useTelegramBackButton, useTelegramUser } from '@/hooks/use-telegram';
import { usePromoStore } from '@/stores/promo-store';
import { haptic } from '@/lib/telegram';
import { track } from '@/hooks/use-track';
import { toast } from '@/stores/toast-store';
import { detectMyLocation } from '@/lib/geolocation';
import { cn } from '@/lib/cn';

interface CheckoutForm {
  receiverName: string;
  receiverPhone: string;
  address: string;
  note?: string;
}

export default function CheckoutPage() {
  useTelegramBackButton();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  const tgUser = useTelegramUser();
  const router = useRouter();
  const qc = useQueryClient();
  const { applied: promo, clear: clearPromo } = usePromoStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const { data: pub } = useQuery({ queryKey: ['public-settings'], queryFn: apiPublicSettings });
  const paymentMethods: PaymentMethod[] = [
    'CASH_ON_DELIVERY',
    'CARD_ON_DELIVERY',
    ...(pub?.payments?.card ? (['CARD_TRANSFER'] as const) : []),
    ...(pub?.payments?.payme ? (['PAYME'] as const) : []),
    ...(pub?.payments?.click ? (['CLICK'] as const) : []),
  ];
  const paymentLabel = (m: PaymentMethod): string => {
    if (m === 'CASH_ON_DELIVERY') return tr(messages, 'checkout.payCash');
    if (m === 'CARD_ON_DELIVERY') return tr(messages, 'checkout.payCard');
    if (m === 'CARD_TRANSFER') return locale === 'ru' ? 'Картой (чек)' : 'Karta orqali (chek)';
    if (m === 'PAYME') return 'Payme (onlayn)';
    return 'Click (onlayn)';
  };

  // Buyurtma xulosasi (taxminiy — aniq summa buyurtma sahifasida server tomonda hisoblanadi)
  const { data: cartSummary } = useQuery({ queryKey: ['cart-summary'], queryFn: apiGetCartSummary });
  const subtotal = cartSummary?.subtotal ?? 0;
  const discount = promo?.discountAmount ?? 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const biz = pub?.business;
  const deliveryEnabled = biz?.deliveryEnabled ?? true;
  const deliveryFee = !deliveryEnabled
    ? 0
    : biz && afterDiscount >= biz.freeDeliveryThreshold
      ? 0
      : biz?.deliveryFee ?? 0;
  const total = afterDiscount + deliveryFee;
  // Oldindan to'lov (chek) — faqat CARD_TRANSFER
  const prep = pub?.prepayment;
  const prepayActive = paymentMethod === 'CARD_TRANSFER' && !!prep?.enabled;
  const prepayPercent = prep?.percent ?? 100;
  const prepayAmount =
    paymentMethod === 'CARD_TRANSFER'
      ? prepayActive && prepayPercent < 100
        ? Math.round((total * prepayPercent) / 100)
        : total
      : 0;
  const isPartialPrepay = prepayAmount > 0 && prepayAmount < total;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<CheckoutForm>({
    mode: 'onChange',
    defaultValues: {
      receiverName: tgUser?.first_name ?? '',
      receiverPhone: '',
      address: '',
      note: '',
    },
  });

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      haptic('light');
      const result = await detectMyLocation(locale);
      setCoords({ lat: result.latitude, lng: result.longitude });
      setValue('address', result.address, { shouldValidate: true });
      haptic('success');
      toast.success(locale === 'ru' ? 'Местоположение определено' : 'Joylashuv aniqlandi');
    } catch (err) {
      haptic('error');
      toast.error((err as Error).message);
    } finally {
      setDetectingLocation(false);
    }
  };

  const createOrder = useMutation({
    mutationFn: (body: CreateOrderBody) => apiCreateOrder(body),
    onSuccess: async (order) => {
      haptic('success');
      clearPromo();
      track({ type: 'ORDER_PLACED', payload: { orderId: order.id, total: order.total } });
      qc.setQueryData(['cart'], { items: [], summary: { count: 0, subtotal: 0 } });
      qc.setQueryData(['cart-summary'], { count: 0, subtotal: 0 });
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
      qc.invalidateQueries({ queryKey: ['orders'] });

      // Onlayn to'lov — Payme/Click sahifasiga yo'naltiramiz
      if (paymentMethod === 'PAYME' || paymentMethod === 'CLICK') {
        try {
          const { url } = await apiPaymentCheckout(
            order.id,
            paymentMethod === 'PAYME' ? 'payme' : 'click',
          );
          const wa = (window as unknown as { Telegram?: { WebApp?: { openLink?: (u: string) => void } } })
            .Telegram?.WebApp;
          if (wa?.openLink) wa.openLink(url);
          else window.location.href = url;
        } catch (e) {
          toast.error((e as Error).message);
        }
        router.replace(`/orders/${order.id}?just-created=1`);
        return;
      }

      toast.success(tr(messages, 'checkout.success'));
      router.replace(`/orders/${order.id}?just-created=1`);
    },
    onError: (err: Error) => {
      haptic('error');
      toast.error(err.message);
    },
  });

  const onSubmit = (data: CheckoutForm) => {
    createOrder.mutate({
      ...data,
      // Yetkazib berish o'chirilgan bo'lsa — manzil ixtiyoriy (olib ketish)
      address: deliveryEnabled
        ? data.address
        : data.address?.trim() || (locale === 'ru' ? 'Самовывоз' : 'Olib ketish'),
      paymentMethod,
      promoCode: promo?.code,
      latitude: coords?.lat,
      longitude: coords?.lng,
    });
  };

  const address = watch('address');

  return (
    <div>
      <PageHeader title={tr(messages, 'checkout.title')} />
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 space-y-4 pb-32">
        <Field label={tr(messages, 'checkout.name')} error={errors.receiverName?.message}>
          <Input
            {...register('receiverName', {
              required: tr(messages, 'common.error'),
              minLength: { value: 2, message: '?' },
            })}
            placeholder={tr(messages, 'checkout.name')}
          />
        </Field>
        <Field label={tr(messages, 'checkout.phone')} error={errors.receiverPhone?.message}>
          <Input
            {...register('receiverPhone', {
              required: tr(messages, 'common.error'),
              pattern: { value: /^\+?\d{9,15}$/, message: tr(messages, 'common.error') },
            })}
            placeholder="+998 90 123 45 67"
            type="tel"
          />
        </Field>

        <div>
          {!deliveryEnabled && (
            <div className="mb-2 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-3 py-2 text-xs text-[var(--color-text-muted)]">
              {locale === 'ru'
                ? 'Этот магазин не доставляет — самовывоз.'
                : "Bu do'kon yetkazib bermaydi — olib ketasiz."}
            </div>
          )}
          <label className="text-sm text-[var(--color-text-muted)] mb-1 block">
            {deliveryEnabled
              ? tr(messages, 'checkout.address')
              : locale === 'ru'
                ? 'Адрес (необязательно)'
                : 'Manzil (ixtiyoriy)'}
          </label>
          <Textarea
            {...register('address', {
              required: deliveryEnabled ? tr(messages, 'common.error') : false,
              minLength: { value: deliveryEnabled ? 3 : 0, message: '?' },
            })}
            placeholder={locale === 'ru' ? 'Улица, дом, ориентир' : 'Ko\'cha, uy, mo\'ljal'}
            rows={3}
          />

          {/* Joylashuvni aniqlash katta tugma — textarea ostida */}
          <button
            type="button"
            onClick={detectLocation}
            disabled={detectingLocation}
            className="mt-2 w-full h-12 rounded-2xl border-2 border-dashed border-[var(--color-primary)] text-[var(--color-primary)] font-semibold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {detectingLocation ? (
              <>
                <span className="inline-block h-4 w-4 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
                {locale === 'ru' ? 'Определяем...' : 'Aniqlanmoqda...'}
              </>
            ) : (
              <>
                <MapPin size={16} />
                {locale === 'ru' ? 'Определить моё местоположение' : 'Joylashuvimni aniqlash'}
              </>
            )}
          </button>

          {coords && (
            <div className="mt-2 px-3 py-2 rounded-xl bg-[var(--color-success)]/10 flex items-center gap-2">
              <MapPin size={14} className="text-[var(--color-success)] shrink-0" />
              <span className="text-xs text-[var(--color-text)] font-mono flex-1 truncate">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </span>
              <button
                type="button"
                onClick={() => setCoords(null)}
                className="text-xs text-[var(--color-danger)] font-medium"
              >
                {locale === 'ru' ? 'Очистить' : 'Tozalash'}
              </button>
            </div>
          )}
          {errors.address?.message && (
            <p className="text-xs text-[var(--color-danger)] mt-1">{errors.address.message}</p>
          )}
        </div>

        <Field label={tr(messages, 'checkout.note')}>
          <Textarea {...register('note')} placeholder={tr(messages, 'checkout.note')} rows={2} />
        </Field>

        <div>
          <p className="text-sm font-semibold mb-2">{tr(messages, 'checkout.paymentMethod')}</p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={cn(
                  'h-12 rounded-2xl border text-sm',
                  paymentMethod === m
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-white border-[var(--color-border)]',
                )}
              >
                {paymentLabel(m)}
              </button>
            ))}
          </div>

          {paymentMethod === 'CARD_TRANSFER' && pub?.cardPayment && (
            <div className="mt-3 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 space-y-1.5">
              <p className="text-xs text-[var(--color-text-muted)]">
                {locale === 'ru'
                  ? 'Переведите сумму на карту, затем загрузите чек на странице заказа.'
                  : 'Quyidagi kartaga pul o\'tkazing, so\'ng buyurtma sahifasida chekni yuklang.'}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-base font-semibold tracking-wide">{pub.cardPayment.number}</span>
              </div>
              <p className="text-sm">{pub.cardPayment.holder}</p>
            </div>
          )}
        </div>

        {/* Buyurtma xulosasi */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">{tr(messages, 'cart.subtotal')}</span>
            <span className="font-medium">{formatMoney(subtotal, locale)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-[var(--color-success)]">
              <span>
                {tr(messages, 'cart.discount')}
                {promo?.code ? ` (${promo.code})` : ''}
              </span>
              <span className="font-medium">−{formatMoney(discount, locale)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">
              {deliveryEnabled
                ? tr(messages, 'cart.delivery')
                : locale === 'ru'
                  ? 'Самовывоз'
                  : 'Olib ketish'}
            </span>
            <span className="font-medium">
              {deliveryEnabled
                ? deliveryFee === 0
                  ? tr(messages, 'common.free')
                  : formatMoney(deliveryFee, locale)
                : '—'}
            </span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-[var(--color-border)]">
            <span className="font-semibold">{tr(messages, 'cart.total')}</span>
            <span className="font-bold text-[var(--color-primary)]">{formatMoney(total, locale)}</span>
          </div>
          {paymentMethod === 'CARD_TRANSFER' && prepayActive && (
            <div className="mt-1.5 pt-1.5 border-t border-[var(--color-border)] space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">
                  {isPartialPrepay
                    ? locale === 'ru'
                      ? `Предоплата (${prepayPercent}%)`
                      : `Oldindan (${prepayPercent}%)`
                    : locale === 'ru'
                      ? 'К оплате (чек)'
                      : "To'lash (chek)"}
                </span>
                <span className="font-semibold text-[var(--color-primary)]">{formatMoney(prepayAmount, locale)}</span>
              </div>
              {isPartialPrepay && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">
                    {locale === 'ru' ? 'При доставке' : 'Yetkazib berishda'}
                  </span>
                  <span className="font-medium">{formatMoney(total - prepayAmount, locale)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="fixed bottom-[72px] inset-x-0 max-w-md mx-auto bg-white border-t border-[var(--color-border)] px-4 py-3">
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={createOrder.isPending}
            disabled={!isValid || (deliveryEnabled && !address)}
          >
            {tr(messages, 'checkout.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-[var(--color-text-muted)] mb-1 block">{label}</label>
      {children}
      {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
    </div>
  );
}
