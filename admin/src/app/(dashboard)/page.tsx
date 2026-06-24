'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Eye, Package, Percent } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard, MoneyValue } from '@/components/dashboard/kpi-card';
import { LiveActivity } from '@/components/dashboard/live-activity';
import { TimeseriesChart } from '@/components/dashboard/timeseries-chart';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiStatsOverview, apiStatsTopProducts } from '@/lib/endpoints';
import { formatCount, formatMoney } from '@/lib/format';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const admin = useAuthStore((s) => s.admin);
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: apiStatsOverview,
  });
  const { data: topSales } = useQuery({
    queryKey: ['stats', 'top-products', 'sales'],
    queryFn: () => apiStatsTopProducts('sales', undefined, undefined, 5),
  });

  return (
    <div>
      <PageHeader title={`Salom, ${admin?.fullName ?? 'admin'}!`} description="Bugungi ko'rsatkichlar va live faollik" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loadingOverview || !overview ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[150px] rounded-2xl" />)
        ) : (
          <>
            <KpiCard
              title="Bugungi buyurtmalar"
              value={formatCount(overview.today.orders)}
              icon={<Package size={16} />}
              delta={overview.delta.orders}
            />
            <KpiCard
              title="Bugungi tushum"
              value={<MoneyValue value={overview.today.revenue} />}
              icon={<DollarSign size={16} />}
              delta={overview.delta.revenue}
            />
            <KpiCard
              title="Bugungi tashrif"
              value={formatCount(overview.today.uniqueVisitors)}
              icon={<Eye size={16} />}
              delta={overview.delta.uniqueVisitors}
            />
            <KpiCard
              title="Konversiya"
              value={`${overview.today.conversion}%`}
              icon={<Percent size={16} />}
              delta={overview.delta.conversion}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          <TimeseriesChart />
        </div>
        <LiveActivity />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Bugun eng ko'p sotilgan" />
          {topSales && topSales.length > 0 ? (
            <ul className="divide-y divide-[var(--color-border)]">
              {topSales.map((p, i) => (
                <li key={p.productId} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm font-semibold w-5 text-[var(--color-text-muted)]">{i + 1}</span>
                  {p.imageUrl ? (
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100">
                      <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.titleUz}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{p.quantity} dona sotildi</p>
                  </div>
                  <p className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap">{formatMoney(p.revenue ?? 0)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">Ma&apos;lumot yo&apos;q</div>
          )}
        </Card>
      </div>
    </div>
  );
}
