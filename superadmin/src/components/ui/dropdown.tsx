'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';

export interface DropdownItem {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export function Dropdown({
  trigger,
  items,
  align = 'right',
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-50 mt-1 min-w-[200px] glass-strong rounded-xl border border-[var(--color-border-strong)] shadow-2xl py-1.5',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item, i) => {
              if (item.divider) {
                return (
                  <div
                    key={`d-${i}`}
                    className="my-1 mx-2 border-t border-[var(--color-border)]"
                  />
                );
              }
              const Icon = item.icon;
              const className = cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors text-left',
                item.disabled && 'opacity-40 cursor-not-allowed',
                !item.disabled &&
                  (item.danger
                    ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'),
              );
              const inner = (
                <>
                  {Icon && <Icon size={14} className="shrink-0" />}
                  <span className="flex-1">{item.label}</span>
                </>
              );
              if (item.href) {
                return (
                  <a key={i} href={item.href} className={className}>
                    {inner}
                  </a>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) return;
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={className}
                >
                  {inner}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
