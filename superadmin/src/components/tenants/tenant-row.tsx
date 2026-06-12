'use client';

import Link from 'next/link';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import type { TenantDto } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { STATUS_META, TARIFF_META } from '@/lib/tariff';
import { formatBytes, formatNumber, formatRelative, formatUzs } from '@/lib/format';

export function TenantRow({ tenant }: { tenant: TenantDto }) {
  const tariff = TARIFF_META[tenant.tariffPlan];
  const status = STATUS_META[tenant.status];

  return (
    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors group">
      <td className="py-3 px-4">
        <Link href={`/tenants/${tenant.id}`} className="flex items-center gap-3 min-w-0">
          {tenant.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt=""
              className="h-10 w-10 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] grid place-items-center text-white font-semibold text-sm shrink-0">
              {tenant.shopName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
              {tenant.shopName}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {tenant.ownerEmail}
            </p>
          </div>
        </Link>
      </td>

      <td className="py-3 px-4">
        <Badge
          variant={
            (`tier-${tenant.tariffPlan.toLowerCase()}` as
              | 'tier-free'
              | 'tier-standard'
              | 'tier-pro'
              | 'tier-premium')
          }
        >
          {tariff.icon} {tariff.label}
        </Badge>
        {tenant.isOnTrial && (
          <span className="block text-[10px] text-[var(--color-warning)] mt-1">Trial</span>
        )}
      </td>

      <td className="py-3 px-4">
        <Badge
          variant={
            tenant.status === 'ACTIVE'
              ? 'success'
              : tenant.status === 'SUSPENDED'
                ? 'danger'
                : tenant.status === 'PENDING_PAYMENT'
                  ? 'warning'
                  : 'default'
          }
        >
          {status.label}
        </Badge>
      </td>

      <td className="py-3 px-4 text-sm tabular-nums">
        <p className="text-[var(--color-text)] font-medium">{formatUzs(tenant.totalRevenue)}</p>
        <p className="text-[11px] text-[var(--color-text-subtle)]">
          {formatNumber(tenant.totalOrders)} buyurtma
        </p>
      </td>

      <td className="py-3 px-4 text-sm tabular-nums">
        <p className="text-[var(--color-text)]">{formatNumber(tenant.productsCount)}</p>
        <p className="text-[11px] text-[var(--color-text-subtle)]">{formatBytes(tenant.storageMb)}</p>
      </td>

      <td className="py-3 px-4 text-xs text-[var(--color-text-muted)]">
        {formatRelative(tenant.lastActivityAt)}
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {tenant.customDomain && (
            <a
              href={`https://${tenant.customDomain}`}
              target="_blank"
              rel="noreferrer"
              className="h-8 w-8 rounded-lg grid place-items-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              title="Do'konni ochish"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            className="h-8 w-8 rounded-lg grid place-items-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title="Boshqa"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
