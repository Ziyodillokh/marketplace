'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { apiExtendTrial } from '@/lib/endpoints';
import type { TenantDto } from '@/lib/types';
import { toast } from '@/stores/toast-store';

const PRESETS = [7, 14, 30];

export function ExtendTrialModal({
  tenant,
  onClose,
  onChanged,
}: {
  tenant: TenantDto | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [days, setDays] = useState(7);

  const mut = useMutation({
    mutationFn: () => apiExtendTrial(tenant!.id, days),
    onSuccess: () => {
      toast.success(`Trial ${days} kunga uzaytirildi`);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Modal
      open={!!tenant}
      onClose={onClose}
      title={`Trial uzaytirish — ${tenant?.shopName ?? ''}`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="space-y-3"
      >
        <p className="text-xs text-[var(--color-info)] bg-[var(--color-info)]/10 px-3 py-2 rounded-lg">
          💡 Trial mavjud bo'lsa shu kun qo'shiladi, aks holda yangidan boshlanadi.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                days === d
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              <p className="text-2xl font-bold tabular-nums">{d}</p>
              <p className="text-[10px] uppercase tracking-wider">kun</p>
            </button>
          ))}
        </div>

        <Field label="Yoki maxsus qiymat">
          <Input
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            min={1}
            max={90}
            required
          />
        </Field>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" loading={mut.isPending}>
            <Gift size={14} />
            Uzaytirish
          </Button>
        </div>
      </form>
    </Modal>
  );
}
