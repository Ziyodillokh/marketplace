'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Spec = {
  id?: string;
  labelUz: string;
  labelRu: string;
  valueUz: string;
  valueRu: string;
  position?: number;
};

export function SpecsEditor({ specs, onChange }: { specs: Spec[]; onChange: (s: Spec[]) => void }) {
  const add = () => onChange([...specs, { labelUz: '', labelRu: '', valueUz: '', valueRu: '' }]);
  const update = (i: number, patch: Partial<Spec>) => onChange(specs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(specs.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="space-y-2">
        {specs.map((s, i) => (
          <div key={s.id ?? `new-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
            <Input
              value={s.labelUz}
              onChange={(e) => update(i, { labelUz: e.target.value, labelRu: s.labelRu || e.target.value })}
              placeholder="Label (uz)"
              className="h-9"
            />
            <div className="flex gap-2">
              <Input
                value={s.valueUz}
                onChange={(e) => update(i, { valueUz: e.target.value, valueRu: s.valueRu || e.target.value })}
                placeholder="Qiymat"
                className="h-9"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="h-9 w-9 grid place-items-center text-[var(--color-danger)] shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus size={14} /> Xususiyat qo&apos;shish
        </Button>
      </div>
    </div>
  );
}
