import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

export default function BillingSuccessScreen() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Wait 2s for Stripe webhook to commit the plan change, then refresh user
    const timer = setTimeout(async () => {
      try {
        if (useAuthStore.getState().accessToken) {
          const freshUser = await api.me.get();
          useAuthStore.getState().setUser(freshUser);
        }
      } catch {
        // navigate regardless — user can refresh manually
      } finally {
        router.replace('/(tabs)/generate');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.teal} />
      <Text style={styles.title}>Verifying your upgrade…</Text>
      <Text style={styles.sub}>This will just take a moment.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
  },
  sub: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
});
