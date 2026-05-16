'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { ProductForm } from '@/components/products/product-form';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGetAdminProduct } from '@/lib/endpoints';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => apiGetAdminProduct(id),
  });

  return (
    <div>
      <PageHeader title={data?.titleUz ?? 'Mahsulot'} description="Tahrirlash" backHref="/products" />
      {isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <ProductForm existing={data} />
      )}
    </div>
  );
}
