'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiMyStore,
  apiRemoveStoreBot,
  apiSetStoreBot,
  apiUpdateStoreInfo,
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

const TARIFF_LABELS: Record<string, string> = {
  FREE: 'Free',
  STANDARD: 'Standart',
  PRO: 'Pro',
  PREMIUM: 'Premium',
};

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
                <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] p-3">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Ulangan bot</p>
                    <p className="font-semibold">@{tenant.botUsername}</p>
                  </div>
                  <Button variant="secondary" loading={removeBot.isPending} onClick={() => removeBot.mutate()}>
                    O&apos;chirish
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">Hozircha bot ulanmagan.</p>
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

        <Card>
          <CardHeader title="Biznes qoidalari" />
          <CardBody className="space-y-2 text-sm text-[var(--color-text-muted)]">
            <p>Quyidagi qiymatlar backend `.env` fayli orqali sozlanadi (sirlar bilan birga):</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>MIN_ORDER_AMOUNT — minimal buyurtma summasi</li>
              <li>DELIVERY_FEE — yetkazib berish narxi</li>
              <li>FREE_DELIVERY_THRESHOLD — bepul yetkazib berish chegarasi</li>
              <li>TELEGRAM_BOT_TOKEN, TELEGRAM_ORDERS_CHANNEL_ID — bot sirlari</li>
            </ul>
            <p className="mt-2">O&apos;zgartirgandan keyin serverni restart qiling.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
