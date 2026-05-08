import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, AuthExpiredError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import ProfileSection from '../../components/settings/ProfileSection';
import SubscriptionSection from '../../components/settings/SubscriptionSection';
import NotificationsSection from '../../components/settings/NotificationsSection';
import type { Lead } from '../../types';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function CapturePageSection({ user }: { user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']> }) {
  const [headline, setHeadline] = useState(user.capture_page_headline ?? '');

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.me.update({ capture_page_headline: headline.trim() || undefined }),
    onSuccess: (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useAuthStore.setState({ user: updated });
    },
    onError: (err) => {
      if (err instanceof AuthExpiredError) return;
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save. Please try again.');
    },
  });

  return (
    <>
      <Text style={styles.inputLabel}>Custom Headline</Text>
      <TextInput
        style={styles.input}
        value={headline}
        onChangeText={setHeadline}
        placeholder="e.g. Find your dream home today"
        placeholderTextColor="#94A3B8"
        maxLength={120}
      />
      <TouchableOpacity
        style={[styles.saveBtn, isPending && styles.disabled]}
        onPress={() => mutate()}
        disabled={isPending}
      >
        <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Save'}</Text>
      </TouchableOpacity>
    </>
  );
}

const STATUS_COLORS: Record<string, string> = {
  New: Colors.teal,
  Contacted: '#8B5CF6',
  Qualified: Colors.scoreAmber,
  Closed: Colors.scoreGreen,
};

function LeadRow({ lead }: { lead: Lead }) {
  const statusColor = STATUS_COLORS[lead.status] ?? Colors.textSecondary;
  return (
    <View style={styles.leadRow}>
      <View style={styles.leadRowLeft}>
        <Text style={styles.leadName} numberOfLines={1}>{lead.name ?? 'Unknown'}</Text>
        <Text style={styles.leadMeta} numberOfLines={1}>
          {lead.platform}{lead.interest ? ` · ${lead.interest}` : ''}
        </Text>
      </View>
      <View style={[styles.statusBadge, { borderColor: statusColor }]}>
        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{lead.status ?? 'New'}</Text>
      </View>
    </View>
  );
}

function LeadPipelineSection() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['leads-preview'],
    queryFn: () => api.leads.list(1),
  });

  const preview = data?.leads.slice(0, 3) ?? [];

  return (
    <>
      {isLoading ? (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.leadRowSkeleton} />
          ))}
        </>
      ) : preview.length === 0 ? (
        <View style={styles.leadsEmpty}>
          <Ionicons name="people-outline" size={24} color={Colors.border} />
          <Text style={styles.leadsEmptyText}>No leads yet</Text>
        </View>
      ) : (
        <>
          {preview.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
        </>
      )}
      <TouchableOpacity
        style={styles.viewAllBtn}
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/leads');
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.viewAllText}>View all leads</Text>
        <Ionicons name="arrow-forward-outline" size={14} color={Colors.teal} />
      </TouchableOpacity>
    </>
  );
}

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (!useAuthStore.getState().accessToken) return;
    api.me.get()
      .then((fresh) => useAuthStore.getState().setUser(fresh))
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try { await api.auth.logout(); } catch { /* continue regardless */ }
          await clearSession();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.me.delete();
              await clearSession();
            } catch {
              Alert.alert('Error', 'Could not delete account. Please contact support.');
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Settings</Text>

        <SectionCard title="Profile">
          <ProfileSection user={user} />
        </SectionCard>

        <SectionCard title="Capture Page">
          <CapturePageSection user={user} />
        </SectionCard>

        <SectionCard title="Subscription">
          <SubscriptionSection user={user} />
        </SectionCard>

        <SectionCard title="Notifications">
          <NotificationsSection user={user} />
        </SectionCard>

        <SectionCard title="Lead Pipeline">
          <LeadPipelineSection />
        </SectionCard>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.85}>
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  content: { padding: 20, paddingBottom: 60 },
  heading: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 24,
  },
  sectionWrap: { marginBottom: 24 },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
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
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: FontSize.base, fontFamily: FontFamily.sansSemibold },
  logoutBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  logoutText: { fontSize: FontSize.base, fontFamily: FontFamily.sansMedium, color: Colors.error },
  dangerZone: { marginBottom: 20 },
  dangerTitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.sansMedium, color: Colors.error },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  leadRowLeft: { flex: 1 },
  leadName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  leadMeta: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.sansMedium,
  },
  leadRowSkeleton: {
    height: 52,
    backgroundColor: Colors.border,
    borderRadius: 8,
    opacity: 0.5,
    marginBottom: 8,
  },
  leadsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  leadsEmptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 12,
  },
  viewAllText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
  },
});
