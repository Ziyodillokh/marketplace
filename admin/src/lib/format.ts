export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('ru-RU').format(Math.round(n)).replace(/,/g, ' ') + " so'm";
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  return x.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  return x.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  const diffSec = Math.round((Date.now() - x.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s oldin`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m oldin`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h oldin`;
  return formatDateTime(x);
}
