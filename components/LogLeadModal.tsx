import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { api } from '../services/api';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';
import { PLATFORMS, PLATFORM_LABELS } from '../constants/config';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  tiktok: '#010101',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogged: () => void;
}

export function LogLeadModal({ visible, onClose, onLogged }: Props) {
  const [platform, setPlatform] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setPlatform(null);
    setName('');
    setNote('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleLog() {
    if (!platform) return;
    setLoading(true);
    try {
      await api.leads.log({
        platform,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      onLogged();
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={[StyleSheet.absoluteFill, styles.backdrop]} onPress={handleClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Log a Lead</Text>
            <Text style={styles.label}>Where did they come from?</Text>

            <View style={styles.platformGrid}>
              {PLATFORMS.map((p) => {
                const selected = platform === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.platformPill,
                      selected && { backgroundColor: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPlatform(p);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.platformLabel, selected && styles.platformLabelSelected]}>
                      {PLATFORM_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Contact name (optional)"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Add a note (optional)"
              placeholderTextColor={Colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.button, (!platform || loading) && styles.buttonDisabled]}
              onPress={handleLog}
              disabled={!platform || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.buttonText}>Log Lead</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 4,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  platformPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  platformLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  platformLabelSelected: { color: Colors.surface },
  input: {
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
  },
  noteInput: { minHeight: 72, paddingTop: 12 },
  button: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: {
    color: Colors.surface,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
  },
});
