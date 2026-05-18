import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-white rounded-2xl border border-[var(--color-border)]', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]">
      <div className="min-w-0">
        <h2 className="font-semibold text-sm">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}
