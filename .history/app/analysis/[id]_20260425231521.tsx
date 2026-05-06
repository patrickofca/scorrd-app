import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../services/api';
import { Colors, scoreColor } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { ScoreRing } from '../../components/ScoreRing';
import { ScoreCard } from '../../components/ScoreCard';

const REWRITE_TABS = [
  { key: 'rewriteInstagram', label: 'Instagram' },
  { key: 'rewriteFacebook', label: 'Facebook' },
  { key: 'rewriteLinkedin', label: 'LinkedIn' },
  { key: 'rewriteTwitter', label: 'Twitter' },
  { key: 'rewriteTiktok', label: 'TikTok' },
] as const;

export default function AnalysisResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [rewriteTab, setRewriteTab] = useState<typeof REWRITE_TABS[number]['key']>('rewriteInstagram');

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => api.analyses.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.teal} />
          <Text style={styles.loadingText}>Loading your score...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !analysis) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Could not load analysis</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const breakdown = analysis.scoreBreakdown;
  const color = scoreColor(analysis.compositeScore);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Score Report</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Composite score ring */}
        <View style={styles.scoreSection}>
          <ScoreRing score={analysis.compositeScore} size={160} strokeWidth={14} />
          <Text style={styles.scoreLabel}>Composite Score</Text>
          <Text style={styles.postPlatform}>
            {analysis.post?.platform?.toUpperCase()} ·{' '}
            {analysis.post?.contentType?.replace(/_/g, ' ')}
          </Text>
        </View>

        {/* Four dimension cards — 2x2 grid */}
        <Text style={styles.sectionTitle}>Dimension Scores</Text>
        <Text style={styles.sectionSub}>Tap a card to see Claude's reasoning</Text>
        <View style={styles.cardGrid}>
          <View style={styles.cardRow}>
            <ScoreCard
              title="Virality"
              score={analysis.viralityScore}
              weight="25% weight"
              evidence={breakdown.virality.evidence}
            />
            <ScoreCard
              title="Follower Attraction"
              score={analysis.followerScore}
              weight="20% weight"
              evidence={breakdown.follower.evidence}
            />
          </View>
          <View style={styles.cardRow}>
            <ScoreCard
              title="Lead Capture"
              score={analysis.leadCaptureScore}
              weight="35% weight"
              evidence={breakdown.lead_capture.evidence}
            />
            <ScoreCard
              title="Trust & Authority"
              score={analysis.trustScore}
              weight="20% weight"
              evidence={breakdown.trust.evidence}
            />
          </View>
        </View>

        {/* What to fix */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to Fix</Text>
          {analysis.recommendations.map((rec, i) => (
            <View key={i} style={styles.recommendationRow}>
              <View style={[styles.recommendationBadge, { backgroundColor: i === 0 ? color : Colors.border }]}>
                <Text style={[styles.recommendationBadgeText, { color: i === 0 ? Colors.surface : Colors.textSecondary }]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* Platform rewrites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optimized Rewrites</Text>
          <Text style={styles.sectionSub}>Ready-to-post versions for each platform</Text>

          {/* Tab switcher */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
            {REWRITE_TABS.map((tab) => {
              const hasContent = !!analysis[tab.key];
              if (!hasContent) return null;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, rewriteTab === tab.key && styles.tabActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRewriteTab(tab.key);
                  }}
                >
                  <Text style={[styles.tabLabel, rewriteTab === tab.key && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Rewrite content */}
          {analysis[rewriteTab] ? (
            <View style={styles.rewriteBox}>
              <Text style={styles.rewriteText}>{analysis[rewriteTab]}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Copied!', 'Rewrite copied to clipboard.');
                }}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.teal} />
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Lead magnet suggestion */}
        {analysis.leadMagnetSuggestion && (
          <View style={[styles.section, styles.leadMagnetCard]}>
            <View style={styles.leadMagnetHeader}>
              <Ionicons name="magnet-outline" size={18} color={Colors.teal} />
              <Text style={styles.leadMagnetTitle}>Lead Magnet Idea</Text>
            </View>
            <Text style={styles.leadMagnetText}>{analysis.leadMagnetSuggestion}</Text>
          </View>
        )}

        {/* Hashtags */}
        {analysis.hashtagRecommendations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hashtag Strategy</Text>
            {(['top', 'niche', 'brand'] as const).map((tier) => {
              const tags = analysis.hashtagRecommendations![tier];
              if (!tags?.length) return null;
              return (
                <View key={tier} style={styles.hashtagGroup}>
                  <Text style={styles.hashtagTierLabel}>{tier.toUpperCase()}</Text>
                  <View style={styles.hashtagRow}>
                    {tags.map((tag, i) => (
                      <View key={i} style={styles.hashtagPill}>
                        <Text style={styles.hashtagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Optimal post times */}
        {analysis.optimalPostTimes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Best Times to Post</Text>
            {Object.entries(analysis.optimalPostTimes).map(([p, times]) => (
              <View key={p} style={styles.timeRow}>
                <Text style={styles.timePlatform}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                <Text style={styles.timeValues}>{times.join(' · ')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer meta */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Scored by {analysis.claudeModelVersion} · {analysis.tokensUsed?.toLocaleString()} tokens
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.error,
  },
  backLink: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
  },

  // Composite score
  scoreSection: { alignItems: 'center', paddingVertical: 24 },
  scoreLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  postPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Dimension cards
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  cardGrid: { gap: 10, marginBottom: 32 },
  cardRow: { flexDirection: 'row', gap: 10 },

  // What to fix
  section: { marginBottom: 32 },
  recommendationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  recommendationBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  recommendationBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
  },
  recommendationText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  // Rewrites
  tabRow: { marginBottom: 14 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  tabActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  tabLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  tabLabelActive: { color: Colors.surface },
  rewriteBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rewriteText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    alignSelf: 'flex-end',
  },
  copyButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
  },

  // Lead magnet
  leadMagnetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.teal,
  },
  leadMagnetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  leadMagnetTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  leadMagnetText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  // Hashtags
  hashtagGroup: { marginBottom: 14 },
  hashtagTierLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashtagPill: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hashtagText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.mono,
    color: Colors.navy,
  },

  // Post times
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timePlatform: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
  },
  timeValues: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
  },

  // Footer
  footer: { alignItems: 'center', paddingTop: 8 },
  footerText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
  },
});
