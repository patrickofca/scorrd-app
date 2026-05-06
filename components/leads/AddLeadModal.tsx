import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const C = {
  navy: '#1C2B3A',
  teal: '#0EA5A0',
  surface: '#FFFFFF',
  offWhite: '#F7F5F2',
  border: '#E2E8F0',
  textPrimary: '#1C2B3A',
  textSecondary: '#64748B',
  purple: '#7C3AED',
  amber: '#D97706',
  green: '#16A34A',
};

const INTERESTS = ['Buyer', 'Seller', 'Investor'] as const;
type Interest = (typeof INTERESTS)[number];

const INTEREST_COLOR: Record<Interest, string> = {
  Buyer: C.purple,
  Seller: C.amber,
  Investor: C.green,
};

interface AddLeadData {
  name: string;
  email?: string;
  phone?: string;
  interest?: string;
  message?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: AddLeadData) => void;
  isSaving?: boolean;
}

export default function AddLeadModal({ visible, onClose, onSave, isSaving }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState<Interest | null>(null);
  const [message, setMessage] = useState('');

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setInterest(null);
    setMessage('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter the lead\'s name.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      interest: interest ?? undefined,
      message: message.trim() || undefined,
    });
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.root}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centered}
        >
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Add Lead</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Interest</Text>
              <View style={styles.pillRow}>
                {INTERESTS.map((i) => {
                  const active = interest === i;
                  const color = INTEREST_COLOR[i];
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.pill,
                        active && { backgroundColor: color + '1A', borderColor: color },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setInterest(active ? null : i);
                      }}
                    >
                      <Text style={[styles.pillText, active && { color, fontWeight: '600' }]}>
                        {i}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                value={message}
                onChangeText={setMessage}
                placeholder="What brought them to you?"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Add Lead'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  centered: { width: '90%', maxWidth: 440 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: C.navy },
  closeBtn: { fontSize: 16, color: C.textSecondary },
  label: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: C.textPrimary,
    backgroundColor: C.offWhite,
  },
  messageInput: { minHeight: 72, textAlignVertical: 'top' },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontSize: 13, color: C.textSecondary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    backgroundColor: C.teal,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, color: '#FFF', fontWeight: '700' },
});
