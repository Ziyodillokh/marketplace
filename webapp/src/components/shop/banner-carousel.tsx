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

export function BannerCarousel() {
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners', 'home'],
    queryFn: () => apiListBanners('home'),
  });
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % banners.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [banners.length]);

  useEffect(() => {
    if (!trackRef.current || banners.length === 0) return;
    const slide = trackRef.current.children[active] as HTMLElement;
    if (slide) {
      isAutoScrolling.current = true;
      trackRef.current.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
      setTimeout(() => (isAutoScrolling.current = false), 400);
    }
  }, [active, banners.length]);

  if (isLoading) {
    return <Skeleton className="aspect-[2.2/1] w-full rounded-2xl" />;
  }
  if (banners.length === 0) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        onScroll={(e) => {
          if (isAutoScrolling.current) return;
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / el.clientWidth);
          if (idx !== active) setActive(idx);
        }}
      >
        {banners.map((b) => (
          <BannerSlide key={b.id} banner={b} />
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm">
          {banners.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerSlide({ banner }: { banner: BannerView }) {
  const inner = (
    <div className="relative aspect-[2.2/1] w-full shrink-0 snap-center bg-gray-100">
      <Image src={banner.imageUrl} alt="" fill sizes="100vw" className="object-cover" priority />
    </div>
  );

  const handleClick = () => {
    track({ type: 'BANNER_CLICK', payload: { bannerId: banner.id, target: banner.targetType } });
  };

  if (banner.targetType === 'product' && banner.targetValue) {
    return (
      <Link href={`/product/${banner.targetValue}`} onClick={handleClick} className="shrink-0 w-full snap-center">
        {inner}
      </Link>
    );
  }
  if (banner.targetType === 'category' && banner.targetValue) {
    return (
      <Link href={`/catalog?categoryId=${banner.targetValue}`} onClick={handleClick} className="shrink-0 w-full snap-center">
        {inner}
      </Link>
    );
  }
  if (banner.targetType === 'url' && banner.targetValue) {
    return (
      <a href={banner.targetValue} onClick={handleClick} target="_blank" rel="noreferrer" className="shrink-0 w-full snap-center">
        {inner}
      </a>
    );
  }
  return <div className="shrink-0 w-full snap-center">{inner}</div>;
}
