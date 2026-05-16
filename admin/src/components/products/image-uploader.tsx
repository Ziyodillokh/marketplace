'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { apiUploadImage } from '@/lib/endpoints';
import { toast } from '@/stores/toast-store';

export function ImageUploader({
  images,
  onChange,
}: {
  images: Array<{ id?: string; url: string; position?: number }>;
  onChange: (images: Array<{ id?: string; url: string; position?: number }>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const res = await apiUploadImage(file);
          return { url: res.url };
        }),
      );
      onChange([...images, ...uploaded]);
      toast.success(`${uploaded.length} rasm yuklandi`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-2">
        {images.map((img, i) => (
          <div key={img.id ?? `${img.url}-${i}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
            <Image src={img.url} alt="" fill className="object-cover" sizes="200px" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100"
            >
              <X size={12} />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white text-[10px] font-medium">
                Asosiy
              </span>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-[var(--color-primary)] animate-spin" />
          ) : (
            <>
              <Upload size={20} />
              <span className="text-xs mt-1">Qo&apos;shish</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
