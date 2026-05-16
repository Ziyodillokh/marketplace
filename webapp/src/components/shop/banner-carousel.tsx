'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiListBanners } from '@/lib/api/endpoints';
import { Skeleton } from '@/components/ui/skeleton';
import { track } from '@/hooks/use-track';
import type { BannerView } from '@/lib/api/types';

const SLIDE_INTERVAL = 5000;
const SWIPE_THRESHOLD = 50;

export function BannerCarousel() {
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners', 'home'],
    queryFn: () => apiListBanners('home'),
  });
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-slide
  useEffect(() => {
    if (banners.length <= 1 || isDragging) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % banners.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(id);
  }, [banners.length, isDragging]);

  const goTo = useCallback(
    (idx: number) => {
      if (banners.length === 0) return;
      setActive(((idx % banners.length) + banners.length) % banners.length);
    },
    [banners.length],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0]!.clientX;
    setIsDragging(true);
    setDragOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0]!.clientX - startX.current;
    setDragOffset(diff);
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    if (dragOffset > SWIPE_THRESHOLD) goTo(active - 1);
    else if (dragOffset < -SWIPE_THRESHOLD) goTo(active + 1);
    setIsDragging(false);
    setDragOffset(0);
  };

  if (isLoading) {
    return <Skeleton className="aspect-[2.2/1] w-full rounded-2xl" />;
  }
  if (banners.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="flex"
        style={{
          transform: `translate3d(calc(${-active * 100}% + ${dragOffset}px), 0, 0)`,
          transition: isDragging ? 'none' : 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
      >
        {banners.map((b, i) => (
          <BannerSlide key={b.id} banner={b} isActive={i === active} />
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

function BannerSlide({ banner, isActive }: { banner: BannerView; isActive: boolean }) {
  const inner = (
    <div className="relative aspect-[2.2/1] w-full shrink-0 bg-gray-100">
      <Image
        src={banner.imageUrl}
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority={isActive}
      />
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
      <Link
        href={`/catalog?categoryId=${banner.targetValue}`}
        onClick={handleClick}
        className="shrink-0 w-full"
      >
        {inner}
      </Link>
    );
  }
  if (banner.targetType === 'url' && banner.targetValue) {
    return (
      <a
        href={banner.targetValue}
        onClick={handleClick}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 w-full"
      >
        {inner}
      </a>
    );
  }
  return <div className="shrink-0 w-full">{inner}</div>;
}
