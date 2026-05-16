import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Locale } from '@/i18n';

interface Props {
  price: number;
  oldPrice?: number | null;
  locale: Locale;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PriceLabel({ price, oldPrice, locale, size = 'md', className }: Props) {
  const priceClass = size === 'lg' ? 'text-xl font-bold' : size === 'md' ? 'text-base font-semibold' : 'text-sm font-semibold';
  const oldClass = size === 'lg' ? 'text-sm' : 'text-xs';
  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn(priceClass, 'text-[var(--color-primary)]')}>{formatMoney(price, locale)}</span>
      {oldPrice && oldPrice > price && (
        <span className={cn(oldClass, 'text-[var(--color-text-muted)] line-through')}>{formatMoney(oldPrice, locale)}</span>
      )}
    </div>
  );
}
