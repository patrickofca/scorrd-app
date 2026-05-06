import { useEffect, useRef, useState } from "react";
import { posthog } from "../services/analytics";
import { PostHogProvider } from "posthog-react-native";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import {
  Stack,
  useRouter,
  useSegments,
  usePathname,
  useGlobalSearchParams,
  SplashScreen,
} from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import * as Notifications from "expo-notifications";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";
import { useFormDraftStore } from "../store/formDraftStore";
import { api } from "../services/api";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();

// ─── Auth routing ────────────────────────────────────────────────────────────

function AuthGate() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrated = useAuthStore((s) => s.hydrated);
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  // Track whether the user has ever had a live token this session,
  // so we only save a return path on expiry (not on cold start with no token).
  const hadTokenRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!accessToken && !inAuthGroup) {
      if (hadTokenRef.current) {
        useAuthStore.getState().setExpiredPath(pathname);
      }
      router.replace("/(auth)/login");
    } else if (accessToken && inAuthGroup) {
      hadTokenRef.current = true;
      const { expiredPath } = useAuthStore.getState();
      const { returnPath } = useFormDraftStore.getState();
      useAuthStore.getState().setExpiredPath(null);
      router.replace((expiredPath ?? returnPath ?? "/(tabs)/analyze") as any);
    } else if (accessToken) {
      hadTokenRef.current = true;
    }
  }, [accessToken, hydrated, segments]);

  return null;
}

// ─── PostHog screen tracking ─────────────────────────────────────────────────

function ScreenTracker() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return null;
}

// ─── PostHog identity tracking ───────────────────────────────────────────────

function Analytics() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const prevTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (accessToken && user) {
      posthog.identify(user.id, {
        plan_tier: user.plan ?? null,
        market: user.marketLocation ?? null,
      });
    } else if (!accessToken && prevTokenRef.current) {
      posthog.reset();
    }
    prevTokenRef.current = accessToken;
  }, [accessToken, user?.id]);

  return null;
}

// ─── Push notification registration ──────────────────────────────────────────

function PushSetup() {
  const { accessToken, hydrated, setPushToken } = useAuthStore();

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    (async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Scorrd",
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      const { status } =
        existing === "granted"
          ? { status: existing }
          : await Notifications.requestPermissionsAsync();

      if (status !== "granted") return;

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync();
        setPushToken(token);
        await api.me.update({ push_token: token });
      } catch {
        // Project ID not configured or network error — silent fail
      }
    })();
  }, [hydrated, accessToken]);

  return null;
}

// ─── Foreground notification banner ──────────────────────────────────────────

function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as Record<
          string,
          unknown
        >;
        if (data?.type !== "new_lead") return;

        if (hideTimer.current) clearTimeout(hideTimer.current);

        setTitle(notification.request.content.title ?? "New Lead");
        setBody(
          notification.request.content.body ?? "A new lead was captured.",
        );
        setVisible(true);

        Animated.spring(translateY, {
          toValue: insets.top,
          useNativeDriver: true,
          bounciness: 4,
        }).start();

        hideTimer.current = setTimeout(() => {
          Animated.timing(translateY, {
            toValue: -120,
            duration: 280,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        }, 4000);
      },
    );

    return () => {
      sub.remove();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [insets.top]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View style={styles.bannerDot} />
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.bannerBody} numberOfLines={1}>
          {body}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Root layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  const { hydrate } = useAuthStore();

  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSerifDisplay_400Regular,
    JetBrainsMono_400Regular,
  });

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{ captureScreens: false, captureTouches: true }}
    >
      <QueryClientProvider client={queryClient}>
        <ScreenTracker />
        <AuthGate />
        <Analytics />
        <PushSetup />
        <Stack screenOptions={{ headerShown: false }} />
        <NotificationBanner />
      </QueryClientProvider>
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: "#1C2B3A",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0EA5A0",
    flexShrink: 0,
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: "#FFF",
    marginBottom: 1,
  },
  bannerBody: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
});
