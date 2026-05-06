import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api, AuthExpiredError } from '../../services/api';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import type { User } from '../../types';

const PLAN_LABELS: Record<string, string> = {
  solo: 'Agent',
  team: 'Pro',
  brokerage: 'Broker',
};

const PLAN_COLOR: Record<string, string> = {
  solo: Colors.scoreAmber,
  team: Colors.teal,
  brokerage: Colors.navy,
};

const UPGRADE_ELIGIBLE = ['solo', 'team'];

interface UsageBarProps {
  label: string;
  used: number;
  limit: number | null;
}

function UsageBar({ label, used, limit }: UsageBarProps) {
  if (limit === null) {
    return (
      <View style={styles.usageItem}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageLabel}>{label}</Text>
          <Text style={[styles.usageCount, { color: Colors.scoreGreen }]}>Unlimited</Text>
        </View>
      </View>
    );
  }
  const pct = Math.min(used / Math.max(limit, 1), 1);
  const over = pct > 0.8;
  const barColor = over ? Colors.scoreAmber : Colors.teal;
  return (
    <View style={styles.usageItem}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageCount, over && { color: Colors.scoreAmber }]}>
          {used} of {limit} used
        </Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

interface Props {
  user: User;
}

export default function SubscriptionSection({ user }: Props) {
  const router = useRouter();
  const plan = user.plan ?? 'solo';
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const status = user.subscription_status ?? 'Active';
  const planColor = PLAN_COLOR[plan] ?? Colors.teal;
  const usage = user.usage;
  const isTrialing = status === 'Trialing';

  const portalMutation = useMutation({
    mutationFn: api.billing.portal,
    onSuccess: ({ url }) => Linking.openURL(url),
    onError: (err) => {
      if (err instanceof AuthExpiredError) return;
      Alert.alert('Error', 'Could not open billing portal. Please try again.');
    },
  });

  const handleManageBilling = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    portalMutation.mutate();
  };

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/billing/plans');
  };

  return (
    <View>
      <View style={styles.planRow}>
        <View style={[styles.planBadge, { backgroundColor: planColor + '18', borderColor: planColor + '40' }]}>
          <Text style={[styles.planBadgeText, { color: planColor }]}>{planLabel}</Text>
        </View>
        <Text style={[styles.statusText, status === 'Past Due' && { color: Colors.scoreRed }]}>
          {status}
        </Text>
      </View>

      {isTrialing && user.trial_ends_at ? (
        <Text style={styles.trialNote}>
          Trial ends {new Date(user.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      ) : null}

      {usage ? (
        <View style={styles.usageSection}>
          <Text style={styles.usageSectionLabel}>Usage this period</Text>
          <UsageBar label="Analyses" used={usage.analyses_used} limit={usage.analyses_limit} />
          <UsageBar label="Generations" used={usage.generations_used} limit={usage.generations_limit} />
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.manageBtn, portalMutation.isPending && styles.disabled]}
        onPress={handleManageBilling}
        disabled={portalMutation.isPending}
      >
        <Text style={styles.manageBtnText}>
          {portalMutation.isPending ? 'Opening…' : 'Manage Billing'}
        </Text>
      </TouchableOpacity>

      {UPGRADE_ELIGIBLE.includes(plan) ? (
        <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade}>
          <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  planBadgeText: { fontSize: FontSize.sm, fontFamily: FontFamily.sansSemibold },
  statusText: { fontSize: FontSize.sm, fontFamily: FontFamily.sansMedium, color: Colors.textSecondary },
  trialNote: { fontSize: FontSize.xs, fontFamily: FontFamily.sans, color: Colors.scoreAmber, marginBottom: 12 },
  usageSection: { marginTop: 16, gap: 14 },
  usageSectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  usageItem: { gap: 6 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { fontSize: FontSize.sm, fontFamily: FontFamily.sansMedium, color: Colors.textPrimary },
  usageCount: { fontSize: FontSize.sm, fontFamily: FontFamily.sans, color: Colors.textSecondary },
  barBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  manageBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: Colors.surface,
  },
  manageBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.sansMedium, color: Colors.textPrimary },
  upgradeBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  upgradeBtnText: { fontSize: FontSize.base, fontFamily: FontFamily.sansSemibold, color: '#FFF' },
  disabled: { opacity: 0.6 },
});
