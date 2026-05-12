import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, AuthExpiredError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import ImageUpload from '../ImageUpload';
import { InfoCallout } from '../InfoCallout';
import type { User } from '../../types';

const SPECIALIZATION_OPTIONS = [
  'First-Time Buyers',
  'Move-Up Buyers',
  'Luxury',
  'Investment',
  'Relocation',
  'Downsizing',
  'New Construction',
  'Distressed Sales',
];

interface Props {
  user: User;
}

export default function ProfileSection({ user }: Props) {
  const [name, setName] = useState(user.name ?? '');
  const [market, setMarket] = useState(user.marketLocation ?? '');
  const [brokerage, setBrokerage] = useState(user.brokerageName ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [yearsInBusiness, setYearsInBusiness] = useState(
    user.yearsInBusiness != null ? String(user.yearsInBusiness) : ''
  );
  const [transactionCount, setTransactionCount] = useState(
    user.transactionCount != null ? String(user.transactionCount) : ''
  );
  const [focusNeighborhoods, setFocusNeighborhoods] = useState<string[]>(
    user.focusNeighborhoods ?? []
  );
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [specializations, setSpecializations] = useState<string[]>(
    user.specializations ?? []
  );

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.me.update({
        name: name.trim() || null,
        market_location: market.trim() || null,
        brokerage_name: brokerage.trim() || null,
        ...(avatarBase64 ? { avatar_url: avatarBase64 } : {}),
        years_in_business: yearsInBusiness ? parseInt(yearsInBusiness, 10) : null,
        transaction_count: transactionCount ? parseInt(transactionCount, 10) : null,
        specializations,
        focus_neighborhoods: focusNeighborhoods,
      }),
    onSuccess: (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useAuthStore.setState({ user: updated });
      setAvatarBase64(null);
    },
    onError: (err) => {
      if (err instanceof AuthExpiredError) return;
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile. Please try again.');
    },
  });

  function addNeighborhood(raw: string) {
    const tag = raw.replace(/,/g, '').trim();
    if (!tag || focusNeighborhoods.length >= 5 || focusNeighborhoods.includes(tag)) return;
    setFocusNeighborhoods((prev) => [...prev, tag]);
    setNeighborhoodInput('');
  }

  function handleNeighborhoodChange(text: string) {
    if (text.endsWith(',')) {
      addNeighborhood(text);
    } else {
      setNeighborhoodInput(text);
    }
  }

  function toggleSpecialization(option: string) {
    Haptics.selectionAsync();
    setSpecializations((prev) =>
      prev.includes(option) ? prev.filter((s) => s !== option) : [...prev, option]
    );
  }

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

      <InfoCallout
        label="TRUST & AUTHORITY"
        body="The more we know about your experience, the higher your generated posts will score on Trust & Authority. These fields are optional but recommended."
      />

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

      <Text style={styles.label}>Years in real estate</Text>
      <TextInput
        style={styles.input}
        value={yearsInBusiness}
        onChangeText={setYearsInBusiness}
        placeholder="e.g. 7"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        maxLength={3}
      />

      <Text style={styles.label}>Total transactions closed (career)</Text>
      <TextInput
        style={styles.input}
        value={transactionCount}
        onChangeText={setTransactionCount}
        placeholder="e.g. 200"
        placeholderTextColor="#94A3B8"
        keyboardType="numeric"
        maxLength={6}
      />
      <Text style={styles.helperText}>Builds credibility in generated posts</Text>

      <Text style={styles.label}>Neighborhoods you specialize in</Text>
      <View style={styles.tagInputWrap}>
        <TextInput
          style={styles.tagInput}
          value={neighborhoodInput}
          onChangeText={handleNeighborhoodChange}
          onSubmitEditing={() => addNeighborhood(neighborhoodInput)}
          placeholder={focusNeighborhoods.length >= 5 ? 'Max 5 reached' : 'Type then press enter or comma'}
          placeholderTextColor="#94A3B8"
          returnKeyType="done"
          editable={focusNeighborhoods.length < 5}
          blurOnSubmit={false}
        />
      </View>
      {focusNeighborhoods.length > 0 && (
        <View style={styles.tagRow}>
          {focusNeighborhoods.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity
                onPress={() => setFocusNeighborhoods((prev) => prev.filter((t) => t !== tag))}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={13} color={Colors.teal} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.label}>Specializations</Text>
      <View style={styles.pillGrid}>
        {SPECIALIZATION_OPTIONS.map((option) => {
          const selected = specializations.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => toggleSpecialization(option)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
  helperText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  tagInputWrap: {
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  tagInput: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.offWhite,
    borderWidth: 1,
    borderColor: Colors.teal,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.offWhite,
  },
  pillSelected: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  pillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  pillLabelSelected: {
    color: Colors.surface,
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
