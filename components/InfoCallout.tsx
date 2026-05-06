import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { FontFamily } from '../constants/typography';

interface Props {
  label: string;
  body: string;
}

export function InfoCallout({ label, body }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
    backgroundColor: Colors.offWhite,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
});
