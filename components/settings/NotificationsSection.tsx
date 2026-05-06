import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { api, AuthExpiredError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import type { User } from '../../types';

interface Props {
  user: User;
}

interface Prefs {
  new_lead: boolean;
  weekly_digest: boolean;
  usage_warnings: boolean;
  notify_at_time: boolean;
}

const TOGGLES: { key: keyof Prefs; label: string; description: string }[] = [
  { key: 'new_lead', label: 'New lead notifications', description: 'Alert when a new lead is captured' },
  { key: 'weekly_digest', label: 'Weekly score digest', description: 'Summary of your top posts each week' },
  { key: 'usage_warnings', label: 'Usage limit warnings', description: 'Alert when nearing your plan limits' },
  { key: 'notify_at_time', label: 'Post reminders', description: 'Remind me at the scheduled time to post' },
];

export default function NotificationsSection({ user }: Props) {
  const [prefs, setPrefs] = useState<Prefs>({
    new_lead: user.notificationPrefs?.new_lead ?? true,
    weekly_digest: user.notificationPrefs?.weekly_digest ?? true,
    usage_warnings: user.notificationPrefs?.usage_warnings ?? true,
    notify_at_time: user.notificationPrefs?.notify_at_time ?? true,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.me.update({ notificationPrefs: prefs }),
    onSuccess: (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useAuthStore.setState({ user: updated });
    },
    onError: (err) => {
      if (err instanceof AuthExpiredError) return;
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save preferences. Please try again.');
    },
  });

  const toggle = (key: keyof Prefs) => {
    Haptics.selectionAsync();
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <View>
      {TOGGLES.map(({ key, label, description }) => (
        <View key={key} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowDesc}>{description}</Text>
          </View>
          <Switch
            value={prefs[key]}
            onValueChange={() => toggle(key)}
            trackColor={{ false: Colors.border, true: Colors.teal }}
            thumbColor="#FFF"
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveBtn, isPending && styles.disabled]}
        onPress={() => mutate()}
        disabled={isPending}
      >
        <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Save Preferences'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 16,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: FontSize.base, fontFamily: FontFamily.sansMedium, color: Colors.textPrimary, marginBottom: 2 },
  rowDesc: { fontSize: FontSize.xs, fontFamily: FontFamily.sans, color: Colors.textSecondary },
  saveBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: FontSize.base, fontFamily: FontFamily.sansSemibold },
});
