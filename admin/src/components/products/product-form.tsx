'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ImageUploader } from './image-uploader';
import { VariantsEditor } from './variants-editor';
import { SpecsEditor } from './specs-editor';
import { RelatedProductsPicker, type RelatedProductMini } from './related-products-picker';
import {
  apiAdminCategoriesTree,
  apiCreateAdminProduct,
  apiDeleteAdminProduct,
  apiUpdateAdminProduct,
} from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';
import type { AdminCategoryNode, AdminProductDetail } from '@/lib/types';

function flatten(nodes: AdminCategoryNode[], depth = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: '— '.repeat(depth) + n.titleUz });
    out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

interface FormState {
  titleUz: string;
  titleRu: string;
  descriptionUz: string;
  descriptionRu: string;
  categoryId: string;
  brand: string;
  basePrice: number;
  oldPrice: number | '';
  isActive: boolean;
  isFeatured: boolean;
  images: Array<{ id?: string; url: string; position?: number }>;
  variants: Array<{
    id?: string;
    color: string | null;
    size: string | null;
    price: number;
    oldPrice: number | null;
    stock: number;
    sku: string | null;
    imageUrl: string | null;
    isActive: boolean;
  }>;
  specs: Array<{
    id?: string;
    labelUz: string;
    labelRu: string;
    valueUz: string;
    valueRu: string;
    position?: number;
  }>;
  relatedProducts: RelatedProductMini[];
}

export function ProductForm({ existing }: { existing?: AdminProductDetail }) {
  const router = useRouter();
  const { data: categories } = useQuery({ queryKey: ['categories', 'tree'], queryFn: apiAdminCategoriesTree });

  const [form, setForm] = useState<FormState>({
    titleUz: existing?.titleUz ?? '',
    titleRu: existing?.titleRu ?? '',
    descriptionUz: existing?.descriptionUz ?? '',
    descriptionRu: existing?.descriptionRu ?? '',
    categoryId: existing?.categoryId ?? '',
    brand: existing?.brand ?? '',
    basePrice: existing?.basePrice ?? 0,
    oldPrice: existing?.oldPrice ?? '',
    isActive: existing?.isActive ?? true,
    isFeatured: existing?.isFeatured ?? false,
    images: existing?.images ?? [],
    variants: existing?.variants ?? [],
    specs: existing?.specs ?? [],
    relatedProducts: existing?.relatedProducts ?? [],
  });

  useEffect(() => {
    if (!form.titleRu && form.titleUz) {
      setForm((f) => ({ ...f, titleRu: form.titleUz }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.titleUz]);

  const buildBody = () => ({
    titleUz: form.titleUz,
    titleRu: form.titleRu || form.titleUz,
    descriptionUz: form.descriptionUz || null,
    descriptionRu: form.descriptionRu || form.descriptionUz || null,
    categoryId: form.categoryId,
    brand: form.brand || null,
    basePrice: Number(form.basePrice),
    oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice),
    isActive: form.isActive,
    isFeatured: form.isFeatured,
    images: form.images.map((img, i) => ({ url: img.url, position: i })),
    variants: form.variants.map((v) => ({
      id: v.id,
      color: v.color,
      size: v.size,
      price: Number(v.price),
      oldPrice: v.oldPrice === null ? null : Number(v.oldPrice),
      stock: Number(v.stock),
      sku: v.sku,
      imageUrl: v.imageUrl,
      isActive: v.isActive ?? true,
    })),
    specs: form.specs.map((s, i) => ({
      id: s.id,
      labelUz: s.labelUz,
      labelRu: s.labelRu || s.labelUz,
      valueUz: s.valueUz,
      valueRu: s.valueRu || s.valueUz,
      position: i,
    })),
    relatedProductIds: form.relatedProducts.map((p) => p.id),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      existing ? apiUpdateAdminProduct(existing.id, buildBody()) : apiCreateAdminProduct(buildBody()),
    onSuccess: (data) => {
      toast.success(existing ? 'Yangilandi' : 'Yaratildi');
      if (!existing) router.push(`/products/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDeleteAdminProduct(existing!.id),
    onSuccess: () => {
      toast.success("O'chirildi");
      router.push('/products');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit = form.titleUz && form.categoryId && form.basePrice > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader title="Asosiy ma'lumotlar" />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nomi (uz) *">
                <Input value={form.titleUz} onChange={(e) => setForm({ ...form, titleUz: e.target.value })} required />
              </Field>
              <Field label="Nomi (ru)">
                <Input value={form.titleRu} onChange={(e) => setForm({ ...form, titleRu: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Kategoriya *">
                <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                  <option value="">Tanlang...</option>
                  {categories &&
                    flatten(categories).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Brend">
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Apple, Samsung..." />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Narx *">
                <Input
                  type="number"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                  required
                />
              </Field>
              <Field label="Eski narx (chegirma uchun)">
                <Input
                  type="number"
                  value={form.oldPrice}
                  onChange={(e) => setForm({ ...form, oldPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Tavsif (uz)">
              <Textarea value={form.descriptionUz} onChange={(e) => setForm({ ...form, descriptionUz: e.target.value })} rows={3} />
            </Field>
            <Field label="Tavsif (ru)">
              <Textarea value={form.descriptionRu} onChange={(e) => setForm({ ...form, descriptionRu: e.target.value })} rows={3} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Rasmlar" />
          <CardBody>
            <ImageUploader images={form.images} onChange={(images) => setForm({ ...form, images })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Variantlar (rang, o'lcham)" />
          <CardBody>
            <VariantsEditor variants={form.variants} onChange={(variants) => setForm({ ...form, variants })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Xususiyatlar" />
          <CardBody>
            <SpecsEditor specs={form.specs} onChange={(specs) => setForm({ ...form, specs })} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Tavsiya etilgan mahsulotlar"
            subtitle="Foydalanuvchi bu mahsulotni sotib olganda 1 daqiqadan keyin bot orqali shu mahsulotlar tavsiya qilinadi (chexol, aksessuar va h.k.)"
          />
          <CardBody>
            <RelatedProductsPicker
              excludeProductId={existing?.id}
              value={form.relatedProducts}
              onChange={(relatedProducts) => setForm({ ...form, relatedProducts })}
            />
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Sozlamalar" />
          <CardBody className="space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>Faol</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-5 w-9 appearance-none rounded-full bg-gray-200 checked:bg-[var(--color-primary)] relative cursor-pointer transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Tavsiya etilgan (Featured)</span>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                className="h-5 w-9 appearance-none rounded-full bg-gray-200 checked:bg-[var(--color-primary)] relative cursor-pointer transition-colors before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
              />
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            <Button type="submit" fullWidth loading={saveMutation.isPending} disabled={!canSubmit}>
              {existing ? 'Saqlash' : 'Yaratish'}
            </Button>
            {existing && (
              <Button
                type="button"
                fullWidth
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("O'chirilsinmi?")) deleteMutation.mutate();
                }}
              >
                O&apos;chirish
              </Button>
            )}
          </CardBody>
        </Card>
      </div>
    </form>
  );
}
