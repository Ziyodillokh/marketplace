'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiListBanners } from '@/lib/api/endpoints';
import { Skeleton } from '@/components/ui/skeleton';
import { track } from '@/hooks/use-track';
import type { BannerView } from '@/lib/api/types';

const SLIDE_INTERVAL = 5000;

/**
 * Banner carousel — CSS scroll-snap asosida.
 * Vertikal scroll'ga aralashmaymiz: brauzer o'zi ajratadi
 * (gorizontal swipe = banner, vertikal swipe = sahifa scroll).
 */
export function BannerCarousel() {
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners', 'home'],
    queryFn: () => apiListBanners('home'),
  });
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  // Dasturiy (auto-slide) scroll'ni user swipe'idan ajratish uchun.
  const programmatic = useRef(false);
  // User qo'l bilan surgach — shu vaqtgacha auto-slide pauza (keyin o'zi davom etadi).
  const pausedUntil = useRef(0);

  // Auto-slide har SLIDE_INTERVAL — user yaqinda qo'l bilan surgan bo'lsa o'tkazib yuboramiz
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setActive((a) => (a + 1) % banners.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [banners.length]);

  // active o'zgarganda smooth scroll. Dasturiy ekanini belgilaymiz — aks holda bu
  // scroll onScroll'ni ishga tushirib, o'zini "user surdi" deb hisoblar va auto-slide
  // birinchi slayddan keyin to'xtab qolardi (eski xato).
  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl) return;
    const el = trackEl.children[active] as HTMLElement | undefined;
    if (!el) return;
    programmatic.current = true;
    trackEl.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
    const t = setTimeout(() => {
      programmatic.current = false;
    }, 700);
    return () => clearTimeout(t);
  }, [active]);

  if (isLoading) {
    return <Skeleton className="aspect-[2.2/1] w-full rounded-2xl" />;
  }
  if (banners.length === 0) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        // Brauzer touch-action'ni o'zi to'g'ri boshqaradi (vertikal = scroll, horizontal = snap).
        // Hech qanday onTouch handlerlari yo'q — minimal aralashish.
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / el.clientWidth);
          // Faqat user qo'l bilan surganda auto-slide'ni vaqtincha to'xtatamiz
          // (dasturiy auto-slide scroll'i bu yerga tushmasligi uchun programmatic flag).
          if (!programmatic.current) {
            pausedUntil.current = Date.now() + SLIDE_INTERVAL * 2;
          }
          if (idx !== active) setActive(idx);
        }}
      >
        {banners.map((b, i) => (
          <BannerSlide key={b.id} banner={b} priority={i === 0} />
        ))}
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm pointer-events-none">
          {banners.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerSlide({ banner, priority }: { banner: BannerView; priority: boolean }) {
  const inner = (
    <div className="relative aspect-[2.2/1] w-full shrink-0 snap-center bg-gray-100">
      <Image src={banner.imageUrl} alt="" fill sizes="100vw" className="object-cover" priority={priority} />
    </div>
  );

  const handleClick = () => {
    track({ type: 'BANNER_CLICK', payload: { bannerId: banner.id, target: banner.targetType } });
  };

  if (banner.targetType === 'product' && banner.targetValue) {
    return (
      <Link href={`/product/${banner.targetValue}`} onClick={handleClick} className="shrink-0 w-full">
        {inner}
      </Link>
    );
  }
  if (banner.targetType === 'category' && banner.targetValue) {
    return (
      <Link href={`/catalog?categoryId=${banner.targetValue}`} onClick={handleClick} className="shrink-0 w-full">
        {inner}
      </Link>
    );
  }
  if (banner.targetType === 'url' && banner.targetValue) {
    return (
      <a href={banner.targetValue} onClick={handleClick} target="_blank" rel="noreferrer" className="shrink-0 w-full">
        {inner}
      </a>
    );
  }
  return <div className="shrink-0 w-full">{inner}</div>;
}
