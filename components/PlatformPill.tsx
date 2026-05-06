import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { Platform, PLATFORM_LABELS } from '../constants/config';

interface PlatformPillProps {
  platform: Platform;
  selected: boolean;
  onPress: (platform: Platform) => void;
}

export function PlatformPill({ platform, selected, onPress }: PlatformPillProps) {
  function handlePress() {
    Haptics.selectionAsync();
    onPress(platform);
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.pill, selected && styles.selected]}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {PLATFORM_LABELS[platform]}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  selected: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: Colors.surface,
  },
});
