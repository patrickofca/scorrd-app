import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { Lead } from '../../types';
import LeadCard from './LeadCard';

const C = {
  navy: '#1C2B3A',
  teal: '#0EA5A0',
  surface: '#FFFFFF',
  offWhite: '#F7F5F2',
  border: '#E2E8F0',
  textPrimary: '#1C2B3A',
  textSecondary: '#64748B',
  green: '#16A34A',
  amber: '#D97706',
};

const STATUS_COLOR: Record<string, string> = {
  New: C.teal,
  Contacted: C.amber,
  Qualified: C.green,
  Closed: C.textSecondary,
};

interface Props {
  status: string;
  leads: Lead[];
  onCardPress: (lead: Lead) => void;
}

export default function PipelineColumn({ status, leads, onCardPress }: Props) {
  const color = STATUS_COLOR[status] ?? C.textSecondary;

  return (
    <View style={styles.column}>
      <View style={[styles.columnHeader, { borderTopColor: color }]}>
        <Text style={[styles.columnTitle, { color }]}>{status}</Text>
        <View style={[styles.countBadge, { backgroundColor: color + '1A' }]}>
          <Text style={[styles.countText, { color }]}>{leads.length}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.columnContent}
        nestedScrollEnabled
      >
        {leads.length === 0 ? (
          <View style={styles.emptyCol}>
            <Text style={styles.emptyColText}>No leads</Text>
          </View>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onPress={() => onCardPress(lead)}
              showSwipe={false}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: 220,
    marginRight: 12,
    backgroundColor: C.offWhite,
    borderRadius: 12,
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.surface,
  },
  columnTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  countBadge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontSize: 12, fontWeight: '700' },
  columnContent: { paddingTop: 10, paddingBottom: 20 },
  emptyCol: { alignItems: 'center', paddingTop: 24 },
  emptyColText: { fontSize: 13, color: C.textSecondary },
});
