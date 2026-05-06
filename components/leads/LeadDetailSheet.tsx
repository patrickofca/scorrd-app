import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Lead } from '../../types';

const C = {
  navy: '#1C2B3A',
  teal: '#0EA5A0',
  tealDark: '#0D7A76',
  surface: '#FFFFFF',
  offWhite: '#F7F5F2',
  border: '#E2E8F0',
  textPrimary: '#1C2B3A',
  textSecondary: '#64748B',
  green: '#16A34A',
  amber: '#D97706',
};

const STATUSES = ['new', 'contacted', 'qualified', 'closed'] as const;
type LeadStatus = (typeof STATUSES)[number];

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  closed: 'Closed',
};

const STATUS_COLOR: Record<LeadStatus, string> = {
  new: C.teal,
  contacted: C.amber,
  qualified: C.green,
  closed: C.textSecondary,
};

interface Props {
  lead: Lead | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: { status: string; note: string }) => void;
  isSaving?: boolean;
}

export default function LeadDetailSheet({ lead, visible, onClose, onSave, isSaving }: Props) {
  const [status, setStatus] = useState<LeadStatus>('new');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (lead) {
      setStatus((lead.status as LeadStatus) ?? 'new');
      setNotes(lead.note ?? '');
    }
  }, [lead?.id]);

  if (!lead) return null;

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(lead.id, { status, note: notes });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={22} color={C.navy} />
              </TouchableOpacity>
              <Text style={styles.leadName} numberOfLines={1}>{lead.name ?? 'Unknown'}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {lead.email ? (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`mailto:${lead.email}`)}
                >
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactLink}>{lead.email}</Text>
                </TouchableOpacity>
              ) : null}

              {lead.phone ? (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => Linking.openURL(`tel:${lead.phone}`)}
                >
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactLink}>{lead.phone}</Text>
                </TouchableOpacity>
              ) : null}

              {lead.interest ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Interest</Text>
                  <Text style={styles.contactValue}>{lead.interest}</Text>
                </View>
              ) : null}

              {lead.message ? (
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Message</Text>
                  <Text style={styles.contactValue}>{lead.message}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>Status</Text>
              <View style={styles.statusRow}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusPill,
                      status === s && { backgroundColor: STATUS_COLOR[s] + '1A', borderColor: STATUS_COLOR[s] },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStatus(s);
                    }}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        status === s && { color: STATUS_COLOR[s], fontWeight: '600' },
                      ]}
                    >
                      {STATUS_LABEL[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  overlay: { flex: 1 },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '82%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: C.textSecondary },
  scrollBody: { flex: 1 },
  leadName: { fontSize: 20, fontWeight: '700', color: C.navy, flex: 1, paddingHorizontal: 8 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  contactLabel: { fontSize: 13, color: C.textSecondary, width: 60, paddingTop: 1 },
  contactLink: { fontSize: 14, color: C.teal, flex: 1, fontWeight: '500' },
  contactValue: { fontSize: 14, color: C.textPrimary, flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusPill: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statusPillText: { fontSize: 13, color: C.textSecondary },
  notesInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: C.textPrimary,
    minHeight: 90,
    backgroundColor: C.offWhite,
  },
  saveBtn: {
    backgroundColor: C.teal,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
