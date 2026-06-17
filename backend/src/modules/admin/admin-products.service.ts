import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { buildCursorPage, type CursorPage } from '@/common/helpers/pagination';
import { limitsFor, type TariffLimits } from '@/common/tariff';

/** tenantId — joriy do'kon (null = platforma egasi, cheklovsiz/global). */
export type TenantId = string | null | undefined;

export interface AdminListProductsParams {
  q?: string;
  categoryId?: string;
  status?: 'active' | 'inactive' | 'all';
  cursor?: string;
  limit?: number;
}

export interface VariantInput {
  id?: string;
  color?: string | null;
  size?: string | null;
  price: number;
  oldPrice?: number | null;
  stock: number;
  sku?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface SpecInput {
  id?: string;
  labelUz: string;
  labelRu: string;
  valueUz: string;
  valueRu: string;
  position?: number;
}

export interface ImageInput {
  id?: string;
  url: string;
  position?: number;
}

export interface UpsertProductInput {
  slug?: string;
  sku?: string | null;
  titleUz: string;
  titleRu: string;
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  categoryId: string;
  brand?: string | null;
  basePrice: number;
  oldPrice?: number | null;
  discountPct?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  images?: ImageInput[];
  variants?: VariantInput[];
  specs?: SpecInput[];
  /**
   * Post-purchase tavsiyalar uchun mahsulotlar. Mahsulot saqlanganda
   * mavjud `RelatedRule(sourceProductId=this)` bir-bir o'chiriladi va shu ro'yxatdan yangidan yaratiladi.
   */
  relatedProductIds?: string[];
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 120);
}

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventEmitter2) {}

  private async tariffLimits(tenantId: TenantId): Promise<TariffLimits | null> {
    if (!tenantId) return null;
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tariffPlan: true },
    });
    return limitsFor(t?.tariffPlan ?? 'FREE');
  }

  /** Rasm/opsiya soni tarif limitidan oshmasligini tekshiradi (kamiga ruxsat). */
  private assertImageOptionLimits(
    limits: TariffLimits | null,
    images?: unknown[],
    variants?: unknown[],
  ): void {
    if (!limits) return;
    if (limits.maxImagesPerProduct >= 0 && (images?.length ?? 0) > limits.maxImagesPerProduct) {
      throw new ForbiddenException({
        message: `Bu tarifда mahsulotga ko'pi bilan ${limits.maxImagesPerProduct} ta rasm yuklash mumkin. Tarifni yangilang.`,
        upgradeRequired: true,
      });
    }
    if (limits.maxOptionsPerProduct >= 0 && (variants?.length ?? 0) > limits.maxOptionsPerProduct) {
      throw new ForbiddenException({
        message: `Bu tarifда mahsulotga ko'pi bilan ${limits.maxOptionsPerProduct} ta opsiya (variant) mumkin. Tarifni yangilang.`,
        upgradeRequired: true,
      });
    }
  }

  /** Kategoriya global yoki shu tenant'niki ekanini tekshiradi. */
  private async assertCategoryAllowed(
    categoryId: string | undefined,
    tenantId: TenantId,
  ): Promise<void> {
    if (!tenantId || !categoryId) return;
    const cat = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { tenantId: true },
    });
    if (!cat || (cat.tenantId && cat.tenantId !== tenantId)) {
      throw new BadRequestException("Noto'g'ri kategoriya");
    }
  }

  /** Mahsulot tenant'ga tegishliligini tekshiradi (owner uchun o'tkazib yuboriladi). */
  private async assertOwnProduct(id: string, tenantId: TenantId): Promise<void> {
    if (!tenantId) return;
    const p = await this.prisma.product.findUnique({ where: { id }, select: { tenantId: true } });
    if (!p) throw new NotFoundException('Product not found');
    if (p.tenantId !== tenantId) throw new NotFoundException('Product not found');
  }

  async list(params: AdminListProductsParams, tenantId?: TenantId): Promise<CursorPage<unknown>> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const take = limit + 1;
    const where: Prisma.ProductWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.status === 'active' ? { isActive: true } : params.status === 'inactive' ? { isActive: false } : {}),
      ...(params.q
        ? {
            OR: [
              { titleUz: { contains: params.q, mode: 'insensitive' } },
              { titleRu: { contains: params.q, mode: 'insensitive' } },
              { sku: { contains: params.q, mode: 'insensitive' } },
              { brand: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.product.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        category: true,
        variants: { where: { isActive: true }, select: { stock: true } },
        _count: { select: { orderItems: true } },
      },
    });
    const items = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      titleUz: p.titleUz,
      titleRu: p.titleRu,
      brand: p.brand,
      basePrice: Number(p.basePrice),
      oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      discountPct: p.discountPct,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      imageUrl: p.images[0]?.url ?? null,
      categoryId: p.categoryId,
      categoryTitle: p.category.titleUz,
      totalStock: p.variants.reduce((a, v) => a + v.stock, 0),
      ordersCount: p._count.orderItems,
      soldCount: p.soldCount,
      viewCount: p.viewCount,
      createdAt: p.createdAt,
    }));
    return buildCursorPage(items, limit);
  }

  async getById(id: string, tenantId?: TenantId) {
    await this.assertOwnProduct(id, tenantId);
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { id: 'asc' } },
        specs: { orderBy: { position: 'asc' } },
        category: true,
        sourceRelatedRules: {
          where: { targetProductId: { not: null } },
          orderBy: { position: 'asc' },
          include: {
            targetProduct: {
              select: {
                id: true,
                titleUz: true,
                titleRu: true,
                basePrice: true,
                images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    });
    if (!p) throw new NotFoundException('Product not found');
    return {
      ...p,
      basePrice: Number(p.basePrice),
      oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
      variants: p.variants.map((v) => ({
        ...v,
        price: Number(v.price),
        oldPrice: v.oldPrice ? Number(v.oldPrice) : null,
      })),
      relatedProducts: p.sourceRelatedRules
        .filter((r) => r.targetProduct)
        .map((r) => ({
          id: r.targetProduct!.id,
          titleUz: r.targetProduct!.titleUz,
          titleRu: r.targetProduct!.titleRu,
          basePrice: Number(r.targetProduct!.basePrice),
          imageUrl: r.targetProduct!.images[0]?.url ?? null,
        })),
    };
  }

  /** RelatedRule(sourceProductId=productId, targetProductId IN ids) ro'yxatini almashtiradi. */
  private async replaceRelatedRules(productId: string, targetIds: string[]): Promise<void> {
    // Avval mavjud product-to-product qoidalarini o'chiramiz
    await this.prisma.relatedRule.deleteMany({
      where: { sourceProductId: productId, targetProductId: { not: null } },
    });
    if (targetIds.length === 0) return;
    // Self-reference va dublikatlarni filtrlaymiz
    const unique = Array.from(new Set(targetIds.filter((id) => id && id !== productId)));
    if (unique.length === 0) return;
    await this.prisma.relatedRule.createMany({
      data: unique.map((targetProductId, position) => ({
        sourceProductId: productId,
        targetProductId,
        position,
        isActive: true,
      })),
    });
  }

  async create(input: UpsertProductInput, tenantId?: TenantId) {
    if (!input.titleUz || !input.titleRu) throw new BadRequestException('titles required');
    // Tarif limiti (faqat tenant'li sotuvchilar uchun)
    if (tenantId) {
      const limits = await this.tariffLimits(tenantId);
      if (limits && limits.maxProducts >= 0) {
        const count = await this.prisma.product.count({ where: { tenantId } });
        if (count >= limits.maxProducts) {
          throw new ForbiddenException({
            message: `Mahsulot limiti (${limits.maxProducts}) tugadi. Tarifni yangilang.`,
            upgradeRequired: true,
          });
        }
      }
      this.assertImageOptionLimits(limits, input.images, input.variants);
    }
    await this.assertCategoryAllowed(input.categoryId, tenantId);
    // Aniq slug ham unique tekshiruvidan o'tadi (dublikat → 500 emas, suffiks qo'shiladi)
    const slug = await this.uniqueSlug(slugify(input.slug ?? input.titleUz));
    const discountPct =
      input.discountPct ??
      (input.oldPrice && input.oldPrice > input.basePrice
        ? Math.round(((input.oldPrice - input.basePrice) / input.oldPrice) * 100)
        : null);
    const created = await this.prisma.product.create({
      data: {
        tenantId: tenantId ?? null,
        slug,
        sku: input.sku ?? null,
        titleUz: input.titleUz,
        titleRu: input.titleRu,
        descriptionUz: input.descriptionUz ?? null,
        descriptionRu: input.descriptionRu ?? null,
        categoryId: input.categoryId,
        brand: input.brand ?? null,
        basePrice: input.basePrice,
        oldPrice: input.oldPrice ?? null,
        discountPct,
        isActive: input.isActive ?? true,
        isFeatured: input.isFeatured ?? false,
        images: {
          create: (input.images ?? []).map((img, i) => ({
            url: img.url,
            position: img.position ?? i,
          })),
        },
        variants: {
          create: (input.variants ?? []).map((v) => ({
            color: v.color ?? null,
            size: v.size ?? null,
            price: v.price,
            oldPrice: v.oldPrice ?? null,
            stock: v.stock,
            sku: v.sku ?? null,
            imageUrl: v.imageUrl ?? null,
            isActive: v.isActive ?? true,
          })),
        },
        specs: {
          create: (input.specs ?? []).map((s, i) => ({
            labelUz: s.labelUz,
            labelRu: s.labelRu,
            valueUz: s.valueUz,
            valueRu: s.valueRu,
            position: s.position ?? i,
          })),
        },
      },
    });
    if (input.relatedProductIds !== undefined) {
      await this.replaceRelatedRules(created.id, input.relatedProductIds);
    }

    this.events.emit('product.created', { productId: created.id });
    return this.getById(created.id, tenantId);
  }

  async update(id: string, input: Partial<UpsertProductInput>, tenantId?: TenantId) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');
    if (tenantId && existing.tenantId !== tenantId) throw new NotFoundException('Product not found');
    await this.assertCategoryAllowed(input.categoryId, tenantId);
    if (tenantId) {
      this.assertImageOptionLimits(await this.tariffLimits(tenantId), input.images, input.variants);
    }

    const discountPct =
      input.oldPrice !== undefined || input.basePrice !== undefined
        ? input.oldPrice && (input.basePrice ?? Number(existing.basePrice)) < input.oldPrice
          ? Math.round(
              ((input.oldPrice - (input.basePrice ?? Number(existing.basePrice))) / input.oldPrice) * 100,
            )
          : null
        : undefined;

    await this.prisma.product.update({
      where: { id },
      data: {
        slug: input.slug,
        sku: input.sku,
        titleUz: input.titleUz,
        titleRu: input.titleRu,
        descriptionUz: input.descriptionUz,
        descriptionRu: input.descriptionRu,
        categoryId: input.categoryId,
        brand: input.brand,
        basePrice: input.basePrice,
        oldPrice: input.oldPrice,
        discountPct,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
      },
    });

    // Replace images if provided
    if (input.images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      await this.prisma.productImage.createMany({
        data: input.images.map((img, i) => ({
          productId: id,
          url: img.url,
          position: img.position ?? i,
        })),
      });
    }

    // Upsert variants if provided
    if (input.variants) {
      const ids = input.variants.filter((v) => v.id).map((v) => v.id!);
      await this.prisma.productVariant.deleteMany({
        where: { productId: id, NOT: { id: { in: ids } } },
      });
      for (const v of input.variants) {
        if (v.id) {
          await this.prisma.productVariant.update({
            where: { id: v.id },
            data: {
              color: v.color,
              size: v.size,
              price: v.price,
              oldPrice: v.oldPrice,
              stock: v.stock,
              sku: v.sku,
              imageUrl: v.imageUrl,
              isActive: v.isActive ?? true,
            },
          });
        } else {
          await this.prisma.productVariant.create({
            data: {
              productId: id,
              color: v.color ?? null,
              size: v.size ?? null,
              price: v.price,
              oldPrice: v.oldPrice ?? null,
              stock: v.stock,
              sku: v.sku ?? null,
              imageUrl: v.imageUrl ?? null,
              isActive: v.isActive ?? true,
            },
          });
        }
      }
    }

    // Replace specs if provided
    if (input.specs) {
      await this.prisma.productSpec.deleteMany({ where: { productId: id } });
      await this.prisma.productSpec.createMany({
        data: input.specs.map((s, i) => ({
          productId: id,
          labelUz: s.labelUz,
          labelRu: s.labelRu,
          valueUz: s.valueUz,
          valueRu: s.valueRu,
          position: s.position ?? i,
        })),
      });
    }

    if (input.relatedProductIds !== undefined) {
      await this.replaceRelatedRules(id, input.relatedProductIds);
    }

    this.events.emit('product.updated', { productId: id });
    return this.getById(id, tenantId);
  }

  async delete(id: string, tenantId?: TenantId) {
    await this.assertOwnProduct(id, tenantId);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    this.events.emit('product.deleted', { productId: id });
    return { ok: true };
  }

  async hardDelete(id: string, tenantId?: TenantId) {
    await this.assertOwnProduct(id, tenantId);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base || `product-${Date.now()}`;
    let i = 0;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    return slug;
  }
}
