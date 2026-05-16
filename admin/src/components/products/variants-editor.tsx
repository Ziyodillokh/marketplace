'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
    <div>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="text-left font-medium p-2">Rang</th>
              <th className="text-left font-medium p-2">O&apos;lcham</th>
              <th className="text-left font-medium p-2">Narx</th>
              <th className="text-left font-medium p-2">Eski narx</th>
              <th className="text-left font-medium p-2">Qoldiq</th>
              <th className="text-left font-medium p-2">SKU</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v, i) => (
              <tr key={v.id ?? `new-${i}`} className="border-t border-[var(--color-border)]">
                <td className="p-1">
                  <Input
                    value={v.color ?? ''}
                    onChange={(e) => update(i, { color: e.target.value || null })}
                    placeholder="Ko'k"
                    className="h-9 text-sm"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={v.size ?? ''}
                    onChange={(e) => update(i, { size: e.target.value || null })}
                    placeholder="M"
                    className="h-9 text-sm"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={v.price}
                    onChange={(e) => update(i, { price: Number(e.target.value) || 0 })}
                    className="h-9 text-sm w-32"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={v.oldPrice ?? ''}
                    onChange={(e) => update(i, { oldPrice: e.target.value ? Number(e.target.value) : null })}
                    className="h-9 text-sm w-32"
                  />
                </td>
                <td className="p-1">
                  <Input
                    type="number"
                    value={v.stock}
                    onChange={(e) => update(i, { stock: Number(e.target.value) || 0 })}
                    className="h-9 text-sm w-20"
                  />
                </td>
                <td className="p-1">
                  <Input
                    value={v.sku ?? ''}
                    onChange={(e) => update(i, { sku: e.target.value || null })}
                    className="h-9 text-sm w-28"
                  />
                </td>
                <td className="p-1">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="h-9 w-9 grid place-items-center text-[var(--color-danger)] hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus size={14} /> Variant qo&apos;shish
        </Button>
      </div>
    </div>
  );
}
