import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { localizeTitle, type Locale } from '@/common/helpers/localize';

export interface CategoryDto {
  id: string;
  slug: string;
  title: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  parentId: string | null;
  position: number;
  childrenCount: number;
}

/**
 * Asosiy kategoriyalar uchun default rasmlari (slug bo'yicha).
 * Faqat `bannerUrl` va `iconUrl` ikkalasi ham NULL bo'lgan kategoriyalar uchun qo'llanadi
 * — admin alohida rasm yuklasa o'sha saqlanadi (idempotent backfill).
 */
const DEFAULT_CATEGORY_IMAGES: Record<string, { banner: string; icon: string }> = {
  phones: {
    banner: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=1200&q=80&auto=format&fit=crop',
    icon: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80&auto=format&fit=crop',
  },
  accessories: {
    banner: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1200&q=80&auto=format&fit=crop',
    icon: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80&auto=format&fit=crop',
  },
  'clothing-women': {
    banner: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80&auto=format&fit=crop',
    icon: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80&auto=format&fit=crop',
  },
  'clothing-men': {
    banner: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1200&q=80&auto=format&fit=crop',
    icon: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&q=80&auto=format&fit=crop',
  },
  cosmetics: {
    banner: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&q=80&auto=format&fit=crop',
    icon: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80&auto=format&fit=crop',
  },
  electronics: {
    banner: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1200&q=80&auto=format&fit=crop',
    icon: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80&auto=format&fit=crop',
  },
  home: {
    banner: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop',
    icon: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80&auto=format&fit=crop',
  },
};

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.backfillDefaultImages().catch((err) => {
      this.logger.warn(`Default kategoriya rasmlarini joylab bo'lmadi: ${(err as Error).message}`);
    });
  }

  /**
   * Rasmsiz qolib ketgan root kategoriyalarga slug bo'yicha standart rasm joylaydi.
   * Idempotent — admin yuklagan rasmga tegmaydi.
   */
  private async backfillDefaultImages(): Promise<void> {
    const slugs = Object.keys(DEFAULT_CATEGORY_IMAGES);
    const targets = await this.prisma.category.findMany({
      where: {
        slug: { in: slugs },
        parentId: null,
        AND: [{ bannerUrl: null }, { iconUrl: null }],
      },
      select: { id: true, slug: true },
    });
    if (targets.length === 0) return;

    let updated = 0;
    for (const cat of targets) {
      const img = DEFAULT_CATEGORY_IMAGES[cat.slug];
      if (!img) continue;
      await this.prisma.category.update({
        where: { id: cat.id },
        data: { bannerUrl: img.banner, iconUrl: img.icon },
      });
      updated++;
    }
    if (updated > 0) {
      this.logger.log(`Default rasmlari ${updated} ta kategoriyaga joylandi`);
    }
  }

  async list(params: { onlyRoot?: boolean; parentId?: string | null }, lang: Locale): Promise<CategoryDto[]> {
    const where = params.onlyRoot
      ? { parentId: null, isVisible: true }
      : params.parentId !== undefined
        ? { parentId: params.parentId, isVisible: true }
        : { isVisible: true };

    const rows = await this.prisma.category.findMany({
      where,
      orderBy: [{ position: 'asc' }, { titleUz: 'asc' }],
      include: { _count: { select: { children: true } } },
    });

    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: localizeTitle(c, lang),
      iconUrl: c.iconUrl,
      bannerUrl: c.bannerUrl,
      parentId: c.parentId,
      position: c.position,
      childrenCount: c._count.children,
    }));
  }

  async getBySlug(slug: string, lang: Locale): Promise<CategoryDto & { children: CategoryDto[] }> {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: {
          where: { isVisible: true },
          orderBy: { position: 'asc' },
          include: { _count: { select: { children: true } } },
        },
        _count: { select: { children: true } },
      },
    });
    if (!cat || !cat.isVisible) throw new NotFoundException('Category not found');

    return {
      id: cat.id,
      slug: cat.slug,
      title: localizeTitle(cat, lang),
      iconUrl: cat.iconUrl,
      bannerUrl: cat.bannerUrl,
      parentId: cat.parentId,
      position: cat.position,
      childrenCount: cat._count.children,
      children: cat.children.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: localizeTitle(c, lang),
        iconUrl: c.iconUrl,
        bannerUrl: c.bannerUrl,
        parentId: c.parentId,
        position: c.position,
        childrenCount: c._count.children,
      })),
    };
  }
}
