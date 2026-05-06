import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { api, AuthExpiredError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import ImageUpload from '../ImageUpload';
import type { User } from '../../types';

interface Props {
  user: User;
}

export default function ProfileSection({ user }: Props) {
  const [name, setName] = useState(user.name ?? '');
  const [market, setMarket] = useState(user.marketLocation ?? '');
  const [brokerage, setBrokerage] = useState(user.brokerageName ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.me.update({
        name: name.trim() || null,
        market_location: market.trim() || null,
        brokerage_name: brokerage.trim() || null,
        ...(avatarBase64 ? { avatar_url: avatarBase64 } : {}),
      }),
    onSuccess: (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useAuthStore.getState().setUser(updated);
      setAvatarBase64(null);
    },
    onError: (err) => {
      if (err instanceof AuthExpiredError) return;
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
    },
  });

  const initials = (user.name ?? user.email ?? 'A').charAt(0).toUpperCase();

  return (
    <View>
      <View style={styles.avatarRow}>
        <ImageUpload
          uri={avatarUri}
          initials={initials}
          size={80}
          shape="circle"
          onChange={(uri, b64) => { setAvatarUri(uri); setAvatarBase64(b64); }}
          onRemove={() => { setAvatarUri(null); setAvatarBase64(null); }}
        />
      </View>

      <Text style={styles.label}>Agent Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your full name"
        placeholderTextColor="#94A3B8"
        autoCapitalize="words"
      />

      <Text style={styles.label}>Market</Text>
      <TextInput
        style={styles.input}
        value={market}
        onChangeText={setMarket}
        placeholder="e.g. Miami, FL"
        placeholderTextColor="#94A3B8"
      />

      <Text style={styles.label}>Brokerage</Text>
      <TextInput
        style={styles.input}
        value={brokerage}
        onChangeText={setBrokerage}
        placeholder="Your brokerage name"
        placeholderTextColor="#94A3B8"
      />

      <TouchableOpacity
        style={[styles.saveBtn, isPending && styles.disabled]}
        onPress={() => mutate()}
        disabled={isPending}
      >
        <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Save Profile'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarRow: { alignItems: 'center', marginBottom: 20 },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
  },
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
