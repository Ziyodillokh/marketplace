import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { limitsFor } from '@/common/tariff';

/** null = platforma egasi (global/cheklovsiz). */
type TenantId = string | null | undefined;

export interface UpsertCategoryInput {
  slug?: string;
  titleUz: string;
  titleRu: string;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  parentId?: string | null;
  position?: number;
  isVisible?: boolean;
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
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventEmitter2) {}

  private invalidate(): void {
    this.events.emit('categories.invalidate');
  }

  async tree(tenantId?: TenantId) {
    // Sotuvchi: global (tenantId=null) + o'ziniki. Owner: hammasi.
    const where = tenantId ? { OR: [{ tenantId: null }, { tenantId }] } : {};
    const rows = await this.prisma.category.findMany({
      where,
      orderBy: [{ position: 'asc' }, { titleUz: 'asc' }],
      include: { _count: { select: { products: true, children: true } } },
    });
    const byParent = new Map<string | null, typeof rows>();
    for (const r of rows) {
      const k = r.parentId ?? null;
      if (!byParent.has(k)) byParent.set(k, []);
      byParent.get(k)!.push(r);
    }
    const build = (parentId: string | null): unknown[] =>
      (byParent.get(parentId) ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        titleUz: c.titleUz,
        titleRu: c.titleRu,
        iconUrl: c.iconUrl,
        bannerUrl: c.bannerUrl,
        parentId: c.parentId,
        position: c.position,
        isVisible: c.isVisible,
        productsCount: c._count.products,
        children: build(c.id),
      }));
    return build(null);
  }

  async getById(id: string, tenantId?: TenantId) {
    const c = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!c) throw new NotFoundException('Category not found');
    // Sotuvchi global (null) yoki o'z kategoriyasini ko'radi
    if (tenantId && c.tenantId && c.tenantId !== tenantId) {
      throw new NotFoundException('Category not found');
    }
    return c;
  }

  async create(input: UpsertCategoryInput, tenantId?: TenantId) {
    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { tariffPlan: true },
      });
      const max = limitsFor(tenant?.tariffPlan ?? 'FREE').maxCategories;
      if (max >= 0) {
        const count = await this.prisma.category.count({ where: { tenantId } });
        if (count >= max) {
          throw new ForbiddenException({
            message: `Kategoriya limiti (${max}) tugadi. Tarifni yangilang.`,
            upgradeRequired: true,
          });
        }
      }
    }
    const slug = input.slug || (await this.uniqueSlug(slugify(input.titleUz)));
    const res = await this.prisma.category.create({
      data: {
        tenantId: tenantId ?? null,
        slug,
        titleUz: input.titleUz,
        titleRu: input.titleRu,
        iconUrl: input.iconUrl ?? null,
        bannerUrl: input.bannerUrl ?? null,
        parentId: input.parentId ?? null,
        position: input.position ?? 0,
        isVisible: input.isVisible ?? true,
      },
    });
    this.invalidate();
    return res;
  }

  async update(id: string, input: Partial<UpsertCategoryInput>, tenantId?: TenantId) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
    // Sotuvchi faqat o'z kategoriyasini tahrirlaydi (global asosiy kategoriyaga tegmaydi)
    if (tenantId && exists.tenantId !== tenantId) throw new NotFoundException('Category not found');
    const res = await this.prisma.category.update({
      where: { id },
      data: {
        slug: input.slug,
        titleUz: input.titleUz,
        titleRu: input.titleRu,
        iconUrl: input.iconUrl,
        bannerUrl: input.bannerUrl,
        parentId: input.parentId,
        position: input.position,
        isVisible: input.isVisible,
      },
    });
    this.invalidate();
    return res;
  }

  async delete(id: string, tenantId?: TenantId) {
    if (tenantId) {
      const c = await this.prisma.category.findUnique({ where: { id }, select: { tenantId: true } });
      if (!c || c.tenantId !== tenantId) throw new NotFoundException('Category not found');
    }
    await this.prisma.category.delete({ where: { id } });
    this.invalidate();
    return { ok: true };
  }

  async reorder(items: Array<{ id: string; position: number; parentId?: string | null }>) {
    for (const it of items) {
      await this.prisma.category.update({
        where: { id: it.id },
        data: { position: it.position, parentId: it.parentId ?? null },
      });
    }
    this.invalidate();
    return { ok: true };
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base || `cat-${Date.now()}`;
    let i = 0;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      i += 1;
      slug = `${base}-${i}`;
    }
    return slug;
  }
}
