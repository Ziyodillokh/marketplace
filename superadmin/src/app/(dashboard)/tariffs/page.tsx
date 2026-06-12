'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Save, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetchTariffs, apiUpdateTariff } from '@/lib/endpoints';
import type { TariffConfigDto, TariffPlan } from '@/lib/types';
import { TARIFF_META } from '@/lib/tariff';
import { formatNumber, formatUzs } from '@/lib/format';
import { toast } from '@/stores/toast-store';

export default function TariffsConfigPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['tariffs'], queryFn: apiFetchTariffs });

  return (
    <>
      <PageHeader
        title="Tarif konfiguratsiyasi"
        subtitle="Narxlar, limitlar va funksiyalarni tahrirlash"
      />

      {list.isLoading || !list.data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.data.map((t) => (
            <TariffCard
              key={t.plan}
              config={t}
              onSaved={() => qc.invalidateQueries({ queryKey: ['tariffs'] })}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TariffCard({
  config,
  onSaved,
}: {
  config: TariffConfigDto;
  onSaved: () => void;
}) {
  const meta = TARIFF_META[config.plan];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    monthlyPrice: Number(config.monthlyPrice),
    yearlyPrice: Number(config.yearlyPrice),
    maxCategories: config.maxCategories,
    maxProducts: config.maxProducts,
    maxBanners: config.maxBanners,
    maxImagesPerProduct: config.maxImagesPerProduct,
    maxOptionsPerProduct: config.maxOptionsPerProduct,
    aiImagesPerMonth: config.aiImagesPerMonth,
    aiAutoFillPerMonth: config.aiAutoFillPerMonth,
  });

  const mut = useMutation({
    mutationFn: () =>
      apiUpdateTariff(config.plan, {
        ...form,
        monthlyPrice: String(form.monthlyPrice),
        yearlyPrice: String(form.yearlyPrice),
      }),
    onSuccess: () => {
      toast.success(`${meta.label} tarifi yangilandi`);
      setEditing(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader
        title={
          <div className="flex items-center gap-2">
            <span className="text-base">{meta.icon}</span>
            <span className={meta.color}>{meta.label}</span>
            {config.badge && (
              <Badge variant="warning" className="ml-1">
                {config.badge}
              </Badge>
            )}
          </div>
        }
        subtitle={config.description ?? undefined}
        action={
          editing ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X size={14} />
              </Button>
              <Button size="sm" onClick={() => mut.mutate()} loading={mut.isPending}>
                <Save size={14} />
                Saqlash
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil size={14} />
              Tahrirlash
            </Button>
          )
        }
      />
      <CardBody className="space-y-4">
        {/* Narxlar */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-2">
            Narxlar
          </div>
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Oylik (UZS)">
                <Input
                  type="number"
                  value={form.monthlyPrice}
                  onChange={(e) =>
                    setForm({ ...form, monthlyPrice: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Yillik (UZS)">
                <Input
                  type="number"
                  value={form.yearlyPrice}
                  onChange={(e) => setForm({ ...form, yearlyPrice: Number(e.target.value) })}
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Oylik" value={formatUzs(config.monthlyPrice)} />
              <Stat label="Yillik" value={formatUzs(config.yearlyPrice)} />
            </div>
          )}
        </div>

        {/* Limitlar */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-2">
            Resurs limitlari
          </div>
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Kategoriyalar">
                <Input
                  type="number"
                  value={form.maxCategories}
                  onChange={(e) => setForm({ ...form, maxCategories: Number(e.target.value) })}
                />
              </Field>
              <Field label="Mahsulotlar">
                <Input
                  type="number"
                  value={form.maxProducts}
                  onChange={(e) => setForm({ ...form, maxProducts: Number(e.target.value) })}
                />
              </Field>
              <Field label="Bannerlar">
                <Input
                  type="number"
                  value={form.maxBanners}
                  onChange={(e) => setForm({ ...form, maxBanners: Number(e.target.value) })}
                />
              </Field>
              <Field label="Rasm/mahsulot">
                <Input
                  type="number"
                  value={form.maxImagesPerProduct}
                  onChange={(e) =>
                    setForm({ ...form, maxImagesPerProduct: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Opsiya/mahsulot">
                <Input
                  type="number"
                  value={form.maxOptionsPerProduct}
                  onChange={(e) =>
                    setForm({ ...form, maxOptionsPerProduct: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Kategoriyalar" value={formatLimit(config.maxCategories)} />
              <Stat label="Mahsulotlar" value={formatLimit(config.maxProducts)} />
              <Stat label="Bannerlar" value={formatLimit(config.maxBanners)} />
              <Stat
                label="Rasm/mahsulot"
                value={formatNumber(config.maxImagesPerProduct)}
              />
            </div>
          )}
        </div>

        {/* AI limitlar */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] mb-2">
            AI limitlari (oylik)
          </div>
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="AI rasm">
                <Input
                  type="number"
                  value={form.aiImagesPerMonth}
                  onChange={(e) =>
                    setForm({ ...form, aiImagesPerMonth: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Auto-fill">
                <Input
                  type="number"
                  value={form.aiAutoFillPerMonth}
                  onChange={(e) =>
                    setForm({ ...form, aiAutoFillPerMonth: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="AI rasm yaxshilash"
                value={`${formatNumber(config.aiImagesPerMonth)}/oy`}
              />
              <Stat
                label="Auto-fill"
                value={`${formatNumber(config.aiAutoFillPerMonth)}/oy`}
              />
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--color-text-subtle)] uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function formatLimit(n: number): string {
  if (n >= 999_999) return '♾️ Cheksiz';
  return formatNumber(n);
}
