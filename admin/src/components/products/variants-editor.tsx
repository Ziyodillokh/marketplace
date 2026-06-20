'use client';

import { Plus, Trash2, Layers } from 'lucide-react';
import { Field, Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AdminProductDetail } from '@/lib/types';

type Variant = AdminProductDetail['variants'][number] | {
  id?: undefined;
  color: string | null;
  size: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  sku: string | null;
  imageUrl: string | null;
  isActive: boolean;
};

/** Faqat raqam (digits) — narx/qoldiq maydonlari uchun. */
const digits = (s: string) => s.replace(/\D/g, '');

export function VariantsEditor({
  variants,
  onChange,
}: {
  variants: Variant[];
  onChange: (v: Variant[]) => void;
}) {
  const add = () =>
    onChange([
      ...variants,
      {
        color: null,
        size: null,
        price: 0,
        oldPrice: null,
        stock: 0,
        sku: null,
        imageUrl: null,
        isActive: true,
      } as Variant,
    ]);

  const update = (i: number, patch: Partial<Variant>) =>
    onChange(variants.map((v, idx) => (idx === i ? ({ ...v, ...patch } as Variant) : v)));

  const remove = (i: number) => onChange(variants.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {/* Bo'sh holat — nima ekanini tushuntiradi */}
      {variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-6 text-center">
          <span className="inline-flex h-11 w-11 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] items-center justify-center mb-2">
            <Layers size={22} />
          </span>
          <p className="text-sm font-medium">Variantlar yo&apos;q</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto">
            Variant — bitta mahsulotning rang yoki o&apos;lcham bo&apos;yicha turlari
            (masalan: <b>Qora M</b>, <b>Oq L</b>). Har birining narxi va qoldig&apos;i alohida.
          </p>
        </div>
      ) : (
        variants.map((v, i) => (
          <div
            key={v.id ?? `new-${i}`}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)]">
                <span className="inline-flex h-5 w-5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] items-center justify-center text-[11px]">
                  {i + 1}
                </span>
                {[v.color, v.size].filter(Boolean).join(' · ') || 'Yangi variant'}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="h-8 w-8 grid place-items-center text-[var(--color-danger)] hover:bg-rose-50 rounded-lg"
                title="O'chirish"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Rang">
                <Input
                  value={v.color ?? ''}
                  onChange={(e) => update(i, { color: e.target.value || null })}
                  placeholder="Qora"
                />
              </Field>
              <Field label="O'lcham">
                <Input
                  value={v.size ?? ''}
                  onChange={(e) => update(i, { size: e.target.value || null })}
                  placeholder="M"
                />
              </Field>
              <Field label="Narx">
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={v.price ? String(v.price) : ''}
                  onChange={(e) => update(i, { price: Number(digits(e.target.value)) || 0 })}
                />
              </Field>
              <Field label="Eski narx">
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={v.oldPrice ? String(v.oldPrice) : ''}
                  onChange={(e) => {
                    const d = digits(e.target.value);
                    update(i, { oldPrice: d ? Number(d) : null });
                  }}
                />
              </Field>
              <Field label="Qoldiq (dona)">
                <Input
                  inputMode="numeric"
                  placeholder="0"
                  value={v.stock ? String(v.stock) : ''}
                  onChange={(e) => update(i, { stock: Number(digits(e.target.value)) || 0 })}
                />
              </Field>
              <Field label="SKU (artikul)">
                <Input
                  value={v.sku ?? ''}
                  onChange={(e) => update(i, { sku: e.target.value || null })}
                  placeholder="ABC-123"
                />
              </Field>
            </div>
          </div>
        ))
      )}

      <Button type="button" variant="secondary" fullWidth onClick={add}>
        <Plus size={16} /> Variant qo&apos;shish
      </Button>
    </div>
  );
}
