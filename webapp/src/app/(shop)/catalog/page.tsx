'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Package } from 'lucide-react';
import { PageHeader } from '@/components/shop/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { apiListCategories } from '@/lib/api/endpoints';
import { useTrackOnMount } from '@/hooks/use-track';
import { useTelegramBackButton } from '@/hooks/use-telegram';
import { useLocaleStore } from '@/stores/locale-store';
import { getMessages, tr } from '@/i18n';
import type { CategoryDto } from '@/lib/api/types';

export default function CatalogPage() {
  useTrackOnMount({ type: 'VIEW_CATALOG' });
  useTelegramBackButton();
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);
  const messages = getMessages(locale);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', 'root', locale],
    queryFn: () => apiListCategories({ onlyRoot: true }),
  });

  return (
    <div>
      <PageHeader title={tr(messages, 'catalog.title')} />

      <div className="px-4 py-3">
        <button
          onClick={() => router.push('/search')}
          className="w-full h-12 rounded-2xl bg-white border border-[var(--color-border)] inline-flex items-center gap-3 px-4 text-left active:scale-[0.99] transition-transform"
        >
          <SearchIcon size={18} className="text-[var(--color-text-muted)]" />
          <span className="text-sm text-[var(--color-text-muted)]">
            {tr(messages, 'common.search')}…
          </span>
        </button>
      </div>

      <div className="px-4">
        <p className="text-xs text-[var(--color-text-muted)] mb-3 font-medium">
          {tr(messages, 'catalog.subtitle')}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">
            {tr(messages, 'catalog.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {categories.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryDto }) {
  const img = category.bannerUrl ?? category.iconUrl;
  return (
    <Link
      href={`/category/${category.slug}`}
      className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--color-primary)]/15 to-[var(--color-primary)]/5 border border-[var(--color-border)] flex flex-col justify-end active:scale-[0.98] transition-transform"
    >
      {img ? (
        <>
          <Image
            src={img}
            alt={category.title}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[var(--color-primary)]/50">
          <Package size={42} strokeWidth={1.5} />
        </div>
      )}
      <div className="relative p-3">
        <h3
          className={`font-bold text-sm line-clamp-2 leading-tight ${
            img ? 'text-white drop-shadow' : 'text-[var(--color-text)]'
          }`}
        >
          {category.title}
        </h3>
      </div>
    </Link>
  );
}
