'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  backHref,
  rightSlot,
}: {
  title: string;
  description?: string;
  backHref?: string;
  rightSlot?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-2 min-w-0">
        {backHref !== undefined && (
          <button
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            className="h-9 w-9 rounded-full bg-white border border-[var(--color-border)] grid place-items-center shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold truncate">{title}</h1>
          {description && <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{description}</p>}
        </div>
      </div>
      {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
    </div>
  );
}
