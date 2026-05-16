'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiCreateOrder, type CreateOrderBody } from '@/lib/api/endpoints';
import type { PaymentMethod } from '@/lib/api/types';
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
    onSuccess: (order) => {
      haptic('success');
      toast.success(tr(messages, 'checkout.success'));
      clearPromo();
      track({ type: 'ORDER_PLACED', payload: { orderId: order.id, total: order.total } });
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['cart-summary'] });
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-[var(--color-text-muted)]">{tr(messages, 'checkout.address')}</label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingLocation}
              className="text-xs font-semibold text-[var(--color-primary)] inline-flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
            >
              {detectingLocation ? (
                <span className="inline-block h-3 w-3 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
              ) : (
                <MapPin size={14} />
              )}
              {locale === 'ru' ? 'Определить' : 'Aniqlash'}
            </button>
          </div>
          <Textarea
            {...register('address', {
              required: tr(messages, 'common.error'),
              minLength: { value: 3, message: '?' },
            })}
            placeholder={locale === 'ru' ? 'Улица, дом, ориентир' : 'Ko\'cha, uy, mo\'ljal'}
            rows={3}
          />
          {coords && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5 flex items-center gap-1">
              <MapPin size={11} className="text-[var(--color-success)]" />
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              <button
                type="button"
                onClick={() => setCoords(null)}
                className="ml-auto text-[var(--color-danger)] underline"
              >
                {locale === 'ru' ? 'Очистить' : 'Tozalash'}
              </button>
            </p>
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
            {(['CASH_ON_DELIVERY', 'CARD_ON_DELIVERY'] as const).map((m) => (
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
                {m === 'CASH_ON_DELIVERY' ? tr(messages, 'checkout.payCash') : tr(messages, 'checkout.payCard')}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-[72px] inset-x-0 max-w-md mx-auto bg-white border-t border-[var(--color-border)] px-4 py-3">
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={createOrder.isPending}
            disabled={!isValid || !address}
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
