'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppliedPromo } from '@/lib/api/types';

interface PromoState {
  applied: AppliedPromo | null;
  apply: (p: AppliedPromo) => void;
  clear: () => void;
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set) => ({
      applied: null,
      apply: (p) => set({ applied: p }),
      clear: () => set({ applied: null }),
    }),
    { name: 'mp-promo' },
  ),
);
