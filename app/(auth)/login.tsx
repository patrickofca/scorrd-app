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
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession, sessionExpired } = useAuthStore();

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.auth.login(email.trim().toLowerCase(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setSession(data.session, data.user);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : 'Login failed');
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
          <Image
            source={require('../../assets/scorrd_app_badge.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Know your score. Own your market.</Text>
          {sessionExpired && (
            <View style={styles.expiredBanner}>
              <Text style={styles.expiredText}>Your session expired — sign in to continue where you left off.</Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
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
            placeholder="••••••••"
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.link}>
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkBold}>Create one</Text>
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
  logo: {
    width: 110,
    height: 110,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 4,
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
  expiredBanner: {
    marginTop: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
  },
  expiredText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  link: { alignItems: 'center', paddingVertical: 8 },
  linkText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  linkBold: { fontFamily: FontFamily.sansSemibold, color: Colors.teal },
});
