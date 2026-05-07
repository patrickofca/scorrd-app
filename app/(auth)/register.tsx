import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '../../services/api';
import { posthog } from '../../services/analytics';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useAuthStore();

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api.auth.register(email.trim().toLowerCase(), password, name.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (data.session) {
        posthog.identify(data.user.id, { plan_tier: data.user.plan ?? null });
        posthog.capture('user_registered', { name: name.trim() });
        await setSession(data.session, data.user);
      } else {
        setError('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.wordmark}>Scorrd</Text>
          <Text style={styles.tagline}>Start your free 14-day trial</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Sarah Chen"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 8 characters"
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor={Colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.link}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.offWhite },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 48, alignItems: 'center' },
  wordmark: {
    fontSize: 40,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  form: { gap: 12 },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
    marginBottom: -4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
  },
  error: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.error,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.surface,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
  },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  linkBold: { fontFamily: FontFamily.sansSemibold, color: Colors.teal },
});
