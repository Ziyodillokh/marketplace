import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { localizeTitle, type Locale } from '@/common/helpers/localize';
import type { ProductCardDto } from '../products/products.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, lang: Locale): Promise<ProductCardDto[]> {
    const favs = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: { orderBy: { position: 'asc' }, take: 1 },
            variants: { where: { isActive: true }, select: { id: true, stock: true }, orderBy: { id: 'asc' } },
          },
        },
      },
    });

    return favs.map((f) => ({
      id: f.product.id,
      slug: f.product.slug,
      title: localizeTitle(f.product, lang),
      brand: f.product.brand,
      price: Number(f.product.basePrice),
      oldPrice: f.product.oldPrice ? Number(f.product.oldPrice) : null,
      discountPct: f.product.discountPct,
      imageUrl: f.product.images[0]?.url ?? null,
      isFavorite: true,
      hasVariants: f.product.variants.length > 0,
      defaultVariantId:
        f.product.variants.find((v) => v.stock > 0)?.id ?? f.product.variants[0]?.id ?? null,
      outOfStock:
        f.product.variants.length === 0
          ? false
          : f.product.variants.every((v) => v.stock <= 0),
    }));
  }

  async toggle(userId: string, productId: string): Promise<{ isFavorite: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { isFavorite: false };
    }
    await this.prisma.favorite.create({ data: { userId, productId } });
    return { isFavorite: true };
  }

  async add(userId: string, productId: string): Promise<{ isFavorite: true }> {
    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
    return { isFavorite: true };
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
  }

  async count(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.favorite.count({ where: { userId } });
    return { count };
  }
}
