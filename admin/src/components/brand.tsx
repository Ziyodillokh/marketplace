export function Brand({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Sellio"
        width={size}
        height={size}
        className="object-contain shrink-0"
        style={{ width: size, height: size }}
      />
      <span className="font-bold text-xl tracking-tight">Sellio</span>
    </span>
  );
}
