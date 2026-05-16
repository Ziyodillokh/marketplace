import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { buildCursorPage, type CursorPage } from '@/common/helpers/pagination';

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

  async list(params: AdminListProductsParams): Promise<CursorPage<unknown>> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const take = limit + 1;
    const where: Prisma.ProductWhereInput = {
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

  async getById(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { id: 'asc' } },
        specs: { orderBy: { position: 'asc' } },
        category: true,
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
    };
  }

  async create(input: UpsertProductInput) {
    if (!input.titleUz || !input.titleRu) throw new BadRequestException('titles required');
    const slug = input.slug || (await this.uniqueSlug(slugify(input.titleUz)));
    const discountPct =
      input.discountPct ??
      (input.oldPrice && input.oldPrice > input.basePrice
        ? Math.round(((input.oldPrice - input.basePrice) / input.oldPrice) * 100)
        : null);
    const created = await this.prisma.product.create({
      data: {
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
    this.events.emit('product.created', { productId: created.id });
    return this.getById(created.id);
  }

  async update(id: string, input: Partial<UpsertProductInput>) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found');

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

    this.events.emit('product.updated', { productId: id });
    return this.getById(id);
  }

  async delete(id: string) {
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    this.events.emit('product.deleted', { productId: id });
    return { ok: true };
  }

  async hardDelete(id: string) {
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
