import PostHog from 'posthog-react-native';

export const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    captureAppLifecycleEvents: true,
    flushAt: 20,
    flushInterval: 10000,
  }
);
