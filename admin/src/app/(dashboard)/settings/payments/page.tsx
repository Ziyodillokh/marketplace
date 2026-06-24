'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lock, Info } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiUpdateStorePayments,
  apiUpdateStoreCardPayment,
  apiUpdateStorePrepayment,
} from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';
import { SettingsHeader, useStore } from '../_shared';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${on ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

/** Karta raqamini 4 tadan guruhlab ko'rsatadi (eng ko'pi 16 raqam). */
function formatCardNumber(s: string): string {
  return s.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

/** Karta turini boshlanish raqamlari bo'yicha aniqlaydi (Humo/Uzcard/Visa/Mastercard). */
function detectCardScheme(s: string): { label: string; cls: string } | null {
  const d = s.replace(/\D/g, '');
  if (!d) return null;
  if (/^9860/.test(d)) return { label: 'HUMO', cls: 'bg-teal-100 text-teal-700' };
  if (/^(8600|5614|6262)/.test(d)) return { label: 'UZCARD', cls: 'bg-blue-100 text-blue-700' };
  if (/^4/.test(d)) return { label: 'VISA', cls: 'bg-indigo-100 text-indigo-700' };
  if (/^(5[1-5]|2[2-7])/.test(d)) return { label: 'MASTERCARD', cls: 'bg-orange-100 text-orange-700' };
  return null;
}

export default function PaymentsSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useStore();
  const tenant = data?.tenant ?? null;
  const onlineAllowed = data?.limits?.onlinePayment ?? false;

  // Provayder tanlovi + maydonlar (faqat birinchi yuklashda init — refetch edit'ni o'chirmasin)
  const [paymeOn, setPaymeOn] = useState(false);
  const [clickOn, setClickOn] = useState(false);
  const [pay, setPay] = useState({
    paymeMerchantId: '',
    paymeKey: '',
    clickServiceId: '',
    clickMerchantId: '',
    clickMerchantUserId: '',
    clickSecretKey: '',
  });
  const [card, setCard] = useState({ cardNumber: '', cardHolder: '', channelId: '' });
  const [prepay, setPrepay] = useState({ enabled: false, percent: 100 });
  const inited = useRef(false);

  useEffect(() => {
    if (!tenant || inited.current) return;
    setPay({
      paymeMerchantId: tenant.payme.merchantId,
      paymeKey: '',
      clickServiceId: tenant.click.serviceId,
      clickMerchantId: tenant.click.merchantId,
      clickMerchantUserId: tenant.click.merchantUserId,
      clickSecretKey: '',
    });
    setPaymeOn(!!(tenant.payme.merchantId || tenant.payme.hasKey));
    setClickOn(!!(tenant.click.serviceId || tenant.click.merchantId));
    setCard({
      cardNumber: formatCardNumber(tenant.cardPayment.cardNumber),
      cardHolder: tenant.cardPayment.cardHolder,
      channelId: tenant.cardPayment.channelId,
    });
    setPrepay({ enabled: tenant.prepayment.enabled, percent: tenant.prepayment.percent });
    inited.current = true;
  }, [tenant]);

  const savePay = useMutation({
    // Provayder o'chirilgan bo'lsa — ID tozalanadi, checkout'da ko'rinmaydi.
    mutationFn: () =>
      apiUpdateStorePayments({
        paymeMerchantId: paymeOn ? pay.paymeMerchantId.trim() : '',
        paymeKey: paymeOn && pay.paymeKey ? pay.paymeKey : undefined,
        clickServiceId: clickOn ? pay.clickServiceId.trim() : '',
        clickMerchantId: clickOn ? pay.clickMerchantId.trim() : '',
        clickMerchantUserId: clickOn ? pay.clickMerchantUserId.trim() : '',
        clickSecretKey: clickOn && pay.clickSecretKey ? pay.clickSecretKey : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      setPay((s) => ({ ...s, paymeKey: '', clickSecretKey: '' }));
      toast.success("Onlayn to'lov saqlandi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveCard = useMutation({
    mutationFn: () => apiUpdateStoreCardPayment(card),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success("Karta to'lovi saqlandi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const savePrepay = useMutation({
    mutationFn: () =>
      apiUpdateStorePrepayment({ enabled: prepay.enabled, percent: Math.min(100, Math.max(1, prepay.percent || 100)) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-store'] });
      toast.success("Oldindan to'lov saqlandi");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cardScheme = detectCardScheme(card.cardNumber);

  return (
    <div>
      <SettingsHeader title="To'lov usullari" description="Onlayn (Payme/Click), karta orqali (chek) va oldindan to'lov" />

      {isLoading ? (
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-48" />
        </div>
      ) : !tenant ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">Do&apos;kon topilmadi</div>
        </Card>
      ) : (
        <div className="max-w-2xl space-y-4">
          {/* ───── Onlayn to'lov (Payme / Click) ───── */}
          <Card>
            <CardHeader title="Onlayn to'lov" subtitle="Kerakligini yoqing — ikkalasini to'ldirish shart emas" />
            <CardBody className="space-y-3">
              {!onlineAllowed ? (
                <div className="flex gap-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] px-3 py-3 text-sm">
                  <Lock size={16} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
                  <p className="text-[var(--color-text-muted)]">
                    Onlayn to&apos;lov (Payme/Click) <b>Standart</b> va undan yuqori tariflarda. &quot;Tarif&quot;
                    bo&apos;limidan yangilang.
                  </p>
                </div>
              ) : (
                <>
                  {/* Payme */}
                  <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    <label className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        <CreditCard size={16} className="text-[var(--color-primary)]" /> Payme
                      </span>
                      <Toggle on={paymeOn} onChange={setPaymeOn} />
                    </label>
                    {paymeOn && (
                      <div className="px-3.5 pb-3.5 space-y-3 border-t border-[var(--color-border)] pt-3">
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
                            placeholder="Payme key"
                          />
                        </Field>
                      </div>
                    )}
                  </div>

                  {/* Click */}
                  <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    <label className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        <CreditCard size={16} className="text-[var(--color-primary)]" /> Click
                      </span>
                      <Toggle on={clickOn} onChange={setClickOn} />
                    </label>
                    {clickOn && (
                      <div className="px-3.5 pb-3.5 space-y-3 border-t border-[var(--color-border)] pt-3">
                        <Field label="Service ID">
                          <Input
                            value={pay.clickServiceId}
                            onChange={(e) => setPay({ ...pay, clickServiceId: e.target.value })}
                          />
                        </Field>
                        <Field label="Merchant ID">
                          <Input
                            value={pay.clickMerchantId}
                            onChange={(e) => setPay({ ...pay, clickMerchantId: e.target.value })}
                          />
                        </Field>
                        <Field label="Merchant User ID">
                          <Input
                            value={pay.clickMerchantUserId}
                            onChange={(e) => setPay({ ...pay, clickMerchantUserId: e.target.value })}
                          />
                        </Field>
                        <Field label={tenant.click.hasSecret ? 'Secret key (almashtirish uchun yangisini yozing)' : 'Secret key'}>
                          <Input
                            type="password"
                            value={pay.clickSecretKey}
                            onChange={(e) => setPay({ ...pay, clickSecretKey: e.target.value })}
                          />
                        </Field>
                      </div>
                    )}
                  </div>

                  <Button loading={savePay.isPending} onClick={() => savePay.mutate()}>Saqlash</Button>
                  <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                    Webhook URL: <span className="font-mono">…/api/payments/payme/&lt;tenant&gt;</span> ·{' '}
                    <span className="font-mono">…/api/payments/click/&#123;prepare,complete&#125;</span>
                  </p>
                </>
              )}
            </CardBody>
          </Card>

          {/* ───── Karta orqali (chek + kanal) ───── */}
          <Card>
            <CardHeader title="Karta orqali to'lov (chek + kanal)" />
            <CardBody className="space-y-3">
              <div className="flex gap-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-3 py-2.5 text-xs">
                <Info size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                <p className="text-[var(--color-text-muted)]">
                  Mijoz kartangizga pul o&apos;tkazib, chek rasmini yuklaydi. Chek{' '}
                  <b className="text-[var(--color-text)]">tasdiqlash kanaliga</b> tugmalar bilan tushadi — siz
                  tasdiqlaganingizda buyurtma tasdiqlanadi.
                </p>
              </div>
              <Field label="Karta raqami">
                <div className="relative">
                  <Input
                    value={card.cardNumber}
                    onChange={(e) => setCard({ ...card, cardNumber: formatCardNumber(e.target.value) })}
                    placeholder="8600 1234 5678 9012"
                    inputMode="numeric"
                    className="font-mono tracking-wider pr-24"
                  />
                  {cardScheme && (
                    <span
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold tracking-wide px-2 py-1 rounded ${cardScheme.cls}`}
                    >
                      {cardScheme.label}
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Karta egasi (ism familiya)">
                <Input value={card.cardHolder} onChange={(e) => setCard({ ...card, cardHolder: e.target.value })} placeholder="DIYORBEK TURSUNOV" />
              </Field>
              <Field label="Tasdiqlash kanali ID" hint="Botingiz shu kanalga admin bo'lishi shart. Masalan: -1001234567890 yoki @kanal">
                <Input
                  value={card.channelId}
                  onChange={(e) => setCard({ ...card, channelId: e.target.value })}
                  placeholder="-1001234567890"
                  className="font-mono"
                />
              </Field>
              <Button loading={saveCard.isPending} onClick={() => saveCard.mutate()}>Saqlash</Button>
            </CardBody>
          </Card>

          {/* ───── Oldindan to'lov ───── */}
          <Card>
            <CardHeader title="Oldindan to'lov (chek orqali)" />
            <CardBody className="space-y-3">
              <div className="flex gap-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 px-3 py-2.5 text-xs">
                <Info size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                <p className="text-[var(--color-text-muted)]">
                  Mijoz <b className="text-[var(--color-text)]">&quot;Karta orqali (chek)&quot;</b> ni tanlasa —
                  summaning bir qismini yoki to&apos;lig&apos;ini oldindan to&apos;lab, chekni yuklaydi. Qolgani
                  yetkazib berishda olinadi.
                </p>
              </div>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Oldindan to&apos;lov majburiy</span>
                <Toggle on={prepay.enabled} onChange={(v) => setPrepay({ ...prepay, enabled: v })} />
              </label>
              {prepay.enabled && (
                <Field label="Oldindan to'lov ulushi (%)" hint="100 = to'liq summa. Masalan 30 = 30% oldindan, qolgani yetkazishda.">
                  <Input
                    value={prepay.percent ? String(prepay.percent) : ''}
                    onChange={(e) => setPrepay({ ...prepay, percent: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
                    placeholder="30"
                    inputMode="numeric"
                  />
                </Field>
              )}
              <Button loading={savePrepay.isPending} onClick={() => savePrepay.mutate()}>Saqlash</Button>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <CreditCard size={14} /> Faqat &quot;Karta orqali (chek)&quot; to&apos;lov usulida amal qiladi.
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
