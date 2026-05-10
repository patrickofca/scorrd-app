import { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import { ScoreRing } from "../components/ScoreRing";
import { ScoreCard } from "../components/ScoreCard";
import { usePreFillStore } from "../store/preFillStore";
import { Colors } from "../constants/colors";
import { FontFamily, FontSize } from "../constants/typography";

const ONBOARDING_KEY = "scorrd.onboarding.v1.seen";

const SAMPLE_POST =
  "Just listed! 3BR/2BA in Oak Park. $649K. DM for showings 🏡✨ #realestate #justlisted #realtor";

export default function OnboardingScreen() {
  const router = useRouter();
  const handled = useRef(false);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);

  async function markSeen(draft?: string) {
    if (handled.current) return;
    handled.current = true;
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
    if (draft) {
      usePreFillStore
        .getState()
        .set({ draft, priceRange: null, buyerTypes: [] });
    }
    router.replace("/(tabs)/analyze" as any);
  }

  const handleCta = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markSeen(SAMPLE_POST);
  };

  const handleSkip = async () => {
    await Haptics.selectionAsync();
    await markSeen();
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={require("../assets/scorrd_app_badge.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.headline}>Stop guessing why posts flop.</Text>
      <Text style={styles.subhead}>
        Paste any post. Get a score in 13 seconds.{"\n"}
        Know exactly what to fix before you publish.
      </Text>

      <Text style={styles.worldview}>Likes are a hobby. Leads are a business.</Text>

      {/* Example post card — anchors the score below to something concrete */}
      <View style={styles.examplePostCard}>
        <Text style={styles.examplePostLabel}>EXAMPLE POST</Text>
        <Text style={styles.examplePostText}>{SAMPLE_POST}</Text>
      </View>

      {/* Composite score ring — identical to analysis/[id].tsx */}
      <View style={styles.scoreSection}>
        <ScoreRing score={8.4} size={160} strokeWidth={14} />
        <Text style={styles.scoreLabel}>Composite Score</Text>
        <Text style={styles.postPlatform}>INSTAGRAM · NEW LISTING</Text>
      </View>

      {/* Dimension cards — 2×2 grid, identical layout to analysis/[id].tsx */}
      <Text style={styles.sectionTitle}>Dimension Scores</Text>
      <Text style={styles.sectionSub}>
        Every post is graded on the four things that actually drive realtor
        business — so you know exactly where it's strong and where it's leaking
        leads.
      </Text>

      <View style={styles.cardGrid}>
        <View style={styles.cardRow}>
          <ScoreCard
            title="Virality"
            score={9.1}
            weight="25% weight"
            evidence={[]}
          />
          <ScoreCard
            title="Follower Attraction"
            score={8.2}
            weight="20% weight"
            evidence={[]}
          />
        </View>
        <View style={styles.cardRow}>
          <ScoreCard
            title="Lead Capture"
            score={7.8}
            weight="35% weight"
            evidence={[]}
          />
          <ScoreCard
            title="Trust & Authority"
            score={8.6}
            weight="20% weight"
            evidence={[]}
          />
        </View>
      </View>

      {/* "What happens next" — closes the loop between score and action */}
      <View style={styles.nextStepRow}>
        <Ionicons
          name="sparkles"
          size={14}
          color={Colors.teal}
          style={{ marginRight: 6 }}
        />
        <Text style={styles.nextStepText}>
          You'll get specific fixes for every weak area.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={handleCta}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaBtnText}>Score my first post →</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip — I'll start from scratch</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.offWhite },
  container: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 48,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginTop: 60,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headline: {
    fontSize: FontSize["2xl"],
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    textAlign: "center",
    marginBottom: 8,
  },
  subhead: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 4,
  },
  worldview: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    fontStyle: "italic",
    color: Colors.teal,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  // Example post card — visually distinct so it reads as "the thing being scored"
  examplePostCard: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 4,
  },
  examplePostLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  examplePostText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.navy,
    lineHeight: 20,
  },
  // Copied exactly from analysis/[id].tsx
  scoreSection: { alignItems: "center", paddingVertical: 24 },
  scoreLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  postPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: "uppercase",
  },
  scoreInfoToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    width: "100%",
  },
  scoreInfoToggleLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  sectionSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  cardGrid: { gap: 10, marginBottom: 20, width: "100%" },
  cardRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  // "What happens next" row — small, teal-accented, sits just above the CTA
  nextStepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  nextStepText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.navy,
  },
  ctaBtn: {
    width: "100%",
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  ctaBtnText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
    color: "#FFF",
  },
  skipBtn: { paddingVertical: 8 },
  skipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
});
