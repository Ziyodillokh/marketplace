'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin } from 'lucide-react';

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Reverse-geocode natijasi — manzil matnini avtomatik to'ldirish uchun (ixtiyoriy). */
  onAddress?: (address: string) => void;
}

// Markaz: Toshkent (koordinata hali yo'q bo'lsa)
const FALLBACK: [number, number] = [41.3111, 69.2797];

const PIN_HTML =
  '<div style="width:26px;height:26px;transform:translate(-2px,-10px)">' +
  '<svg viewBox="0 0 24 24" width="26" height="26" fill="#2F6BFF" stroke="#fff" stroke-width="1.5">' +
  '<path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/>' +
  '<circle cx="12" cy="9" r="2.4" fill="#fff" stroke="none"/></svg></div>';

/**
 * Do'kon joylashuvini haritadan tanlash + GPS bilan belgilash.
 * Leaflet (OSM tiles) — kalitsiz, bepul. Xaritaga bossa yoki markerni surса
 * koordinata yangilanadi.
 */
export function LocationPicker({ latitude, longitude, onChange, onAddress }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const cbRef = useRef({ onChange, onAddress });
  cbRef.current = { onChange, onAddress };

  const [locating, setLocating] = useState(false);

  // Xaritani bir marta yaratish
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !elRef.current || mapRef.current) return;

      const start: [number, number] =
        latitude != null && longitude != null ? [latitude, longitude] : FALLBACK;
      const map = L.map(elRef.current).setView(start, latitude != null ? 16 : 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({ className: '', html: PIN_HTML, iconSize: [26, 26], iconAnchor: [11, 26] });
      const marker = L.marker(start, { draggable: true, icon }).addTo(map);

      const emit = (lat: number, lng: number) => {
        cbRef.current.onChange(lat, lng);
        if (cbRef.current.onAddress) {
          reverseGeocode(lat, lng).then((a) => a && cbRef.current.onAddress?.(a));
        }
      };
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        emit(p.lat, p.lng);
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        emit(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tashqaridan koordinata o'zgarsa (masalan GPS) — markerни ko'chiramiz
  useEffect(() => {
    if (mapRef.current && markerRef.current && latitude != null && longitude != null) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.setView([latitude, longitude], 16);
    }
  }, [latitude, longitude]);

  function useMyLocation() {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        onChange(lat, lng);
        if (onAddress) reverseGeocode(lat, lng).then((a) => a && onAddress(a));
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={elRef}
        className="h-56 w-full rounded-xl overflow-hidden border border-[var(--color-border)] z-0"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] disabled:opacity-50"
        >
          <LocateFixed size={15} /> {locating ? 'Aniqlanmoqda…' : 'Hozirgi joylashuvim'}
        </button>
        {latitude != null && longitude != null ? (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-[var(--color-text-muted)]">
            <MapPin size={12} /> {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">Xaritaga bosing yoki GPS</span>
        )}
      </div>
    </div>
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=uz`,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { display_name?: string };
    return j.display_name ?? null;
  } catch {
    return null;
  }
}
