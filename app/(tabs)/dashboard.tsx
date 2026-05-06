import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryScatter } from 'victory-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Colors, scoreColor } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { PLATFORM_LABELS, Platform } from '../../constants/config';
import type { DashboardStats } from '../../types';

const CHART_WIDTH = Dimensions.get('window').width - 72;

const DIMENSION_LABELS = {
  virality: 'Virality',
  follower: 'Follower Attraction',
  leadCapture: 'Lead Capture',
  trust: 'Trust & Authority',
} as const;

const PATTERN_LABELS: Record<string, string> = {
  listing_announcement: 'Listing Announcement',
  market_insight: 'Market Insight',
  social_proof: 'Social Proof',
  lifestyle: 'Lifestyle',
  education: 'Education',
  behind_the_scenes: 'Behind the Scenes',
  local_spotlight: 'Local Spotlight',
};

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.stats.dashboard()
        .then(setStats)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || stats.quickStats.analysesThisMonth === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="bar-chart-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyText}>Analyze your first post to unlock your dashboard</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/(tabs)/analyze')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyButtonText}>Analyze a Post</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { quickStats, scoreTrend, dimensionAverages, platformBreakdown, contentPatterns } = stats;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Dashboard</Text>
        <Text style={styles.subheading}>Last 30 days</Text>

        {/* Quick stats 2×2 */}
        <View style={styles.statGrid}>
          <StatCard label="Posts Scored" value={String(quickStats.analysesThisMonth)} />
          <StatCard
            label="Avg Score"
            value={quickStats.avgCompositeScore.toFixed(1)}
            valueColor={scoreColor(quickStats.avgCompositeScore)}
          />
          <StatCard
            label="Best Platform"
            value={
              quickStats.topPlatform
                ? (PLATFORM_LABELS[quickStats.topPlatform as Platform] ?? quickStats.topPlatform)
                : '—'
            }
          />
          <StatCard label="Leads" value={String(quickStats.leadsThisMonth)} />
        </View>

        {/* Score trend */}
        {scoreTrend.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Score Trend</Text>
            <View style={styles.chartCard}>
              <VictoryChart
                width={CHART_WIDTH}
                height={180}
                padding={{ top: 12, bottom: 36, left: 36, right: 12 }}
              >
                <VictoryAxis
                  tickCount={Math.min(scoreTrend.length, 5)}
                  tickFormat={(t: number) => {
                    const d = new Date(t);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  style={{
                    axis: { stroke: Colors.border },
                    tickLabels: { fontSize: 9, fill: Colors.textSecondary },
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  domain={[0, 10]}
                  tickCount={5}
                  style={{
                    axis: { stroke: Colors.border },
                    tickLabels: { fontSize: 9, fill: Colors.textSecondary },
                    grid: { stroke: Colors.border, strokeDasharray: '4,4' },
                  }}
                />
                <VictoryLine
                  data={scoreTrend.map(d => ({ x: new Date(d.date).getTime(), y: d.avgScore }))}
                  interpolation="monotoneX"
                  style={{ data: { stroke: Colors.teal, strokeWidth: 2 } }}
                />
                <VictoryScatter
                  data={scoreTrend.map(d => ({ x: new Date(d.date).getTime(), y: d.avgScore }))}
                  size={3.5}
                  style={{ data: { fill: Colors.teal } }}
                />
              </VictoryChart>
            </View>
          </View>
        )}

        {/* Dimension averages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dimension Averages</Text>
          <View style={styles.card}>
            {(Object.keys(DIMENSION_LABELS) as Array<keyof typeof DIMENSION_LABELS>).map((key) => {
              const score = dimensionAverages[key];
              return (
                <DimBar
                  key={key}
                  label={DIMENSION_LABELS[key]}
                  score={score}
                />
              );
            })}
          </View>
        </View>

        {/* Platform breakdown */}
        {platformBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Platform</Text>
            <View style={styles.card}>
              {[...platformBreakdown]
                .sort((a, b) => b.avgScore - a.avgScore)
                .map((item) => (
                  <DimBar
                    key={item.platform}
                    label={PLATFORM_LABELS[item.platform as Platform] ?? item.platform}
                    score={item.avgScore}
                    sublabel={`${item.count} post${item.count !== 1 ? 's' : ''}`}
                  />
                ))}
            </View>
          </View>
        )}

        {/* Content patterns */}
        {contentPatterns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content Patterns</Text>
            <View style={styles.card}>
              {contentPatterns.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.patternRow,
                    i < contentPatterns.length - 1 && styles.patternBorder,
                  ]}
                >
                  <Text style={styles.patternLabel}>
                    {item.pattern
                      ? (PATTERN_LABELS[item.pattern] ?? item.pattern)
                      : 'Uncategorized'}
                  </Text>
                  <View style={styles.patternRight}>
                    <Text style={styles.patternCount}>{item.count} posts</Text>
                    <Text style={[styles.patternScore, { color: scoreColor(item.avgScore) }]}>
                      {item.avgScore.toFixed(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DimBar({
  label,
  score,
  sublabel,
}: {
  label: string;
  score: number;
  sublabel?: string;
}) {
  const color = scoreColor(score);
  return (
    <View style={styles.barRow}>
      <View style={styles.barLeft}>
        <Text style={styles.barLabel}>{label}</Text>
        {sublabel && <Text style={styles.barSublabel}>{sublabel}</Text>}
      </View>
      <View style={styles.barRight}>
        <View style={styles.barTrack}>
          <View
            style={[styles.barFill, { width: `${(score / 10) * 100}%`, backgroundColor: color }]}
          />
        </View>
        <Text style={[styles.barScore, { color }]}>{score.toFixed(1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  heading: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 4,
  },
  subheading: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginBottom: 24,
  },

  // Empty state
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: Colors.teal,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },

  // Quick stats grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Sections
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 12,
  },

  // Chart
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
  },

  // Shared card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Dimension / platform bars
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  barLeft: { flex: 1 },
  barLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
  },
  barSublabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  barRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barScore: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    width: 28,
    textAlign: 'right',
  },

  // Content patterns
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  patternBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  patternLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
  },
  patternRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patternCount: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  patternScore: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.mono,
    width: 28,
    textAlign: 'right',
  },
});
