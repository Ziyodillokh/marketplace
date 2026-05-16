import { BottomNav } from '@/components/shop/bottom-nav';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-24 max-w-md mx-auto overflow-x-clip relative">
      {children}
      <BottomNav />
    </div>
  );
}
