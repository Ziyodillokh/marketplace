'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { apiUploadImage } from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';

export function SingleImageUploader({
  label,
  hint,
  value,
  onChange,
  aspect = 'square',
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: 'square' | 'banner';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const res = await apiUploadImage(file);
      onChange(res.url);
      toast.success('Rasm yuklandi');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const aspectClass = aspect === 'banner' ? 'aspect-[2.6/1]' : 'aspect-square w-32';

  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text)] mb-1">{label}</p>
      {hint && <p className="text-xs text-[var(--color-text-muted)] mb-2">{hint}</p>}
      {value ? (
        <div className={`relative ${aspectClass} rounded-xl overflow-hidden bg-gray-100 group border border-[var(--color-border)]`}>
          <Image src={value} alt="" fill className="object-cover" sizes="400px" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 h-7 w-7 grid place-items-center rounded-full bg-black/60 text-white"
            aria-label="O'chirish"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`${aspectClass} rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50 w-full`}
        >
          {uploading ? (
            <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-[var(--color-primary)] animate-spin" />
          ) : (
            <>
              <Upload size={20} />
              <span className="text-xs mt-1">Rasm yuklash</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
