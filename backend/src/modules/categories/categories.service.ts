import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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
