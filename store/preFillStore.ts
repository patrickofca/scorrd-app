import { create } from 'zustand';
import { PriceRange, BuyerType } from '../constants/config';

interface AnalyzePreFill {
  draft: string;
  priceRange: PriceRange | null;
  buyerTypes: BuyerType[];
}

interface PreFillStore {
  prefill: AnalyzePreFill | null;
  set: (prefill: AnalyzePreFill) => void;
  clear: () => void;
}

export const usePreFillStore = create<PreFillStore>(set => ({
  prefill: null,
  set: (prefill) => set({ prefill }),
  clear: () => set({ prefill: null }),
}));
