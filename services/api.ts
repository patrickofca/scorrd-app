import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../constants/config';
import { posthog } from './analytics';

export class AuthExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'AuthExpiredError';
  }
}
import type {
  User,
  Session,
  Analysis,
  AnalysisListResponse,
  SubmitAnalysisResponse,
  GeneratedPost,
  GenerateResponse,
  GenerateReelResponse,
  GenerateHistoryResponse,
  ExtractUrlResponse,
  DashboardStats,
  Lead,
  LeadsResponse,
  CalendarItem,
  GenerateMonthResponse,
  TrendsData,
  CarouselAnalysis,
} from '../types';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;
  if (res.status === 401) {
    // set() inside expireSession runs synchronously (before its first await),
    // so AuthGate sees accessToken=null and redirects on the next render.
    useAuthStore.getState().expireSession();
    throw new AuthExpiredError();
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server error (${res.status})`);
  }

  if (res.status === 402) {
    const errorCode = json.error as string | undefined;

    if (errorCode === 'plan_upgrade_required') {
      const requiredPlan: string = json.required_plan ?? 'Pro';
      const currentPlan = useAuthStore.getState().user?.plan ?? 'none';
      posthog.capture('upgrade_prompt_shown', { feature: requiredPlan, current_plan: currentPlan });
      Alert.alert(
        'Upgrade Required',
        `This feature requires the ${requiredPlan} plan. Upgrade now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => {
            posthog.capture('upgrade_prompt_tapped', { feature: requiredPlan, current_plan: currentPlan });
            router.push('/billing/plans');
          }},
        ]
      );
      throw new Error('plan_upgrade_required');
    }

    if (errorCode === 'subscription_required') {
      const currentPlan = useAuthStore.getState().user?.plan ?? 'none';
      posthog.capture('upgrade_prompt_shown', { feature: 'subscription', current_plan: currentPlan });
      Alert.alert(
        'Subscription Required',
        'Start your free 14-day trial to use Scorrd.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start Trial', onPress: () => {
            posthog.capture('upgrade_prompt_tapped', { feature: 'subscription', current_plan: currentPlan });
            router.push('/billing/plans');
          }},
        ]
      );
      throw new Error('subscription_required');
    }

    throw new Error(json.error ?? 'Payment required');
  }

  if (!res.ok) {
    throw new Error(json.error ?? 'Request failed');
  }

  return json.data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ session: Session; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (email: string, password: string, name: string) =>
      request<{ session: Session; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),

    logout: () =>
      request<void>('/auth/logout', { method: 'POST' }),
  },

  me: {
    get: () => request<User>('/me'),
    update: (data: {
      name?: string | null;
      market_location?: string | null;
      brokerage_name?: string | null;
      avatar_url?: string | null;
      capture_page_headline?: string | null;
      pushToken?: string;
      timezone?: string;
      notificationPrefs?: User['notificationPrefs'];
    }) =>
      request<User>('/me', { method: 'PATCH', body: JSON.stringify(data) }),
    delete: () => request<void>('/me', { method: 'DELETE' }),
  },

  billing: {
    portal: () =>
      request<{ url: string }>('/billing/portal', { method: 'POST' }),
    checkout: (plan: string) =>
      request<{ url: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      }),
  },

  analyses: {
    submit: (data: {
      platform: string;
      content_type: string;
      draft_text: string;
      image_base64?: string;
      image_media_type?: string;
      listing_price_range?: string;
      target_buyer_type?: string[];
      agent_name?: string;
      brokerage_name?: string;
    }) =>
      request<SubmitAnalysisResponse>('/analyses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    list: (page = 1) =>
      request<AnalysisListResponse>(`/analyses?page=${page}`),

    get: (id: string) =>
      request<Analysis>(`/analyses/${id}`),

    delete: (id: string) =>
      request<void>(`/analyses/${id}`, { method: 'DELETE' }),
  },

  generate: {
    create: (data: {
      content_type: string;
      agent_name: string;
      listing_details: string;
      tone: string;
      platforms: string[];
      include_hashtags: boolean;
      listing_price_range?: string;
      target_buyer_type?: string[];
      market_location?: string;
      brokerage_name?: string;
    }) =>
      request<GenerateResponse>('/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    history: (page = 1) =>
      request<GenerateHistoryResponse>(`/generate/history?page=${page}`),

    save: (id: string) =>
      request<GeneratedPost>(`/generate/${id}/save`, { method: 'POST' }),

    delete: (id: string) =>
      request<void>(`/generate/${id}`, { method: 'DELETE' }),

    createReel: (data: {
      platform: string;
      content_type: string;
      listing_details: string;
      tone: string;
      listing_price_range?: string;
      target_buyer_type?: string[];
    }) =>
      request<GenerateReelResponse>('/generate/reel-script', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    extractImage: (data: { imageBase64: string; mediaType?: string }) =>
      request<{ details: string }>('/generate/extract-image', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    photoScore: (data: { imageBase64: string; platform: string; buyerType?: string[]; mediaType?: string }) =>
      request<{ photoScore: number; verdict: string; fix: string }>('/generate/photo-score', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    extractUrl: (data: { url: string }) =>
      request<ExtractUrlResponse>('/generate/extract-url', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  stats: {
    dashboard: () => request<DashboardStats>('/stats'),
  },

  leads: {
    log: (data: { platform: string; name?: string; note?: string }) =>
      request<{ lead: Lead }>('/leads', { method: 'POST', body: JSON.stringify(data) }),

    list: (page = 1) =>
      request<LeadsResponse>(`/leads?page=${page}`),

    remove: (id: string) =>
      request<void>(`/leads/${id}`, { method: 'DELETE' }),

    create: (data: {
      name: string;
      email?: string;
      phone?: string;
      interest?: string;
      message?: string;
      platform?: string;
    }) => request<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: { status?: string; note?: string }) =>
      request<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  trends: {
    get: (platform: string) =>
      request<TrendsData>(`/trends/${platform}`),
    refresh: (platform: string) =>
      request<TrendsData>(`/trends/${platform}/refresh`, { method: 'POST' }),
  },

  carousel: {
    analyze: (data: {
      slides: { imageBase64: string; mediaType: string }[];
      caption?: string;
      platforms?: string[];
      content_type: string;
      listing_price_range?: string;
      target_buyer_type?: string[];
    }) =>
      request<{ carouselAnalysis: CarouselAnalysis }>('/analyses/carousel', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    get: (id: string) =>
      request<{ carouselAnalysis: CarouselAnalysis }>(`/analyses/carousel/${id}`),
  },

  calendar: {
    list: (month?: string) =>
      request<CalendarItem[]>(`/calendar${month ? `?month=${month}` : ''}`),

    create: (data: { platform: string; scheduled_at: string; generated_post_id?: string; note?: string }) =>
      request<CalendarItem>('/calendar', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: { scheduled_at?: string; status?: string; note?: string }) =>
      request<CalendarItem>(`/calendar/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

    remove: (id: string) =>
      request<void>(`/calendar/${id}`, { method: 'DELETE' }),

    generateMonth: (analysisId: string) =>
      request<GenerateMonthResponse>('/calendar/generate-month', {
        method: 'POST',
        body: JSON.stringify({ analysis_id: analysisId }),
      }),
  },
};
