export function Brand({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2 leading-none ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Sellio"
        width={size}
        height={size}
        className="block object-contain shrink-0"
        style={{ width: size, height: size }}
      />
      <span className="font-bold text-xl tracking-tight leading-none">Sellio</span>
    </span>
  );
}
