import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Locale } from '@/i18n';

interface Props {
  price: number;
  oldPrice?: number | null;
  locale: Locale;
  size?: 'sm' | 'md' | 'lg';
  /** Kartochkalarda balandlik bir xil bo'lishi uchun eski narx maydoni hech qachon yo'qolmaydi (bo'sh placeholder). */
  reserveOldPriceSpace?: boolean;
  className?: string;
}

export function PriceLabel({
  price,
  oldPrice,
  locale,
  size = 'md',
  reserveOldPriceSpace = false,
  className,
}: Props) {
  const priceClass =
    size === 'lg' ? 'text-xl font-bold' : size === 'md' ? 'text-base font-semibold' : 'text-sm font-semibold';
  const oldClass = size === 'lg' ? 'text-sm' : 'text-xs';
  const hasOldPrice = oldPrice != null && oldPrice > price;
  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn(priceClass, 'text-[var(--color-primary)] leading-tight')}>
        {formatMoney(price, locale)}
      </span>
      {hasOldPrice ? (
        <span className={cn(oldClass, 'text-[var(--color-text-muted)] line-through leading-tight')}>
          {formatMoney(oldPrice as number, locale)}
        </span>
      ) : reserveOldPriceSpace ? (
        <span className={cn(oldClass, 'leading-tight invisible')} aria-hidden>
          &nbsp;
        </span>
      ) : null}
    </div>
  );
}
