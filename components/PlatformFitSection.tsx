import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, scoreColor } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { PLATFORM_LABELS, Platform } from '../constants/config';

interface PlatformFitItem {
  platform: string;
  fit_score: number;
  fit_verdict: string;
  what_to_change: string;
}

interface Props {
  items: PlatformFitItem[];
}

export function PlatformFitSection({ items }: Props) {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => b.fit_score - a.fit_score);
  const nativePlatform = sorted[0]?.platform;

  function toggleExpand(platform: string) {
    Haptics.selectionAsync();
    setExpandedPlatform(prev => prev === platform ? null : platform);
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map(item => {
          const color = scoreColor(item.fit_score);
          const isNative = item.platform === nativePlatform;
          const isExpanded = expandedPlatform === item.platform;

          return (
            <TouchableOpacity
              key={item.platform}
              style={[styles.card, isExpanded && styles.cardExpanded]}
              onPress={() => toggleExpand(item.platform)}
              activeOpacity={0.8}
            >
              {isNative && (
                <View style={styles.nativeBadge}>
                  <Text style={styles.nativeBadgeText}>Native</Text>
                </View>
              )}
              <Text style={styles.platformName}>
                {PLATFORM_LABELS[item.platform as Platform] ?? item.platform}
              </Text>
              <Text style={[styles.fitScore, { color }]}>{item.fit_score.toFixed(1)}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(item.fit_score / 10) * 100}%`, backgroundColor: color },
                  ]}
                />
              </View>
              <Text style={styles.verdict} numberOfLines={isExpanded ? undefined : 2}>
                {item.fit_verdict}
              </Text>
              {isExpanded && (
                <View style={styles.expandedSection}>
                  <Text style={styles.changeLabel}>WHAT TO CHANGE</Text>
                  <Text style={styles.changeText}>{item.what_to_change}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingRight: 20,
    gap: 10,
  },
  card: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  cardExpanded: {
    borderColor: Colors.teal,
  },
  nativeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.teal,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  nativeBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
  },
  fitScore: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  verdict: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  expandedSection: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  changeLabel: {
    fontSize: 9,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  changeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
});
