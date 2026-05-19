import React, { useState, useEffect } from 'react';
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

const YEARS_OPTIONS = ['1-3 yrs', '4-7 yrs', '8-15 yrs', '16-25 yrs', '25+ yrs'];
const YEARS_MAP: Record<string, number> = {
  '1-3 yrs': 2, '4-7 yrs': 5, '8-15 yrs': 11, '16-25 yrs': 20, '25+ yrs': 30,
};

const TRANSACTION_OPTIONS = ['1-50', '51-150', '151-300', '301-500', '500+'];
const TRANSACTION_MAP: Record<string, number> = {
  '1-50': 25, '51-150': 100, '151-300': 225, '301-500': 400, '500+': 600,
};

function yearsToOption(n?: number): string {
  if (!n) return '';
  if (n <= 3) return '1-3 yrs';
  if (n <= 7) return '4-7 yrs';
  if (n <= 15) return '8-15 yrs';
  if (n <= 25) return '16-25 yrs';
  return '25+ yrs';
}

function transactionToOption(n?: number): string {
  if (!n) return '';
  if (n <= 50) return '1-50';
  if (n <= 150) return '51-150';
  if (n <= 300) return '151-300';
  if (n <= 500) return '301-500';
  return '500+';
}

interface Props {
  user: User;
}

export default function ProfileSection({ user }: Props) {
  const [name, setName] = useState(user.name ?? '');
  const [nameInput, setNameInput] = useState('');
  const [market, setMarket] = useState(user.marketLocation ?? '');
  const [marketInput, setMarketInput] = useState('');
  const [brokerage, setBrokerage] = useState(user.brokerageName ?? '');
  const [brokerageInput, setBrokerageInput] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(user.avatarUrl ?? null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [selectedYears, setSelectedYears] = useState(yearsToOption(user.yearsInBusiness));
  const [selectedTransactions, setSelectedTransactions] = useState(transactionToOption(user.transactionCount));
  const [focusNeighborhoods, setFocusNeighborhoods] = useState<string[]>(
    user.focusNeighborhoods ?? []
  );
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [specializations, setSpecializations] = useState<string[]>(
    user.specializations ?? []
  );

  useEffect(() => {
    setName(user.name ?? '');
    setMarket(user.marketLocation ?? '');
    setBrokerage(user.brokerageName ?? '');
    setAvatarUri(user.avatarUrl ?? null);
    setSelectedYears(yearsToOption(user.yearsInBusiness));
    setSelectedTransactions(transactionToOption(user.transactionCount));
    setFocusNeighborhoods(user.focusNeighborhoods ?? []);
    setSpecializations(user.specializations ?? []);
  }, [user]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const effectiveName = name.trim() || nameInput.trim();
      const effectiveMarket = market.trim() || marketInput.trim();
      const effectiveBrokerage = brokerage.trim() || brokerageInput.trim();
      return api.me.update({
        name: effectiveName || null,
        market_location: effectiveMarket || null,
        brokerage_name: effectiveBrokerage || null,
        ...(avatarBase64 ? { avatar_url: avatarBase64 } : {}),
        ...(selectedYears ? { years_in_business: YEARS_MAP[selectedYears] } : {}),
        ...(selectedTransactions ? { transaction_count: TRANSACTION_MAP[selectedTransactions] } : {}),
        ...(specializations.length > 0 ? { specializations } : {}),
        ...(focusNeighborhoods.length > 0 ? { focus_neighborhoods: focusNeighborhoods } : {}),
      });
    },
    onSuccess: async (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const current = useAuthStore.getState().user;
      await useAuthStore.getState().setUser({
        ...current!,
        ...updated,
        marketLocation: updated.marketLocation ?? (market.trim() || marketInput.trim() || null),
        brokerageName: updated.brokerageName ?? (brokerage.trim() || brokerageInput.trim() || null),
        yearsInBusiness: updated.yearsInBusiness || (selectedYears ? YEARS_MAP[selectedYears] : undefined),
        transactionCount: updated.transactionCount || (selectedTransactions ? TRANSACTION_MAP[selectedTransactions] : undefined),
        specializations: updated.specializations ?? specializations,
        focusNeighborhoods: updated.focusNeighborhoods ?? focusNeighborhoods,
      });
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

  function toggleYears(option: string) {
    Haptics.selectionAsync();
    setSelectedYears((prev) => (prev === option ? '' : option));
  }

  function toggleTransactions(option: string) {
    Haptics.selectionAsync();
    setSelectedTransactions((prev) => (prev === option ? '' : option));
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
        value={nameInput}
        onChangeText={setNameInput}
        onSubmitEditing={() => { if (nameInput.trim()) { setName(nameInput.trim()); setNameInput(''); } }}
        placeholder="Your full name"
        placeholderTextColor="#94A3B8"
        autoCapitalize="words"
        returnKeyType="done"
        blurOnSubmit={false}
      />
      {name.trim() ? (
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{name}</Text>
            <TouchableOpacity onPress={() => setName('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close" size={13} color={Colors.teal} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Market</Text>
      <TextInput
        style={styles.input}
        value={marketInput}
        onChangeText={setMarketInput}
        onSubmitEditing={() => { if (marketInput.trim()) { setMarket(marketInput.trim()); setMarketInput(''); } }}
        placeholder="e.g. Miami, FL"
        placeholderTextColor="#94A3B8"
        returnKeyType="done"
        blurOnSubmit={false}
      />
      {market.trim() ? (
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{market}</Text>
            <TouchableOpacity onPress={() => setMarket('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close" size={13} color={Colors.teal} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Brokerage</Text>
      <TextInput
        style={styles.input}
        value={brokerageInput}
        onChangeText={setBrokerageInput}
        onSubmitEditing={() => { if (brokerageInput.trim()) { setBrokerage(brokerageInput.trim()); setBrokerageInput(''); } }}
        placeholder="Your brokerage name"
        placeholderTextColor="#94A3B8"
        returnKeyType="done"
        blurOnSubmit={false}
      />
      {brokerage.trim() ? (
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{brokerage}</Text>
            <TouchableOpacity onPress={() => setBrokerage('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close" size={13} color={Colors.teal} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Years in real estate</Text>
      <View style={styles.pillGrid}>
        {YEARS_OPTIONS.map((option) => {
          const selected = selectedYears === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => toggleYears(option)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Total transactions closed (career)</Text>
      <View style={styles.pillGrid}>
        {TRANSACTION_OPTIONS.map((option) => {
          const selected = selectedTransactions === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => toggleTransactions(option)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillLabel, selected && styles.pillLabelSelected]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
