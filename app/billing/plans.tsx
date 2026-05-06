import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { api } from '../../services/api';
import { posthog } from '../../services/analytics';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

const PLANS = [
  {
    id: 'solo',
    name: 'Agent',
    price: 29,
    features: [
      '20 AI analyses / month',
      '40 post generations / month',
      'Lead capture page + QR',
      'Basic analytics dashboard',
      'Email support',
    ],
  },
  {
    id: 'team',
    name: 'Pro',
    price: 99,
    features: [
      '60 AI analyses / month',
      'Unlimited post generations',
      'Everything in Agent',
      'Advanced analytics',
      'Priority support',
    ],
  },
  {
    id: 'brokerage',
    name: 'Broker',
    price: 149,
    features: [
      'Everything in Pro',
      'Unlimited analyses',
      'Multi-agent organization',
      'White-label capture page',
      'Dedicated account manager',
    ],
  },
] as const;

const PLAN_COLOR: Record<string, string> = {
  Agent: Colors.scoreAmber,
  Pro: Colors.teal,
  Broker: Colors.navy,
};

function PlanCard({
  plan,
  isCurrent,
  onSelect,
  isLoading,
}: {
  plan: (typeof PLANS)[number];
  isCurrent: boolean;
  onSelect: () => void;
  isLoading: boolean;
}) {
  const color = PLAN_COLOR[plan.name] ?? Colors.teal;
  return (
    <View style={[styles.card, isCurrent && { borderColor: Colors.teal, borderWidth: 2 }]}>
      {isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>Current Plan</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <Text style={[styles.planName, { color }]}>{plan.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${plan.price}</Text>
          <Text style={styles.perMonth}>/mo</Text>
        </View>
      </View>

      <View style={styles.features}>
        {plan.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Text style={[styles.checkmark, { color: Colors.scoreGreen }]}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {!isCurrent && (
        <TouchableOpacity
          style={[styles.selectBtn, { backgroundColor: color }, isLoading && styles.disabled]}
          onPress={onSelect}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <Text style={styles.selectBtnText}>{isLoading ? 'Loading…' : `Select ${plan.name}`}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PlansScreen() {
  const user = useAuthStore((s) => s.user);
  const currentPlan = (user?.plan ?? 'Agent').toLowerCase();

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (plan: string) => api.billing.checkout(plan),
    onSuccess: ({ url }) => Linking.openURL(url),
    onError: () => Alert.alert('Error', 'Could not start checkout. Please try again.'),
  });

  const handleSelect = (planId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture('billing_checkout_started', { plan: planId, current_plan: currentPlan });
    mutate(planId);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Choose a Plan', headerBackTitle: 'Settings', headerShown: true }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Choose a Plan</Text>
        <Text style={styles.subheading}>Upgrade anytime. Cancel anytime.</Text>

        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={currentPlan === plan.id}
            onSelect={() => handleSelect(plan.id)}
            isLoading={isPending && variables === plan.id}
          />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  content: { padding: 20, paddingBottom: 60 },
  heading: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 4,
  },
  subheading: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 16,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.teal + '18',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  currentBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  planName: { fontSize: FontSize.xl, fontFamily: FontFamily.sansSemibold },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  price: { fontSize: FontSize.xl, fontFamily: FontFamily.sansSemibold, color: Colors.textPrimary },
  perMonth: { fontSize: FontSize.sm, fontFamily: FontFamily.sans, color: Colors.textSecondary, marginBottom: 3 },
  features: { gap: 8, marginBottom: 20 },
  featureRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkmark: { fontSize: FontSize.sm, fontFamily: FontFamily.sansSemibold, width: 16 },
  featureText: { flex: 1, fontSize: FontSize.sm, fontFamily: FontFamily.sans, color: Colors.textPrimary, lineHeight: 20 },
  selectBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  selectBtnText: { color: '#FFF', fontSize: FontSize.base, fontFamily: FontFamily.sansSemibold },
});
