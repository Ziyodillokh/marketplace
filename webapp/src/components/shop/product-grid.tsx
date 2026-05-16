import type { ProductCard as ProductCardDto } from '@/lib/api/types';
import { ProductCard, ProductCardSkeleton } from './product-card';

export function ProductGrid({ items, loading }: { items: ProductCardDto[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
      {loading && Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={`s-${i}`} />)}
    </div>
  );
}
