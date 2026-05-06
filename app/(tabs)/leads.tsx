import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '../../services/api';
import { posthog } from '../../services/analytics';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { useAuthStore } from '../../store/authStore';
import type { Lead } from '../../types';
import LeadCard from '../../components/leads/LeadCard';
import LeadDetailSheet from '../../components/leads/LeadDetailSheet';
import AddLeadModal from '../../components/leads/AddLeadModal';
import PipelineColumn from '../../components/leads/PipelineColumn';
import CapturePageCard from '../../components/leads/CapturePageCard';

const PIPELINE_STATUSES = ['new', 'contacted', 'qualified', 'closed'];

type ViewMode = 'list' | 'pipeline';

function LeadSkeleton() {
  return <View style={styles.skeleton} />;
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="people-outline" size={52} color={Colors.border} />
      <Text style={styles.emptyTitle}>No leads yet</Text>
      <Text style={styles.emptyBody}>
        Share your capture page to start collecting leads.
      </Text>
    </View>
  );
}

export default function LeadsScreen() {
  const { height } = useWindowDimensions();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const captureUrl = `https://scorrd.app/agent/${user?.slug ?? user?.id ?? ''}`;
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [addVisible, setAddVisible] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ['leads'],
      queryFn: ({ pageParam = 1 }) => api.leads.list(pageParam as number),
      getNextPageParam: (last) => {
        const { page, totalPages } = last.pagination;
        return page < totalPages ? page + 1 : undefined;
      },
      initialPageParam: 1,
    });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const allLeads = data?.pages.flatMap((p) => p.leads) ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: { status: string; note: string } }) =>
      api.leads.update(id, d),
    onSuccess: (updated) => {
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            leads: page.leads.map((l: any) => (l.id === updated.id ? updated : l)),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(null);
    },
    onError: (err) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not update lead. Please try again.');
    },
  });

  const createMutation = useMutation({
    mutationFn: api.leads.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setAddVisible(false);
      posthog.capture('lead_captured', { source: 'manual' });
    },
    onError: (err) => {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save lead. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.leads.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const handleDelete = (lead: Lead) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Lead', `Remove ${lead.name ?? 'this lead'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(lead.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        {router.canGoBack() && (
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.navy} />
          </TouchableOpacity>
        )}
        <Text style={styles.heading}>Leads</Text>
        {allLeads.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{allLeads.length}</Text>
          </View>
        )}
      </View>

      <CapturePageCard url={captureUrl} />

      <View style={styles.toggleWrap}>
        {(['list', 'pipeline'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.togglePill, viewMode === mode && styles.togglePillActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setViewMode(mode);
            }}
          >
            <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
              {mode === 'list' ? 'List' : 'Pipeline'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => <LeadSkeleton key={i} />)}
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={allLeads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              onPress={() => setSelectedLead(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          contentContainerStyle={
            allLeads.length === 0 ? styles.emptyContainer : styles.listContent
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pipelineContent}
          style={{ maxHeight: height - 200 }}
        >
          {allLeads.length === 0 ? (
            <View style={[styles.emptyContainer, { width: 320 }]}>
              <EmptyState />
            </View>
          ) : (
            PIPELINE_STATUSES.map((status) => (
              <PipelineColumn
                key={status}
                status={status}
                leads={allLeads.filter((l) => (l.status ?? 'New') === status)}
                onCardPress={setSelectedLead}
              />
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setAddVisible(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      <LeadDetailSheet
        lead={selectedLead}
        visible={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onSave={(id, d) => updateMutation.mutate({ id, d })}
        isSaving={updateMutation.isPending}
      />

      <AddLeadModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={(d) => createMutation.mutate(d)}
        isSaving={createMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  heading: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.serif,
    color: Colors.navy,
  },
  countBadge: {
    backgroundColor: Colors.teal + '1A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    overflow: 'hidden',
  },
  toggleWrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
  },
  togglePill: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 8 },
  togglePillActive: { backgroundColor: Colors.navy },
  toggleText: { fontSize: FontSize.sm, fontFamily: FontFamily.sansMedium, color: Colors.textSecondary },
  toggleTextActive: { color: '#FFF', fontFamily: FontFamily.sansSemibold },
  skeletonList: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  skeleton: {
    height: 80,
    backgroundColor: Colors.border,
    borderRadius: 12,
    opacity: 0.6,
  },
  listContent: { paddingTop: 4, paddingBottom: 100 },
  pipelineContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
