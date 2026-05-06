import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScoreRing } from "./ScoreRing";
import { InfoCallout } from "./InfoCallout";
import { Colors, scoreColor } from "../constants/colors";
import { FontFamily, FontSize } from "../constants/typography";

const WHY_IT_MATTERS =
  "Misaligned content fills your inbox with unqualified leads. " +
  "The fixes below target the buyer who can actually close.";

interface AudienceMatchBreakdown {
  detected_audience_signals: string[];
  expected_audience: string;
  target_audience: string;
  gap_analysis: string;
  rewrite_suggestions: string[];
}

interface Props {
  score: number;
  verdict: string;
  breakdown: AudienceMatchBreakdown;
}

function matchLabel(score: number): string {
  if (score >= 7) return "Strong Match";
  if (score >= 5) return "Partial Match";
  return "Audience Mismatch";
}

export function AudienceMatchCard({ score, verdict, breakdown }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(score);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <ScoreRing score={score} size={72} strokeWidth={7} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{matchLabel(score)}</Text>
          <Text style={styles.weight}>Are you reching your Buyer?</Text>
          <Text style={styles.weight}>20% weight</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={Colors.textSecondary}
        />
      </View>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.divider} />

          {verdict && verdict.trim() ? (
            <Text style={styles.verdictText}>{verdict}</Text>
          ) : null}

          <InfoCallout label="Why This Matters" body={WHY_IT_MATTERS} />

          <Text style={styles.fieldLabel}>Detected Signals</Text>
          {breakdown.detected_audience_signals.map((s, i) => (
            <Text key={i} style={styles.bullet}>
              · {s}
            </Text>
          ))}

          <View style={styles.compareRow}>
            <View style={styles.compareBox}>
              <Text style={styles.compareLabel}>WHO IT ATTRACTS</Text>
              <Text style={styles.compareValue}>
                {breakdown.expected_audience}
              </Text>
            </View>
            <View style={[styles.compareBox, styles.compareBoxRight]}>
              <Text style={styles.compareLabel}>YOUR TARGET</Text>
              <Text style={[styles.compareValue, { color }]}>
                {breakdown.target_audience}
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Gap Analysis</Text>
          <Text style={styles.gapText}>{breakdown.gap_analysis}</Text>

          <Text style={styles.fieldLabel}>How to Fix It</Text>
          {breakdown.rewrite_suggestions.map((s, i) => (
            <View key={i} style={styles.suggestionRow}>
              <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>{i + 1}</Text>
              </View>
              <Text style={styles.suggestionText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  weight: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  body: { marginTop: 4 },
  verdictText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  bullet: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 2,
  },
  compareRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  compareBox: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    borderRadius: 8,
    padding: 12,
  },
  compareBoxRight: {},
  compareLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  compareValue: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  gapText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  suggestionText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});
