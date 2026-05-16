'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';

export function ProductGallery({ images, title }: { images: Array<{ id: string; url: string }>; title: string }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return <div className="aspect-square bg-gray-100 grid place-items-center text-gray-300">No image</div>;
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / el.clientWidth);
          if (idx !== active) setActive(idx);
        }}
      >
        {images.map((img) => (
          <div key={img.id} className="relative aspect-square w-full shrink-0 snap-center bg-white">
            <Image src={img.url} alt={title} fill sizes="100vw" className="object-contain" priority={img.id === images[0]?.id} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-[var(--color-primary)]' : 'w-1.5 bg-gray-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
