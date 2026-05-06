import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { api } from '../../services/api';
import type { TrendsData } from '../../types';

const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'twitter', 'tiktok'] as const;
type Platform = typeof PLATFORMS[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  tiktok: 'TikTok',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({ width, height = 14, style }: { width: number | string; height?: number; style?: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: 6, backgroundColor: Colors.border, opacity }, style]}
    />
  );
}

function SkeletonSection() {
  return (
    <View style={styles.section}>
      <SkeletonBlock width={120} height={12} style={{ marginBottom: 16 }} />
      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 10 }} />
      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 10 }} />
      <SkeletonBlock width="80%" height={56} />
    </View>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function FormatCard({ format, why_it_works, example_hook }: { format: string; why_it_works: string; example_hook: string }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCardDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowCardTitle}>{format}</Text>
        <Text style={styles.rowCardBody}>{why_it_works}</Text>
        {example_hook ? <Text style={styles.rowCardHook}>"{example_hook}"</Text> : null}
      </View>
    </View>
  );
}

function TopicCard({ topic, angle }: { topic: string; angle: string }) {
  return (
    <View style={styles.rowCard}>
      <View style={[styles.rowCardDot, { backgroundColor: '#8B5CF6' }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowCardTitle}>{topic}</Text>
        <Text style={styles.rowCardBody}>{angle}</Text>
      </View>
    </View>
  );
}

function HashtagPills({ tags, color }: { tags: string[]; color: string }) {
  return (
    <View style={styles.pillRow}>
      {tags.map((tag) => (
        <View key={tag} style={[styles.hashtagPill, { borderColor: color }]}>
          <Text style={[styles.hashtagPillText, { color }]}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

function AvoidCard({ text }: { text: string }) {
  return (
    <View style={[styles.rowCard, { borderLeftColor: Colors.scoreRed, borderLeftWidth: 3 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowCardBody, { color: Colors.textPrimary }]}>{text}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TrendsScreen() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async (p: Platform) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await api.trends.get(p);
      setData(result);
    } catch {
      setError('Could not load trends. Tap refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const result = await api.trends.refresh(platform);
      setData(result);
    } catch {
      setError('Refresh failed. Try again.');
    } finally {
      setRefreshing(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchTrends(platform);
  }, [platform]);

  const handlePlatformChange = (p: Platform) => {
    if (p === platform) return;
    setPlatform(p);
  };

  const handleGenerateFromHere = () => {
    router.push('/(tabs)/generate');
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trends</Text>
        <TouchableOpacity
          style={[styles.refreshBtn, refreshing && styles.refreshBtnDisabled]}
          onPress={handleRefresh}
          disabled={refreshing || loading}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={refreshing || loading ? Colors.textSecondary : Colors.teal}
          />
          <Text style={[styles.refreshBtnText, (refreshing || loading) && { color: Colors.textSecondary }]}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Platform pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.platformScroll}
        contentContainerStyle={styles.platformRow}
      >
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.platformPill, platform === p && styles.platformPillActive]}
            onPress={() => handlePlatformChange(p)}
          >
            <Text style={[styles.platformPillText, platform === p && styles.platformPillTextActive]}>
              {PLATFORM_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <>
            <SkeletonSection />
            <SkeletonSection />
            <SkeletonSection />
          </>
        ) : error ? (
          <View style={styles.errorState}>
            <Ionicons name="cloud-offline-outline" size={40} color={Colors.textSecondary} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTrends(platform)}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : data ? (
          <>
            {/* Platform Insight */}
            <View style={styles.insightCallout}>
              <Ionicons name="bulb-outline" size={16} color={Colors.teal} />
              <Text style={styles.insightText}>{data.platform_insight}</Text>
            </View>

            {/* Trending Formats */}
            <View style={styles.section}>
              <SectionHeader label="TRENDING FORMATS" />
              {(data.trending_formats ?? []).map((item, i) => (
                <FormatCard key={i} format={item.format} why_it_works={item.why_it_works} example_hook={item.example_hook} />
              ))}
            </View>

            {/* Hot Topics */}
            <View style={styles.section}>
              <SectionHeader label="HOT TOPICS" />
              {(data.trending_topics ?? []).map((item, i) => (
                <TopicCard key={i} topic={item.topic} angle={item.angle} />
              ))}
            </View>

            {/* Hashtag Strategy */}
            <View style={styles.section}>
              <SectionHeader label="HASHTAG STRATEGY" />
              <View style={styles.hashtagGroup}>
                <Text style={styles.hashtagGroupLabel}>Broad (1M+)</Text>
                <HashtagPills tags={data.hashtag_strategy.broad ?? []} color={Colors.teal} />
              </View>
              <View style={styles.hashtagGroup}>
                <Text style={styles.hashtagGroupLabel}>Mid (100k–1M)</Text>
                <HashtagPills tags={data.hashtag_strategy.mid ?? []} color="#8B5CF6" />
              </View>
              <View style={styles.hashtagGroup}>
                <Text style={styles.hashtagGroupLabel}>Niche (&lt;100k)</Text>
                <HashtagPills tags={data.hashtag_strategy.niche ?? []} color={Colors.scoreAmber} />
              </View>
            </View>

            {/* What to Avoid */}
            <View style={styles.section}>
              <SectionHeader label="WHAT TO AVOID" />
              {(data.avoid ?? []).map((item, i) => (
                <AvoidCard key={i} text={item} />
              ))}
            </View>

            {/* Generate from here */}
            <TouchableOpacity style={styles.generateCta} onPress={handleGenerateFromHere}>
              <View style={styles.generateCtaLeft}>
                <Text style={styles.generateCtaTitle}>Create content around these trends</Text>
                <Text style={styles.generateCtaBody}>Jump to Generate with {PLATFORM_LABELS[platform]} selected</Text>
              </View>
              <Ionicons name="arrow-forward-outline" size={20} color={Colors.teal} />
            </TouchableOpacity>

            {data.last_updated ? (
              <Text style={styles.lastUpdated}>
                Last updated {new Date(data.last_updated).toLocaleDateString()}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.offWhite,
  },
  headerTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.teal,
  },
  refreshBtnDisabled: {
    borderColor: Colors.border,
  },
  refreshBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    color: Colors.teal,
  },
  platformScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  platformRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  platformPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  platformPillActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  platformPillText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  platformPillTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  insightCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
    padding: 14,
    marginBottom: 20,
  },
  insightText: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
    color: Colors.teal,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.teal,
    marginTop: 4,
    flexShrink: 0,
  },
  rowCardTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  rowCardBody: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  rowCardHook: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    color: Colors.teal,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  hashtagGroup: {
    marginBottom: 12,
  },
  hashtagGroupLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hashtagPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  hashtagPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
  },
  generateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  generateCtaLeft: {
    flex: 1,
  },
  generateCtaTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  generateCtaBody: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  lastUpdated: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: Colors.teal,
    marginTop: 4,
  },
  retryBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: FontSize.sm,
    color: '#FFFFFF',
  },
});
