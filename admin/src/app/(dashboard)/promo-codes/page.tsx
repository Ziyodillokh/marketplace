'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { Field, Input, Select } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiCreatePromo, apiDeletePromo, apiListPromos, apiUpdatePromo } from '@/lib/endpoints';
import { formatDate, formatMoney } from '@/lib/format';
import { toast } from '@/stores/toast-store';
import type { PromoCodeView } from '@/lib/types';

interface FormData {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrderAmount: number | '';
  maxDiscount: number | '';
  expiresAt: string;
  usageLimit: number | '';
  perUserLimit: number;
  isPublic: boolean;
  isActive: boolean;
  descriptionUz: string;
  descriptionRu: string;
}

const EMPTY_FORM: FormData = {
  code: '',
  type: 'PERCENT',
  value: 10,
  minOrderAmount: '',
  maxDiscount: '',
  expiresAt: '',
  usageLimit: '',
  perUserLimit: 1,
  isPublic: false,
  isActive: true,
  descriptionUz: '',
  descriptionRu: '',
};

export default function PromoCodesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-promos'],
    queryFn: () => apiListPromos({ limit: 50 }),
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCodeView | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };
  const openEdit = (p: PromoCodeView) => {
    setEditing(p);
    setForm({
      code: p.code,
      type: p.type,
      value: p.value,
      minOrderAmount: p.minOrderAmount ?? '',
      maxDiscount: p.maxDiscount ?? '',
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : '',
      usageLimit: p.usageLimit ?? '',
      perUserLimit: p.perUserLimit,
      isPublic: p.isPublic,
      isActive: p.isActive,
      descriptionUz: p.descriptionUz ?? '',
      descriptionRu: p.descriptionRu ?? '',
    });
    setSheetOpen(true);
  };

  const buildBody = () => ({
    code: form.code.toUpperCase(),
    type: form.type,
    value: form.value,
    minOrderAmount: form.minOrderAmount === '' ? undefined : Number(form.minOrderAmount),
    maxDiscount: form.maxDiscount === '' ? undefined : Number(form.maxDiscount),
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    usageLimit: form.usageLimit === '' ? undefined : Number(form.usageLimit),
    perUserLimit: form.perUserLimit,
    isPublic: form.isPublic,
    isActive: form.isActive,
    descriptionUz: form.descriptionUz,
    descriptionRu: form.descriptionRu,
  });

  const saveMut = useMutation({
    mutationFn: () => (editing ? apiUpdatePromo(editing.id, buildBody()) : apiCreatePromo(buildBody())),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-promos'] });
      toast.success('Saqlandi');
      setSheetOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDeletePromo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-promos'] });
      toast.success("O'chirildi");
    },
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code: s });
  };

  return (
    <div>
      <PageHeader title="Promo kodlar" rightSlot={<Button size="sm" onClick={openCreate}><Plus size={16} /> Yangi</Button>} />

      {isLoading || !data ? (
        <Skeleton className="h-40" />
      ) : data.items.length === 0 ? (
        <Card>
          <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">Promo kodlar yo&apos;q</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.items.map((p) => (
            <Card key={p.id}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <button onClick={() => openEdit(p)} className="text-lg font-bold text-[var(--color-primary)] hover:underline">
                    <Tag size={14} className="inline mr-1" />
                    {p.code}
                  </button>
                  <div className="flex gap-1">
                    {p.isPublic && <Badge tone="blue">Public</Badge>}
                    {p.isActive ? <Badge tone="green">Faol</Badge> : <Badge tone="gray">Off</Badge>}
                  </div>
                </div>
                <p className="text-sm font-semibold">
                  {p.type === 'PERCENT' ? `−${p.value}%` : `−${formatMoney(p.value)}`}
                  {p.maxDiscount && p.type === 'PERCENT' && (
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">(max {formatMoney(p.maxDiscount)})</span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Min: {p.minOrderAmount ? formatMoney(p.minOrderAmount) : '—'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Foydalanildi: {p.usageCount} {p.usageLimit ? `/ ${p.usageLimit}` : ''}
                </p>
                {p.expiresAt && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">⏳ {formatDate(p.expiresAt)}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Tahrirlash</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("O'chirilsinmi?")) deleteMut.mutate(p.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? 'Tahrirlash' : 'Yangi promo kod'}>
        <div className="space-y-3">
          <Field label="Kod">
            <div className="flex gap-2">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME10"
              />
              <Button type="button" variant="secondary" onClick={generateCode}>Generate</Button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Turi">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENT' | 'FIXED' })}>
                <option value="PERCENT">Foiz (%)</option>
                <option value="FIXED">Fixed (so&apos;m)</option>
              </Select>
            </Field>
            <Field label="Qiymat">
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min buyurtma">
              <Input
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </Field>
            <Field label="Max chegirma">
              <Input
                type="number"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Limit (jami)">
              <Input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </Field>
            <Field label="User limit">
              <Input
                type="number"
                value={form.perUserLimit}
                onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) || 1 })}
              />
            </Field>
          </div>
          <Field label="Tugash sanasi">
            <DatePicker
              value={form.expiresAt}
              onChange={(v) => setForm({ ...form, expiresAt: v })}
              disablePast
              placeholder="Muddatsiz"
            />
          </Field>
          <Field label="Tavsif (uz)">
            <Input value={form.descriptionUz} onChange={(e) => setForm({ ...form, descriptionUz: e.target.value })} />
          </Field>
          <Field label="Tavsif (ru)">
            <Input value={form.descriptionRu} onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })} />
          </Field>
          <label className="flex items-center justify-between text-sm">
            <span>Public (foydalanuvchilarga ko&apos;rinadi)</span>
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-gray-200 checked:bg-[var(--color-primary)] relative cursor-pointer before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white checked:before:translate-x-4 before:transition-transform"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>Faol</span>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-gray-200 checked:bg-[var(--color-primary)] relative cursor-pointer before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white checked:before:translate-x-4 before:transition-transform"
            />
          </label>
          <Button fullWidth disabled={!form.code} loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
            Saqlash
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
