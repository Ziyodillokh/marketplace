'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  HardDrive,
  ShoppingBag,
  Users as UsersIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { TariffDonut } from '@/components/dashboard/tariff-donut';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  apiFetchActivity,
  apiFetchKpi,
  apiFetchRevenueChart,
  apiFetchTariffDistribution,
} from '@/lib/endpoints';
import { formatCompact, formatNumber, formatPct, formatUsd, formatUzs } from '@/lib/format';

export default function DashboardPage() {
  const kpiQuery = useQuery({ queryKey: ['kpi'], queryFn: apiFetchKpi });
  const revenueQuery = useQuery({
    queryKey: ['revenue', 30],
    queryFn: () => apiFetchRevenueChart(30),
  });
  const tariffQuery = useQuery({
    queryKey: ['tariff-distribution'],
    queryFn: apiFetchTariffDistribution,
  });
  const activityQuery = useQuery({
    queryKey: ['activity', 20],
    queryFn: () => apiFetchActivity(20),
    refetchInterval: 30_000,
  });

  const kpi = kpiQuery.data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Platforma bo'yicha real-vaqt holatlar"
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {kpiQuery.isLoading || !kpi ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <KpiCard
              label="Jami do'konlar"
              value={formatNumber(kpi.totalTenants)}
              icon={Building2}
              tone="primary"
              hint={`${formatNumber(kpi.activeTenants)} faol · ${formatNumber(kpi.suspendedTenants)} to'xtatilgan`}
              index={0}
            />
            <KpiCard
              label="MRR (Oylik daromad)"
              value={formatUzs(kpi.mrr)}
              icon={CircleDollarSign}
              tone="success"
              delta={{ value: 12.4, positive: true }}
              hint={`ARR: ${formatUzs(kpi.arr)}`}
              index={1}
            />
            <KpiCard
              label="Yangi obunalar (oy)"
              value={formatNumber(kpi.newThisMonth)}
              icon={TrendingUp}
              tone="default"
              delta={{ value: 8.1, positive: true }}
              hint="O'tgan oyga nisbatan"
              index={2}
            />
            <KpiCard
              label="Churn rate"
              value={formatPct(kpi.churnRate)}
              icon={AlertTriangle}
              tone={kpi.churnRate > 5 ? 'danger' : 'warning'}
              delta={{ value: 1.2, positive: false }}
              hint="Oxirgi 30 kun"
              index={3}
            />
            <KpiCard
              label="AI sarfi (oy)"
              value={formatUsd(kpi.aiSpendUsd)}
              icon={Sparkles}
              tone="primary"
              hint={`≈ ${formatUzs(kpi.aiSpendUzs)}`}
              index={4}
            />
            <KpiCard
              label="Trial do'konlar"
              value={formatNumber(kpi.trialTenants)}
              icon={UsersIcon}
              tone="warning"
              hint="Yaqinda tugaydigan"
              index={5}
            />
            <KpiCard
              label="Bugungi buyurtmalar"
              value={formatNumber(kpi.todayOrders)}
              icon={ShoppingBag}
              tone="default"
              hint={formatUzs(kpi.todayRevenue)}
              index={6}
            />
            <KpiCard
              label="Storage band"
              value={`${kpi.storageGb.toFixed(1)} GB`}
              icon={HardDrive}
              tone={kpi.storageGb > 100 ? 'warning' : 'default'}
              hint="R2 + DB jami"
              index={7}
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Daromad o'sishi"
            subtitle="Oxirgi 30 kun"
            action={
              <div className="text-xs text-[var(--color-text-muted)]">
                {revenueQuery.data && (
                  <>
                    Jami:{' '}
                    <span className="text-[var(--color-text)] font-semibold tabular-nums">
                      {formatUzs(revenueQuery.data.reduce((s, p) => s + p.revenue, 0))}
                    </span>
                  </>
                )}
              </div>
            }
          />
          <div className="p-5">
            {revenueQuery.isLoading || !revenueQuery.data ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <RevenueChart data={revenueQuery.data} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Tarif taqsimoti" subtitle="Faol obunalar" />
          <div className="p-5">
            {tariffQuery.isLoading || !tariffQuery.data ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <TariffDonut data={tariffQuery.data} />
            )}
          </div>
        </Card>
      </div>

      {/* Activity */}
      <Card>
        <CardHeader
          title="Faollik feed"
          subtitle="Real-vaqt platforma harakatlari"
          action={
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              Jonli
            </div>
          }
        />
        {activityQuery.isLoading || !activityQuery.data ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <ActivityFeed events={activityQuery.data} />
        )}
      </Card>
    </>
  );
}
