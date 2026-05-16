'use client';
import { PageHeader } from '@/components/layout/page-header';
import { ProductForm } from '@/components/products/product-form';

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title="Yangi mahsulot" backHref="/products" />
      <ProductForm />
    </div>
  );
}
