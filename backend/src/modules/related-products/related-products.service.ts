import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { localizeTitle, type Locale } from '@/common/helpers/localize';
import type { ProductCardDto } from '../products/products.service';

@Injectable()
export class RelatedProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRelatedFor(productId: string, lang: Locale, userId?: string, limit = 8): Promise<ProductCardDto[]> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, categoryId: true },
    });
    if (!product) return [];

    const rules = await this.prisma.relatedRule.findMany({
      where: {
        isActive: true,
        OR: [
          { sourceProductId: productId },
          { sourceCategoryId: product.categoryId },
        ],
      },
      orderBy: { position: 'asc' },
    });

    const productIds = new Set<string>();
    const categoryIds = new Set<string>();
    for (const r of rules) {
      if (r.targetProductId) productIds.add(r.targetProductId);
      if (r.targetCategoryId) categoryIds.add(r.targetCategoryId);
    }

    const products: Array<{
      id: string;
      slug: string;
      titleUz: string;
      titleRu: string;
      brand: string | null;
      basePrice: unknown;
      oldPrice: unknown;
      discountPct: number | null;
      images: Array<{ url: string }>;
      variants: Array<{ stock: number }>;
    }> = [];

    if (productIds.size > 0) {
      const direct = await this.prisma.product.findMany({
        where: { id: { in: [...productIds] }, isActive: true, NOT: { id: productId } },
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          variants: { where: { isActive: true }, select: { stock: true } },
        },
        take: limit,
      });
      products.push(...direct);
    }

    if (products.length < limit && categoryIds.size > 0) {
      const byCat = await this.prisma.product.findMany({
        where: {
          categoryId: { in: [...categoryIds] },
          isActive: true,
          NOT: { id: productId },
          ...(products.length > 0 ? { id: { notIn: products.map((p) => p.id) } } : {}),
        },
        orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          variants: { where: { isActive: true }, select: { stock: true } },
        },
        take: limit - products.length,
      });
      products.push(...byCat);
    }

    // Fallback: featured from same category
    if (products.length < limit && product.categoryId) {
      const fallback = await this.prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          isActive: true,
          NOT: { id: productId },
          ...(products.length > 0 ? { id: { notIn: products.map((p) => p.id) } } : {}),
        },
        orderBy: [{ isFeatured: 'desc' }, { soldCount: 'desc' }],
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          variants: { where: { isActive: true }, select: { stock: true } },
        },
        take: limit - products.length,
      });
      products.push(...fallback);
    }

    const favIds = userId
      ? new Set(
          (
            await this.prisma.favorite.findMany({
              where: { userId, productId: { in: products.map((p) => p.id) } },
              select: { productId: true },
            })
          ).map((f) => f.productId),
        )
      : new Set<string>();

    return products.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: localizeTitle(p, lang),
      brand: p.brand,
      price: Number(p.basePrice),
      oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      discountPct: p.discountPct,
      imageUrl: p.images[0]?.url ?? null,
      isFavorite: favIds.has(p.id),
      outOfStock:
        p.variants.length === 0 ? false : p.variants.every((v) => v.stock <= 0),
      hasVariants: p.variants.length > 0,
    }));
  }
}
