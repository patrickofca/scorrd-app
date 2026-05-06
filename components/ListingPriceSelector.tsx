import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';

const OPTIONS: { label: string; value: string | null }[] = [
  { label: 'Any price', value: null },
  { label: 'Under $300k', value: 'Under $300k' },
  { label: '$300k–$600k', value: '$300k–$600k' },
  { label: '$600k–$900k', value: '$600k–$900k' },
  { label: '$900k–$1.5M', value: '$900k–$1.5M' },
  { label: '$1.5M+', value: '$1.5M+' },
];

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ListingPriceSelector({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.rowContent}
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.label}
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(selected ? null : opt.value);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 16 },
  rowContent: { paddingRight: 20 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  pillSelected: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  pillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  pillLabelSelected: { color: Colors.surface },
});
