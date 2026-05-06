import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import type { Lead } from '../../types';

const C = {
  navy: '#1C2B3A',
  teal: '#0EA5A0',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  textPrimary: '#1C2B3A',
  textSecondary: '#64748B',
  green: '#16A34A',
  amber: '#D97706',
  red: '#DC2626',
  purple: '#7C3AED',
};

const STATUS_COLOR: Record<string, string> = {
  new: C.teal,
  contacted: C.amber,
  qualified: C.green,
  closed: C.textSecondary,
};

function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const INTEREST_COLOR: Record<string, string> = {
  Buyer: C.purple,
  Seller: C.amber,
  Investor: C.green,
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '1A', borderColor: color + '40' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

interface Props {
  lead: Lead;
  onPress: () => void;
  onDelete?: () => void;
  showSwipe?: boolean;
}

export default function LeadCard({ lead, onPress, onDelete, showSwipe = true }: Props) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRight = () => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => {
        swipeRef.current?.close();
        onDelete?.();
      }}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const status = lead.status ?? 'new';

  const cardContent = (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>
          {lead.name ?? 'Unknown'}
        </Text>
        <Text style={styles.time}>{timeAgo(lead.createdAt)}</Text>
      </View>
      <View style={styles.badges}>
        <Badge label={lead.platform ?? 'Manual'} color={C.textSecondary} />
        {lead.interest ? (
          <Badge label={lead.interest} color={INTEREST_COLOR[lead.interest] ?? C.navy} />
        ) : null}
        <Badge label={capitalizeFirst(status)} color={STATUS_COLOR[status] ?? C.teal} />
      </View>
    </TouchableOpacity>
  );

  if (!showSwipe || !onDelete) return cardContent;

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRight} rightThreshold={40}>
      {cardContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: { fontSize: 15, fontWeight: '600', color: C.textPrimary, flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: C.textSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  deleteAction: {
    backgroundColor: C.red,
    justifyContent: 'center',
    alignItems: 'center',
    width: 78,
    marginBottom: 10,
    marginRight: 16,
    borderRadius: 12,
  },
  deleteText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
});
