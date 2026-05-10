import { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { usePreFillStore } from '../store/preFillStore';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';

const ONBOARDING_KEY = 'scorrd.onboarding.v1.seen';

const SAMPLE_POST =
  "Just listed! 3BR/2BA in Oak Park. $649K. DM for showings 🏡✨ #realestate #justlisted #realtor";

const DIMENSIONS = [
  { label: 'Virality', score: 9.1 },
  { label: 'Lead Capture', score: 7.8 },
  { label: 'Follower Attraction', score: 8.2 },
  { label: 'Trust & Authority', score: 8.6 },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const handled = useRef(false);

  async function markSeen(draft?: string) {
    if (handled.current) return;
    handled.current = true;
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    if (draft) {
      usePreFillStore.getState().set({ draft, priceRange: null, buyerTypes: [] });
    }
    router.replace('/(tabs)/analyze' as any);
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
        source={require('../assets/scorrd_app_badge.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.headline}>AI that grades your posts.</Text>
      <Text style={styles.subhead}>
        Paste any post. Get a score in 13 seconds.{'\n'}Know exactly what to fix.
      </Text>

      <View style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreValue}>8.4</Text>
          <Text style={styles.scoreCircleLabel}>Composite Score</Text>
        </View>
        <View style={styles.dimensions}>
          {DIMENSIONS.map(({ label, score }) => (
            <View key={label} style={styles.dimRow}>
              <Text style={styles.dimLabel}>{label}</Text>
              <Text style={styles.dimScore}>{score.toFixed(1)}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.ctaBtn} onPress={handleCta} activeOpacity={0.85}>
        <Text style={styles.ctaBtnText}>Score my first post →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip — I'll start from scratch</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.offWhite },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    paddingBottom: 48,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  headline: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  subhead: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  scoreCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  scoreCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 7,
    borderColor: Colors.scoreGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreValue: {
    fontSize: 34,
    fontFamily: FontFamily.serif,
    color: Colors.scoreGreen,
    lineHeight: 38,
  },
  scoreCircleLabel: {
    fontSize: 9,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dimensions: {
    width: '100%',
    gap: 10,
  },
  dimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dimLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
  },
  dimScore: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.serif,
    color: Colors.scoreGreen,
  },
  ctaBtn: {
    width: '100%',
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaBtnText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
    color: '#FFF',
  },
  skipBtn: { paddingVertical: 8 },
  skipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
});
