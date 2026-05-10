import { create } from 'zustand';
import type { Analysis } from '../types';

export interface StreamingState {
  phase: 'idle' | 'scoring' | 'rewriting' | 'complete' | 'error';
  compositeScore: number | null;
  viralityScore: number | null;
  followerScore: number | null;
  leadCaptureScore: number | null;
  trustScore: number | null;
  scoreBreakdown: Analysis['scoreBreakdown'] | null;
  audienceMatchScore: number | null;
  audienceMatchVerdict: string | null;
  audienceMatchBreakdown: Analysis['audienceMatchBreakdown'];
  recommendations: string[];
  contentPattern: string | null;
  leadMagnetSuggestion: string | null;
  optimalPostTimes: Analysis['optimalPostTimes'];
  hashtagRecommendations: Analysis['hashtagRecommendations'];
  platformFit: Analysis['platformFit'];
  rewriteInstagram: string | null;
  rewriteFacebook: string | null;
  rewriteLinkedin: string | null;
  rewriteTwitter: string | null;
  rewriteTiktok: string | null;
  analysisId: string | null;
  postId: string | null;
  platform: string | null;
  contentType: string | null;
  listingPriceRange: string | null;
  targetBuyerType: string[];
  error: string | null;
  set: (data: Partial<Omit<StreamingState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const initialData: Omit<StreamingState, 'set' | 'reset'> = {
  phase: 'idle',
  compositeScore: null,
  viralityScore: null,
  followerScore: null,
  leadCaptureScore: null,
  trustScore: null,
  scoreBreakdown: null,
  audienceMatchScore: null,
  audienceMatchVerdict: null,
  audienceMatchBreakdown: null,
  recommendations: [],
  contentPattern: null,
  leadMagnetSuggestion: null,
  optimalPostTimes: null,
  hashtagRecommendations: null,
  platformFit: null,
  rewriteInstagram: null,
  rewriteFacebook: null,
  rewriteLinkedin: null,
  rewriteTwitter: null,
  rewriteTiktok: null,
  analysisId: null,
  postId: null,
  platform: null,
  contentType: null,
  listingPriceRange: null,
  targetBuyerType: [],
  error: null,
};

export const useStreamingAnalysisStore = create<StreamingState>((set) => ({
  ...initialData,
  set: (data) => set((s) => ({ ...s, ...data })),
  reset: () => set((s) => ({ ...s, ...initialData })),
}));
