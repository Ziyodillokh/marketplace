import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { localizeDescription, localizeTitle, type Locale } from '@/common/helpers/localize';
import { buildCursorPage, type CursorPage } from '@/common/helpers/pagination';

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'bestsellers' | 'discount';

export interface ListProductsParams {
  q?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sort?: ProductSort;
  cursor?: string;
  limit?: number;
  featuredOnly?: boolean;
}

export interface ProductCardDto {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  price: number;
  oldPrice: number | null;
  discountPct: number | null;
  imageUrl: string | null;
  isFavorite?: boolean;
  outOfStock: boolean;
  hasVariants: boolean;
  /** Birinchi mavjud variantId — kartochkadan to'g'ridan savatga qo'shish uchun */
  defaultVariantId: string | null;
}

export interface ProductDetailDto extends ProductCardDto {
  description: string | null;
  images: Array<{ id: string; url: string; position: number }>;
  variants: Array<{
    id: string;
    color: string | null;
    size: string | null;
    price: number;
    oldPrice: number | null;
    stock: number;
    imageUrl: string | null;
    sku: string | null;
  }>;
  specs: Array<{ label: string; value: string }>;
  category: { id: string; slug: string; title: string };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    params: ListProductsParams,
    lang: Locale,
    userId?: string,
    tenantId?: string | null,
  ): Promise<CursorPage<ProductCardDto>> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const take = limit + 1;

    let categoryId = params.categoryId;
    if (!categoryId && params.categorySlug) {
      const cat = await this.prisma.category.findUnique({ where: { slug: params.categorySlug } });
      categoryId = cat?.id;
    }

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      // Multi-tenant: do'kon bo'lsa o'sha sotuvchi mahsulotlari, bo'lmasa legacy (null)
      tenantId: tenantId ?? null,
      ...(categoryId ? { categoryId } : {}),
      ...(params.brand ? { brand: { equals: params.brand, mode: 'insensitive' } } : {}),
      ...(params.featuredOnly ? { isFeatured: true } : {}),
      ...(params.minPrice || params.maxPrice
        ? {
            basePrice: {
              ...(params.minPrice ? { gte: params.minPrice } : {}),
              ...(params.maxPrice ? { lte: params.maxPrice } : {}),
            },
          }
        : {}),
      ...(params.q
        ? {
            OR: [
              { titleUz: { contains: params.q, mode: 'insensitive' } },
              { titleRu: { contains: params.q, mode: 'insensitive' } },
              { brand: { contains: params.q, mode: 'insensitive' } },
              { sku: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = (() => {
      switch (params.sort) {
        case 'price_asc':
          return [{ basePrice: 'asc' }, { id: 'desc' }];
        case 'price_desc':
          return [{ basePrice: 'desc' }, { id: 'desc' }];
        case 'bestsellers':
          return [{ soldCount: 'desc' }, { id: 'desc' }];
        case 'discount':
          return [{ discountPct: 'desc' }, { id: 'desc' }];
        case 'newest':
        default:
          return [{ createdAt: 'desc' }, { id: 'desc' }];
      }
    })();

    const rows = await this.prisma.product.findMany({
      where,
      orderBy,
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { where: { isActive: true }, select: { id: true, stock: true }, orderBy: { id: 'asc' } },
      },
    });

    const favoriteIds = userId
      ? new Set(
          (
            await this.prisma.favorite.findMany({
              where: { userId, productId: { in: rows.map((r) => r.id) } },
              select: { productId: true },
            })
          ).map((f) => f.productId),
        )
      : new Set<string>();

    const items: ProductCardDto[] = rows.map((p) => {
      const firstAvailable = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
      return {
        id: p.id,
        slug: p.slug,
        title: localizeTitle(p, lang),
        brand: p.brand,
        price: Number(p.basePrice),
        oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
        discountPct: p.discountPct,
        imageUrl: p.images[0]?.url ?? null,
        isFavorite: favoriteIds.has(p.id),
        outOfStock:
          p.variants.length === 0
            ? false
            : p.variants.every((v) => v.stock <= 0),
        hasVariants: p.variants.length > 0,
        defaultVariantId: firstAvailable?.id ?? null,
      };
    });

    return buildCursorPage(items, limit);
  }

  async getById(
    id: string,
    lang: Locale,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ProductDetailDto> {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { where: { isActive: true } },
        specs: { orderBy: { position: 'asc' } },
        category: true,
      },
    });
    if (!p || !p.isActive) throw new NotFoundException('Product not found');
    // Boshqa do'kon mahsulotini ko'rsatmaymiz
    if ((p.tenantId ?? null) !== (tenantId ?? null)) throw new NotFoundException('Product not found');

    await this.prisma.product.update({
      where: { id: p.id },
      data: { viewCount: { increment: 1 } },
    });

    const isFavorite = userId
      ? Boolean(
          await this.prisma.favorite.findUnique({
            where: { userId_productId: { userId, productId: p.id } },
          }),
        )
      : false;

    return {
      id: p.id,
      slug: p.slug,
      title: localizeTitle(p, lang),
      brand: p.brand,
      price: Number(p.basePrice),
      oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      discountPct: p.discountPct,
      imageUrl: p.images[0]?.url ?? null,
      isFavorite,
      outOfStock: p.variants.length === 0 ? false : p.variants.every((v) => v.stock <= 0),
      hasVariants: p.variants.length > 0,
      defaultVariantId:
        p.variants.find((v) => v.stock > 0)?.id ?? p.variants[0]?.id ?? null,
      description: localizeDescription(p, lang),
      images: p.images.map((img) => ({ id: img.id, url: img.url, position: img.position })),
      variants: p.variants.map((v) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        price: Number(v.price),
        oldPrice: v.oldPrice ? Number(v.oldPrice) : null,
        stock: v.stock,
        imageUrl: v.imageUrl,
        sku: v.sku,
      })),
      specs: p.specs.map((s) => ({
        label: lang === 'ru' ? s.labelRu : s.labelUz,
        value: lang === 'ru' ? s.valueRu : s.valueUz,
      })),
      category: {
        id: p.category.id,
        slug: p.category.slug,
        title: localizeTitle(p.category, lang),
      },
    };
  }

  async getBySlug(
    slug: string,
    lang: Locale,
    userId?: string,
    tenantId?: string | null,
  ): Promise<ProductDetailDto> {
    const p = await this.prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!p) throw new NotFoundException('Product not found');
    return this.getById(p.id, lang, userId, tenantId);
  }
}
