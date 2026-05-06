import { create } from 'zustand';

interface AnalyzeDraft {
  platform: string;
  contentType: string;
  text: string;
  priceRange: string | null;
  buyerTypes: string[];
}

interface GenerateDraft {
  contentType: string;
  platforms: string[];
  tone: string;
  details: string;
  priceRange: string | null;
  buyerTypes: string[];
}

interface FormDraftState {
  analyzeDraft: AnalyzeDraft | null;
  generateDraft: GenerateDraft | null;
  returnPath: string | null;
  saveAnalyze: (draft: AnalyzeDraft, returnPath: string) => void;
  saveGenerate: (draft: GenerateDraft, returnPath: string) => void;
  saveReturnPath: (returnPath: string) => void;
  clear: () => void;
}

export const useFormDraftStore = create<FormDraftState>((set) => ({
  analyzeDraft: null,
  generateDraft: null,
  returnPath: null,
  saveAnalyze: (analyzeDraft, returnPath) => set({ analyzeDraft, returnPath }),
  saveGenerate: (generateDraft, returnPath) => set({ generateDraft, returnPath }),
  saveReturnPath: (returnPath) => set({ returnPath }),
  clear: () => set({ analyzeDraft: null, generateDraft: null, returnPath: null }),
}));
