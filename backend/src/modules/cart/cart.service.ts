import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { localizeTitle, type Locale } from '@/common/helpers/localize';

export interface CartItemDto {
  id: string;
  productId: string;
  variantId: string | null;
  title: string;
  variantLabel: string | null;
  imageUrl: string | null;
  unitPrice: number;
  oldPrice: number | null;
  quantity: number;
  stock: number;
  lineTotal: number;
}

export interface CartSummary {
  count: number;
  subtotal: number;
}

export interface CartView {
  items: CartItemDto[];
  summary: CartSummary;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private buildVariantLabel(v: { color: string | null; size: string | null }, lang: Locale): string | null {
    const parts: string[] = [];
    if (v.color) parts.push(`${lang === 'ru' ? 'Цвет' : 'Rang'}: ${v.color}`);
    if (v.size) parts.push(`${lang === 'ru' ? 'Размер' : "O'lcham"}: ${v.size}`);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  async getCart(userId: string, lang: Locale): Promise<CartView> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        product: {
          include: {
            images: { orderBy: { position: 'asc' }, take: 1 },
          },
        },
        variant: true,
      },
    });

    const dtos: CartItemDto[] = items.map((i) => {
      const unitPrice = i.variant ? Number(i.variant.price) : Number(i.product.basePrice);
      const oldPrice = i.variant?.oldPrice
        ? Number(i.variant.oldPrice)
        : i.product.oldPrice
          ? Number(i.product.oldPrice)
          : null;
      const stock = i.variant?.stock ?? 999;
      return {
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        title: localizeTitle(i.product, lang),
        variantLabel: i.variant ? this.buildVariantLabel(i.variant, lang) : null,
        imageUrl: i.variant?.imageUrl ?? i.product.images[0]?.url ?? null,
        unitPrice,
        oldPrice,
        quantity: i.quantity,
        stock,
        lineTotal: unitPrice * i.quantity,
      };
    });

    const subtotal = dtos.reduce((acc, x) => acc + x.lineTotal, 0);
    return { items: dtos, summary: { count: dtos.reduce((a, x) => a + x.quantity, 0), subtotal } };
  }

  async summary(userId: string): Promise<CartSummary> {
    const rows = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true, variant: true },
    });
    let count = 0;
    let subtotal = 0;
    for (const i of rows) {
      const unit = i.variant ? Number(i.variant.price) : Number(i.product.basePrice);
      count += i.quantity;
      subtotal += unit * i.quantity;
    }
    return { count, subtotal };
  }

  async addItem(
    userId: string,
    input: { productId: string; variantId?: string; quantity?: number },
  ): Promise<CartItemDto> {
    const quantity = input.quantity ?? 1;
    if (quantity < 1) throw new BadRequestException('Quantity must be >= 1');

    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      include: { variants: { where: { isActive: true } } },
    });
    if (!product || !product.isActive) throw new NotFoundException('Product not available');

    let variantId: string | null = input.variantId ?? null;
    if (product.variants.length > 0) {
      if (!variantId) throw new BadRequestException('Variant required');
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) throw new NotFoundException('Variant not found');
      if (variant.stock < quantity) throw new BadRequestException('Not enough stock');
    } else {
      variantId = null;
    }

    const existing = await this.prisma.cartItem.findFirst({
      where: { userId, productId: input.productId, variantId },
    });

    let item;
    if (existing) {
      item = await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      item = await this.prisma.cartItem.create({
        data: { userId, productId: input.productId, variantId, quantity },
      });
    }

    const detail = await this.prisma.cartItem.findUniqueOrThrow({
      where: { id: item.id },
      include: {
        product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } },
        variant: true,
      },
    });
    const unit = detail.variant ? Number(detail.variant.price) : Number(detail.product.basePrice);
    return {
      id: detail.id,
      productId: detail.productId,
      variantId: detail.variantId,
      title: detail.product.titleUz,
      variantLabel: detail.variant ? this.buildVariantLabel(detail.variant, 'uz') : null,
      imageUrl: detail.variant?.imageUrl ?? detail.product.images[0]?.url ?? null,
      unitPrice: unit,
      oldPrice: detail.variant?.oldPrice ? Number(detail.variant.oldPrice) : null,
      quantity: detail.quantity,
      stock: detail.variant?.stock ?? 999,
      lineTotal: unit * detail.quantity,
    };
  }

  async updateQuantity(userId: string, itemId: string, quantity: number): Promise<void> {
    if (quantity < 1) throw new BadRequestException('Quantity must be >= 1');
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: { variant: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    if (item.variant && item.variant.stock < quantity) {
      throw new BadRequestException('Not enough stock');
    }
    await this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(userId: string, itemId: string): Promise<void> {
    const res = await this.prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
    if (res.count === 0) throw new NotFoundException('Cart item not found');
  }

  async clear(userId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }
}
