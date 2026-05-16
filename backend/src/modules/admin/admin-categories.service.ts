import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';

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

  async tree() {
    const rows = await this.prisma.category.findMany({
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

  async getById(id: string) {
    const c = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  async create(input: UpsertCategoryInput) {
    const slug = input.slug || (await this.uniqueSlug(slugify(input.titleUz)));
    const res = await this.prisma.category.create({
      data: {
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

  async update(id: string, input: Partial<UpsertCategoryInput>) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Category not found');
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

  async delete(id: string) {
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
