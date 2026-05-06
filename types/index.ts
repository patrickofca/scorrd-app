export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  orgId: string | null;
  marketLocation: string | null;
  brokerageName: string | null;
  onboardingComplete: boolean;
  slug?: string;
  pushToken?: string;
  timezone?: string;
  capture_page_headline?: string;
  notificationPrefs?: {
    new_lead: boolean;
    weekly_digest: boolean;
    usage_warnings: boolean;
    notify_at_time: boolean;
  };
  plan?: string;
  subscription_status?: string;
  trial_ends_at?: string | null;
  usage?: {
    analyses_used: number;
    analyses_limit: number;
    generations_used: number;
    generations_limit: number | null;
  };
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Post {
  id: string;
  userId: string;
  orgId: string;
  contentType: string;
  platform: string;
  draftText: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
}

export interface ScoreBreakdown {
  evidence: string[];
  [key: string]: number | string[];
}

export interface Analysis {
  id: string;
  postId: string;
  viralityScore: number;
  followerScore: number;
  leadCaptureScore: number;
  trustScore: number;
  compositeScore: number;
  scoreBreakdown: {
    virality: ScoreBreakdown & { hook_strength: number; emotional_trigger: number; curiosity_gap: number; shareability: number };
    follower: ScoreBreakdown & { authority_positioning: number; niche_relevance: number; followable_identity: number; value_delivery: number };
    lead_capture: ScoreBreakdown & { cta_clarity: number; conversation_starter: number; dm_trigger: number; lead_magnet_presence: number };
    trust: ScoreBreakdown & { local_expertise: number; social_proof: number; professionalism: number; agent_positioning: number };
  };
  rewriteInstagram: string | null;
  rewriteFacebook: string | null;
  rewriteLinkedin: string | null;
  rewriteTwitter: string | null;
  rewriteTiktok: string | null;
  recommendations: string[];
  contentPattern: string | null;
  leadMagnetSuggestion: string | null;
  optimalPostTimes: Record<string, string[]> | null;
  hashtagRecommendations: { top: string[]; niche: string[]; brand: string[] } | null;
  listingPriceRange: string | null;
  targetBuyerType: string[];
  audienceMatchScore: number | null;
  audienceMatchVerdict: string | null;
  audienceMatchBreakdown: {
    detected_audience_signals: string[];
    expected_audience: string;
    target_audience: string;
    gap_analysis: string;
    rewrite_suggestions: string[];
  } | null;
  platformFit: {
    platform: string;
    fit_score: number;
    fit_verdict: string;
    what_to_change: string;
  }[] | null;
  claudeModelVersion: string;
  tokensUsed: number | null;
  createdAt: string;
  post?: Post;
}

export interface GeneratedPost {
  id: string;
  userId: string;
  orgId: string;
  platform: string;
  contentType: string;
  listingDetails: string;
  listingPriceRange: string | null;
  targetBuyerType: string[];
  tone: string;
  generatedCopy: string;
  hashtags: string[];
  isReelScript: boolean;
  saved: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReelScene {
  scene_number: number;
  duration_seconds: number;
  location: string;
  what_to_show: string;
  what_to_say: string;
  delivery_note: string;
}

export interface ReelScriptResult {
  hook_line: string;
  hook_direction: string;
  scenes: ReelScene[];
  close_cta: string;
  total_duration_seconds: number;
  caption: string;
  hashtags: string[];
  tiktok_repurpose_hook?: string;
  facebook_repurpose_hook?: string;
}

export interface GenerateReelResponse {
  generated_post: GeneratedPost;
  reel_script: ReelScriptResult;
  meta: { modelVersion: string; tokensUsed: number };
}

export interface GenerateResponse {
  generated_posts: GeneratedPost[];
  photo_recommendations: { platform: string; recommendation: string | null }[];
  meta: { modelVersion: string; tokensUsed: number; platformCount: number };
}

export interface ExtractUrlResponse {
  success: boolean;
  listing_details?: string;
  extracted_fields?: {
    address?: string;
    price?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_size?: string;
    year_built?: string;
    school_district?: string;
    neighborhood?: string;
    key_features?: string[];
  };
  source_domain?: string;
  message?: string;
}

export interface GenerateHistoryResponse {
  posts: GeneratedPost[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface Lead {
  id: string;
  userId: string;
  platform: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  status: string;
  message: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  thisMonth: number;
  byPlatform: { platform: string; count: number }[];
}

export interface DashboardStats {
  scoreTrend: { date: string; avgScore: number; count: number }[];
  dimensionAverages: {
    virality: number;
    follower: number;
    leadCapture: number;
    trust: number;
  };
  platformBreakdown: { platform: string; avgScore: number; count: number }[];
  contentPatterns: { pattern: string | null; count: number; avgScore: number }[];
  quickStats: {
    analysesThisMonth: number;
    avgCompositeScore: number;
    leadsThisMonth: number;
    topPlatform: string | null;
  };
}

export interface CalendarItem {
  id: string;
  userId: string;
  orgId: string;
  platform: string;
  scheduledAt: string;
  status: 'scheduled' | 'published' | 'skipped';
  note: string | null;
  createdAt: string;
  updatedAt: string;
  generatedPost?: GeneratedPost | null;
}

export interface AnalysisListResponse {
  analyses: Analysis[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SubmitAnalysisResponse {
  post: Post;
  analysis: Analysis;
}

export interface CalendarDaySuggestion {
  day: number;
  date: string;
  platform: string;
  content_type: string;
  topic: string;
  hook: string;
  tone: string;
  suggested_time: string;
}

export interface GenerateMonthResponse {
  suggestions: CalendarDaySuggestion[];
}

export interface TrendsData {
  trending_formats: { format: string; why_it_works: string; example_hook: string }[];
  trending_topics: { topic: string; angle: string }[];
  hashtag_strategy: { broad: string[]; mid: string[]; niche: string[] };
  avoid: string[];
  platform_insight: string;
  last_updated: string;
}

export interface SlideScore {
  slide_number: number;
  composition_score: number;
  lighting_score: number;
  content_score: number;
  individual_score: number;
  verdict: string;
  one_fix: string;
}

export interface CarouselAnalysis {
  id: string;
  slideCount: number;
  slideImageUrls: string[];
  perSlideScores: SlideScore[];
  hookScore: number;
  ctaScore: number;
  sequenceScore: number;
  consistencyScore: number;
  swipeMomentumScore: number;
  carouselCompositeScore: number;
  sequenceVerdict: string;
  top3Fixes: string[];
  recommendedSlideOrder: number[] | null;
  reorderRationale: string | null;
  captionRewrites: Record<string, string | null> | null;
  createdAt: string;
}
