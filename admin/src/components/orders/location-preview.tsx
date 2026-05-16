'use client';

import { useState } from 'react';
import { MapPin, ExternalLink, X } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';

interface Props {
  latitude: number;
  longitude: number;
  address: string;
}

/**
 * Order detail'da xarita preview.
 * Kichik OSM embed iframe — bossa, to'liq xaritada ochiladi (modal).
 */
export function LocationPreview({ latitude, longitude, address }: Props) {
  const [open, setOpen] = useState(false);

  // OSM embed URL with marker
  const bbox = `${longitude - 0.005},${latitude - 0.005},${longitude + 0.005},${latitude + 0.005}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
  const yandexMapUrl = `https://yandex.com/maps/?ll=${longitude},${latitude}&z=17&pt=${longitude},${latitude},comma`;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <>
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-[var(--color-primary)]" /> Joylashuv
            </span>
          }
          action={
            <button
              onClick={() => setOpen(true)}
              className="text-xs font-semibold text-[var(--color-primary)] inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> Kattalashtirish
            </button>
          }
        />
        <button onClick={() => setOpen(true)} className="block w-full text-left">
          <div className="relative aspect-[2.4/1] bg-gray-100">
            <iframe
              title="Manzil xaritasi"
              src={embedUrl}
              className="absolute inset-0 w-full h-full border-0 pointer-events-none"
              loading="lazy"
            />
            {/* Marker overlay (klik uchun) */}
            <div className="absolute inset-0 grid place-items-center">
              <span className="h-3 w-3 rounded-full bg-[var(--color-primary)] ring-4 ring-white shadow-md" />
            </div>
            {/* Coordinates strip */}
            <div className="absolute bottom-1 left-1 right-1 px-2 py-1 rounded-md bg-white/95 text-[10px] font-mono text-[var(--color-text-muted)] backdrop-blur-sm truncate">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>
        </button>
        <div className="px-4 py-2 text-xs text-[var(--color-text-muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href={fullMapUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            OpenStreetMap
          </a>
          <a
            href={yandexMapUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            Yandex Maps
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-primary)] hover:underline"
          >
            Google Maps
          </a>
        </div>
      </Card>

      {/* Full map modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/70" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-2 inset-y-4 md:inset-x-[10%] md:inset-y-[5%] bg-white rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{address}</p>
                <p className="text-xs text-[var(--color-text-muted)] font-mono">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-full hover:bg-gray-100 shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <iframe
              title="To'liq xarita"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`}
              className="flex-1 w-full border-0"
            />
            <div className="px-4 py-3 border-t border-[var(--color-border)] flex flex-wrap gap-2">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white"
              >
                Google Maps
              </a>
              <a
                href={yandexMapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white"
              >
                Yandex Maps
              </a>
              <a
                href={fullMapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white"
              >
                OpenStreetMap
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
