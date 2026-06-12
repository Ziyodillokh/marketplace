'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Ban,
  Play,
  Crown,
  Calendar,
  Globe,
  Mail,
  Phone,
  Bot,
  Activity,
  CreditCard,
  Receipt,
  Sparkles,
  HardDrive,
  Package,
  ShoppingBag,
  Settings,
  ExternalLink,
  ShieldOff,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import {
  apiFetchTenant,
  apiResumeTenant,
  apiSuspendTenant,
} from '@/lib/endpoints';
import { STATUS_META, TARIFF_META, TARIFF_PRICE } from '@/lib/tariff';
import {
  formatBytes,
  formatDate,
  formatNumber,
  formatRelative,
  formatUzs,
} from '@/lib/format';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/cn';

type Tab =
  | 'overview'
  | 'activity'
  | 'subscription'
  | 'billing'
  | 'ai'
  | 'resources'
  | 'catalog'
  | 'orders'
  | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Umumiy', icon: Activity },
  { id: 'activity', label: 'Faollik', icon: Activity },
  { id: 'subscription', label: 'Obuna', icon: CreditCard },
  { id: 'billing', label: 'To\'lovlar', icon: Receipt },
  { id: 'ai', label: 'AI sarfi', icon: Sparkles },
  { id: 'resources', label: 'Resurslar', icon: HardDrive },
  { id: 'catalog', label: 'Katalog', icon: Package },
  { id: 'orders', label: 'Buyurtmalar', icon: ShoppingBag },
  { id: 'settings', label: 'Sozlamalar', icon: Settings },
];

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');

  const tenantQuery = useQuery({
    queryKey: ['tenant', params.id],
    queryFn: () => apiFetchTenant(params.id),
    enabled: !!params.id,
  });

  const suspendMutation = useMutation({
    mutationFn: () => apiSuspendTenant(params.id, 'Manual suspension by admin'),
    onSuccess: () => {
      toast.success('Do\'kon to\'xtatildi');
      queryClient.invalidateQueries({ queryKey: ['tenant', params.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiResumeTenant(params.id),
    onSuccess: () => {
      toast.success('Do\'kon qayta yoqildi');
      queryClient.invalidateQueries({ queryKey: ['tenant', params.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (tenantQuery.isLoading || !tenantQuery.data) {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/tenants"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <ArrowLeft size={20} />
          </Link>
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-32 w-full mb-4" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </>
    );
  }

  const tenant = tenantQuery.data;
  const tariff = TARIFF_META[tenant.tariffPlan];
  const status = STATUS_META[tenant.status];
  const mrr = TARIFF_PRICE[tenant.tariffPlan];

  return (
    <>
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-5">
        <Link
          href="/tenants"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft size={16} />
          Do'konlar ro'yxati
        </Link>
        <div className="flex items-center gap-2">
          {tenant.status === 'ACTIVE' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => suspendMutation.mutate()}
              loading={suspendMutation.isPending}
            >
              <Ban size={14} />
              To'xtatish
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              onClick={() => resumeMutation.mutate()}
              loading={resumeMutation.isPending}
            >
              <Play size={14} />
              Qayta yoqish
            </Button>
          )}
          <Button variant="primary" size="sm">
            <Crown size={14} />
            Tarif o'zgartirish
          </Button>
          <Button variant="outline" size="sm">
            <ShieldOff size={14} />
            Impersonate
          </Button>
        </div>
      </div>

      {/* Hero card */}
      <Card className="mb-5 relative">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent pointer-events-none" />
        <CardBody className="relative">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt=""
                className="h-20 w-20 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] grid place-items-center text-white text-2xl font-bold shadow-lg shrink-0">
                {tenant.shopName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h2 className="text-xl font-bold text-[var(--color-text)]">
                  {tenant.shopName}
                </h2>
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
                {tenant.isOnTrial && (
                  <Badge variant="warning">
                    Trial · {tenant.trialEndsAt && formatRelative(tenant.trialEndsAt)}
                  </Badge>
                )}
                {tenant.isWhiteLabel && <Badge variant="info">White-label</Badge>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <Info icon={Mail} label="Egasi" value={tenant.ownerName} />
                <Info icon={Mail} label="Email" value={tenant.ownerEmail} />
                {tenant.ownerPhone && (
                  <Info icon={Phone} label="Telefon" value={tenant.ownerPhone} />
                )}
                <Info icon={Globe} label="Slug" value={tenant.slug} />
                {tenant.botUsername && (
                  <Info icon={Bot} label="Bot" value={`@${tenant.botUsername}`} />
                )}
                <Info
                  icon={Calendar}
                  label="Ro'yxatdan o'tgan"
                  value={formatDate(tenant.createdAt)}
                />
              </div>
            </div>

            {tenant.customDomain && (
              <a
                href={`https://${tenant.customDomain}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors shrink-0"
              >
                <ExternalLink size={12} />
                {tenant.customDomain}
              </a>
            )}
          </div>
        </CardBody>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        <KpiCard
          label="Oylik to'lov (MRR)"
          value={formatUzs(mrr)}
          icon={CreditCard}
          tone="success"
          index={0}
        />
        <KpiCard
          label="Jami daromad"
          value={formatUzs(tenant.totalRevenue)}
          icon={Receipt}
          tone="default"
          index={1}
        />
        <KpiCard
          label="Buyurtmalar"
          value={formatNumber(tenant.totalOrders)}
          icon={ShoppingBag}
          tone="default"
          index={2}
        />
        <KpiCard
          label="Storage"
          value={formatBytes(tenant.storageMb)}
          icon={HardDrive}
          tone={tenant.storageMb > 10_000 ? 'warning' : 'default'}
          hint={`${formatNumber(tenant.productsCount)} mahsulot`}
          index={3}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] mb-5 overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <Card>
        <CardHeader title={TABS.find((t) => t.id === tab)?.label ?? ''} />
        <CardBody>
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Bu bo'lim keyingi bosqichda to'ldiriladi
            </p>
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">
              "{TABS.find((t) => t.id === tab)?.label}" — Phase 4/5 da
            </p>
          </div>
        </CardBody>
      </Card>
    </>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] min-w-0">
      <Icon size={14} className="text-[var(--color-text-subtle)] shrink-0" />
      <span className="text-[var(--color-text-subtle)]">{label}:</span>
      <span className="text-[var(--color-text)] truncate">{value}</span>
    </div>
  );
}
