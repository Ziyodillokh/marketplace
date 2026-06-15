'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';

interface Option {
  value: string;
  label: string;
}

/** Mobil uchun qulay tanlov — native <select> o'rniga bottom-sheet ro'yxat. */
export function PickerSelect({
  value,
  onChange,
  options,
  placeholder = 'Tanlang…',
  title = 'Tanlang',
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 px-4 rounded-xl border border-[var(--color-border)] bg-white text-sm flex items-center justify-between gap-2 text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        <span className={cn('truncate', selected ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={18} className="text-[var(--color-text-muted)] shrink-0" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <ul className="space-y-0.5 pb-2">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-3 rounded-xl text-left text-sm transition-colors',
                    active
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                      : 'hover:bg-gray-50',
                  )}
                >
                  {o.label}
                  {active && <Check size={16} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
