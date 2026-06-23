'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lock, Package, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  apiMyStore,
  apiStatsCartAbandonment,
  apiStatsFunnel,
  apiStatsTopCategories,
  apiStatsTopProducts,
} from '@/lib/endpoints';
import { formatMoney } from '@/lib/format';

type Period = '7d' | '30d' | '90d';

function rangeFor(p: Period): { from: string; to: string } {
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90;
  const to = new Date().toISOString();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return { from, to };
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('7d');
  const { from, to } = rangeFor(period);

  const { data: store } = useQuery({ queryKey: ['my-store'], queryFn: apiMyStore });
  // Tenant'siz admin (owner) → ruxsat; tenant bo'lsa tarifga qarab
  const analyticsAllowed = store ? (store.limits?.analytics ?? true) : undefined;
  const enabled = analyticsAllowed === true;

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ['stats', 'funnel', period],
    queryFn: () => apiStatsFunnel(from, to),
    enabled,
  });
  const { data: topProducts } = useQuery({
    queryKey: ['stats', 'top-products', 'sales', period],
    queryFn: () => apiStatsTopProducts('sales', from, to, 10),
    enabled,
  });
  const { data: topCategories } = useQuery({
    queryKey: ['stats', 'top-categories', period],
    queryFn: () => apiStatsTopCategories(from, to),
    enabled,
  });
  const { data: abandonment } = useQuery({
    queryKey: ['stats', 'cart-abandonment', period],
    queryFn: () => apiStatsCartAbandonment(from, to),
    enabled,
  });

  if (analyticsAllowed === false) {
    return (
      <div>
        <PageHeader title="Analytics" />
        <Card>
          <CardBody className="text-center py-10 space-y-3">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] items-center justify-center">
              <Lock size={22} />
            </div>
            <h2 className="text-lg font-bold">Statistika yopiq</h2>
            <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto">
              Do&apos;kon statistikasi <b>Standart</b> va undan yuqori tariflarda mavjud. Ochish uchun
              tarifingizni yangilang.
            </p>
            <Link href="/settings" className="inline-block">
              <Button>Tarifni yangilash</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        rightSlot={
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'h-9 px-3 rounded-lg text-xs font-medium',
                  period === p
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-white text-[var(--color-text-muted)] border border-[var(--color-border)]',
                )}
              >
                {p === '7d' ? '7 kun' : p === '30d' ? '30 kun' : '90 kun'}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Konversiya voronkasi" />
          <CardBody>
            {funnelLoading || !funnel ? (
              <Skeleton className="h-40" />
            ) : (
              <Funnel data={funnel} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top kategoriyalar (qiziqish)" />
          <CardBody className="h-72">
            {!topCategories ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke="#94A3B8" />
                  <YAxis dataKey="titleUz" type="category" width={120} fontSize={11} stroke="#94A3B8" />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="interactions" fill="#2F6BFF" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Eng ko'p sotilgan mahsulotlar" />
          {!topProducts ? (
            <Skeleton className="h-40" />
          ) : topProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Hozircha sotuv yo'q"
              hint="Birinchi buyurtmalar kelgach, eng ko'p sotilgan mahsulotlar shu yerda chiqadi."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {topProducts.map((p, i) => (
                <li key={p.productId} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-sm font-semibold w-5 text-[var(--color-text-muted)]">{i + 1}</span>
                  {p.imageUrl ? (
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.titleUz}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{p.quantity} dona sotildi</p>
                  </div>
                  <p className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap">{formatMoney(p.revenue ?? 0)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Tashlab ketilgan savatlar"
            subtitle="Savatga qo'shilgan, lekin hali sotib olinmagan mahsulotlar"
          />
          {!abandonment ? (
            <Skeleton className="h-40" />
          ) : abandonment.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Tashlab ketilgan savat yo'q"
              hint="Mijoz mahsulotni savatga qo'shib, sotib olmasa — shu yerda ko'rinadi va ularni qaytarish uchun chora ko'rishingiz mumkin."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {abandonment.map((p) => (
                <li key={p.productId} className="px-4 py-3 flex items-center gap-3">
                  {p.imageUrl ? (
                    <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 shrink-0" />
                  )}
                  <p className="flex-1 text-sm font-medium truncate">{p.titleUz}</p>
                  <span className="text-sm font-semibold text-[var(--color-danger)]">{p.abandonedCount}× qo&apos;shdi</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Funnel({
  data,
}: {
  data: { visits: number; productViews: number; cartAdds: number; checkouts: number; orders: number };
}) {
  const stages = [
    { label: 'Tashriflar', value: data.visits },
    { label: 'Mahsulot ko\'rdi', value: data.productViews },
    { label: 'Savatga qo\'shdi', value: data.cartAdds },
    { label: 'Checkout boshladi', value: data.checkouts },
    { label: 'Buyurtma berdi', value: data.orders },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const prevValue = i > 0 ? stages[i - 1]!.value : 0;
        const conversionPct = i > 0 && prevValue > 0 ? Math.round((s.value / prevValue) * 100) : null;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">{s.label}</span>
              <span className="text-[var(--color-text-muted)]">
                {s.value}
                {conversionPct !== null && <span className="ml-2 text-[var(--color-primary)]">{conversionPct}%</span>}
              </span>
            </div>
            <div className="h-7 bg-gray-100 rounded-md overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-info)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
