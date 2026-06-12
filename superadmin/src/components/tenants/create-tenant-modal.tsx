'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { apiCreateTenant } from '@/lib/endpoints';
import type { TariffPlan } from '@/lib/types';
import { toast } from '@/stores/toast-store';

export function CreateTenantModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [slug, setSlug] = useState('');
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [tariffPlan, setTariffPlan] = useState<TariffPlan>('FREE');
  const [isOnTrial, setIsOnTrial] = useState(false);
  const [trialDays, setTrialDays] = useState(7);

  const mut = useMutation({
    mutationFn: () =>
      apiCreateTenant({
        slug,
        shopName,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || undefined,
        tariffPlan,
        isOnTrial,
        trialDays: isOnTrial ? trialDays : undefined,
      }),
    onSuccess: (t) => {
      toast.success(`"${t.shopName}" yaratildi`);
      // Reset
      setSlug('');
      setShopName('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPhone('');
      setTariffPlan('FREE');
      setIsOnTrial(false);
      onCreated(t.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 40);
  }

  return (
    <Modal open={open} onClose={onClose} title="Yangi do'kon yaratish" size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Do'kon nomi">
            <Input
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                if (!slug) setSlug(generateSlug(e.target.value));
              }}
              placeholder="Eshik Bozori"
              required
              autoFocus
            />
          </Field>
          <Field label="Slug (URL)" hint="shop-name.platform.uz">
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .slice(0, 40),
                )
              }
              placeholder="eshik-bozori"
              required
              pattern="[a-z0-9-]+"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Egasi (ism)">
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Sardor Karimov"
              required
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="sardor@eshik.uz"
              required
            />
          </Field>
        </div>

        <Field label="Telefon" hint="Ixtiyoriy">
          <Input
            type="tel"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
          />
        </Field>

        <Field label="Boshlang'ich tarif">
          <Select
            value={tariffPlan}
            onChange={(e) => setTariffPlan(e.target.value as TariffPlan)}
          >
            <option value="FREE">🆓 Free — 0 so'm/oy</option>
            <option value="STANDARD">⭐ Standard — 199 000 so'm/oy</option>
            <option value="PRO">🚀 Pro — 499 000 so'm/oy</option>
            <option value="PREMIUM">💎 Premium — 999 000 so'm/oy</option>
          </Select>
        </Field>

        <div className="space-y-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isOnTrial}
              onChange={(e) => setIsOnTrial(e.target.checked)}
              className="h-4 w-4 rounded accent-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--color-text)]">
              Trial muddati bilan ochish
            </span>
          </label>
          {isOnTrial && (
            <Field label="Trial kuni">
              <Input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                min={1}
                max={90}
              />
            </Field>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor
          </Button>
          <Button type="submit" loading={mut.isPending}>
            Yaratish
          </Button>
        </div>
      </form>
    </Modal>
  );
}
