'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiListSettings, apiUpsertSetting } from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';

interface StoreSettings {
  name?: string;
  phone?: string;
  address?: string;
  workingHours?: string;
  about?: string;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: apiListSettings });

  const storeData = (data?.find((s) => s.key === 'store')?.value as StoreSettings | undefined) ?? {};
  const [store, setStore] = useState<StoreSettings>({});

  useEffect(() => {
    setStore(storeData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiUpsertSetting('store', store as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Saqlandi');
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
