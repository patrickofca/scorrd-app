import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { BUYER_TYPES, BuyerType } from '../constants/config';

interface Props {
  value: Set<BuyerType>;
  onChange: (value: Set<BuyerType>) => void;
}

export function BuyerTypeSelector({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {BUYER_TYPES.map(bt => {
        const selected = value.has(bt);
        return (
          <TouchableOpacity
            key={bt}
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={() => {
              Haptics.selectionAsync();
              const next = new Set(value);
              next.has(bt) ? next.delete(bt) : next.add(bt);
              onChange(next);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
              {bt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  pillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  pillLabelSelected: { color: Colors.surface },
});
