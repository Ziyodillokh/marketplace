'use client';
import { useQuery } from '@tanstack/react-query';
import { apiGetRelated } from '@/lib/api/endpoints';
import { ProductCard } from './product-card';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';

export function RelatedProducts({ productId }: { productId: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['related', productId],
    queryFn: () => apiGetRelated(productId),
  });
  if (!isLoading && products.length === 0) return null;
  return (
    <section className="px-4 mt-6">
      <h2 className="text-lg font-bold mb-3">{tr(messages, 'product.related')}</h2>
      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
