import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, scoreColor } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';

interface ScoreCardProps {
  title: string;
  score: number;
  weight: string;
  evidence: string[];
}

export function ScoreCard({ title, score, weight, evidence }: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(score);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={styles.meta}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.weight}>{weight}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.score, { color }]}>{score.toFixed(1)}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textSecondary}
            style={styles.chevron}
          />
        </View>
      </View>

      {expanded && evidence.length > 0 && (
        <View style={styles.evidence}>
          {evidence.map((item, i) => (
            <Text key={i} style={styles.evidenceItem}>
              · {item}
            </Text>
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
    flex: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  meta: { flex: 1 },
  title: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
  },
  weight: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end' },
  score: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
  },
  chevron: { marginTop: 4 },
  evidence: { marginTop: 12, gap: 6 },
  evidenceItem: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
});
