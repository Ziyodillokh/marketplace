'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import dayjs from 'dayjs';
import {
  Sparkles,
  Image as ImageIcon,
  FileText,
  Languages,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/kpi-card';
import {
  apiFetchAIDailyChart,
  apiFetchAIOverview,
  apiFetchAITopConsumers,
} from '@/lib/endpoints';
import type { AIOperation } from '@/lib/types';
import { TARIFF_META } from '@/lib/tariff';
import { formatNumber, formatPct, formatUsd, formatUzs } from '@/lib/format';

const OPERATION_META: Record<AIOperation, { label: string; icon: typeof Sparkles; color: string }> = {
  AUTO_FILL_TEXT: { label: 'Auto-fill (matn)', icon: FileText, color: '#6366F1' },
  IMAGE_GENERATE: { label: 'Rasm generatsiya', icon: ImageIcon, color: '#10B981' },
  IMAGE_ENHANCE: { label: 'Rasm yaxshilash', icon: Sparkles, color: '#F59E0B' },
  IMAGE_BG_REMOVE: { label: 'Fon olib tashlash', icon: ImageIcon, color: '#EF4444' },
  TRANSLATE: { label: 'Tarjima', icon: Languages, color: '#3B82F6' },
  CHAT: { label: 'Chat', icon: MessageCircle, color: '#8B5CF6' },
};

export default function AICreditsPage() {
  const overview = useQuery({ queryKey: ['ai-overview'], queryFn: apiFetchAIOverview });
  const chart = useQuery({ queryKey: ['ai-chart'], queryFn: () => apiFetchAIDailyChart(30) });
  const top = useQuery({ queryKey: ['ai-top'], queryFn: apiFetchAITopConsumers });

  return (
    <>
      <PageHeader
        title="AI Credits"
        subtitle="OpenAI sarflari, top consumer'lar va per-tenant tracking"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
        {overview.isLoading || !overview.data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <KpiCard
              label="Bu oydagi sarf"
              value={formatUsd(overview.data.mtd.costUsd)}
              icon={Sparkles}
              tone="primary"
              hint={`≈ ${formatUzs(overview.data.mtd.costUzs)}`}
              index={0}
            />
            <KpiCard
              label="Bugungi sarf"
              value={formatUsd(overview.data.today.costUsd)}
              icon={TrendingUp}
              tone="success"
              hint={`${formatNumber(overview.data.today.totalCalls)} chaqiruv`}
              index={1}
            />
            <KpiCard
              label="Generatsiya qilingan rasm"
              value={formatNumber(overview.data.mtd.totalImages)}
              icon={ImageIcon}
              tone="default"
              index={2}
            />
            <KpiCard
              label="Token (input + output)"
              value={formatNumber(
                overview.data.mtd.totalInputTokens + overview.data.mtd.totalOutputTokens,
              )}
              icon={FileText}
              tone="default"
              hint={`${formatNumber(overview.data.mtd.totalCalls)} chaqiruv`}
              index={3}
            />
          </>
        )}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Kunlik sarf" subtitle="Oxirgi 30 kun (USD)" />
          <CardBody>
            {chart.isLoading || !chart.data ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chart.data.map((d) => ({
                      ...d,
                      label: dayjs(d.date).format('DD MMM'),
                    }))}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="aiFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#2A2F40" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748B"
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#151823',
                        border: '1px solid #2A2F40',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#94A3B8' }}
                      formatter={(v: number) => [formatUsd(v), 'Sarf']}
                    />
                    <Area
                      type="monotone"
                      dataKey="costUsd"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      fill="url(#aiFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Operatsiya bo'yicha" subtitle="Bu oy" />
          <CardBody>
            {overview.isLoading || !overview.data ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="space-y-3">
                {overview.data.byOperation.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
                    Ma'lumot yo'q
                  </p>
                ) : (
                  overview.data.byOperation.map((op) => {
                    const meta = OPERATION_META[op.operation];
                    const Icon = meta?.icon ?? Sparkles;
                    const total = overview.data!.mtd.costUsd || 1;
                    const pct = (op.costUsd / total) * 100;
                    return (
                      <div key={op.operation}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color: meta?.color }} />
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {meta?.label ?? op.operation}
                            </span>
                          </div>
                          <span className="text-xs font-semibold tabular-nums text-[var(--color-text)]">
                            {formatUsd(op.costUsd)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: meta?.color ?? '#6366F1',
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-[var(--color-text-subtle)]">
                            {formatNumber(op.calls)} chaqiruv
                          </span>
                          <span className="text-[10px] text-[var(--color-text-subtle)]">
                            {formatPct(pct)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Top consumers */}
      <Card>
        <CardHeader
          title="Top 20 — eng ko'p AI ishlatadigan do'konlar"
          subtitle="Bu oy bo'yicha"
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left">
                <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] w-12">
                  #
                </th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                  Do'kon
                </th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                  Tarif
                </th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                  Chaqiruvlar
                </th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] text-right">
                  Sarf (USD)
                </th>
                <th className="py-3 px-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] text-right">
                  Sarf (UZS)
                </th>
              </tr>
            </thead>
            <tbody>
              {top.isLoading || !top.data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]">
                    <td colSpan={6} className="py-3 px-5">
                      <Skeleton className="h-10" />
                    </td>
                  </tr>
                ))
              ) : top.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <p className="text-[var(--color-text-muted)] text-sm">
                      Bu oyda AI sarflari yo'q
                    </p>
                  </td>
                </tr>
              ) : (
                top.data.map((c, i) => (
                  <tr
                    key={c.tenantId}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <td className="py-3 px-5 text-sm text-[var(--color-text-subtle)] tabular-nums">
                      {i + 1}
                    </td>
                    <td className="py-3 px-5">
                      {c.tenant ? (
                        <Link
                          href={`/tenants/${c.tenant.id}`}
                          className="flex items-center gap-2"
                        >
                          {c.tenant.logoUrl ? (
                            <img
                              src={c.tenant.logoUrl}
                              alt=""
                              className="h-7 w-7 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] grid place-items-center text-white text-xs font-semibold">
                              {c.tenant.shopName.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm text-[var(--color-text)]">
                            {c.tenant.shopName}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-sm text-[var(--color-text-subtle)] font-mono">
                          {c.tenantId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      {c.tenant && (
                        <Badge
                          variant={
                            `tier-${c.tenant.tariffPlan.toLowerCase()}` as
                              | 'tier-free'
                              | 'tier-standard'
                              | 'tier-pro'
                              | 'tier-premium'
                          }
                        >
                          {TARIFF_META[c.tenant.tariffPlan].icon}{' '}
                          {TARIFF_META[c.tenant.tariffPlan].label}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-5 text-sm tabular-nums text-[var(--color-text-muted)]">
                      {formatNumber(c.calls)}
                    </td>
                    <td className="py-3 px-5 text-sm tabular-nums font-semibold text-right">
                      {formatUsd(c.costUsd)}
                    </td>
                    <td className="py-3 px-5 text-sm tabular-nums text-[var(--color-text-muted)] text-right">
                      {formatUzs(c.costUzs)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
