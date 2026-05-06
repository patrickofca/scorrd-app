import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api, AuthExpiredError } from '../../services/api';
import { useFormDraftStore } from '../../store/formDraftStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import {
  PLATFORMS,
  Platform,
  PLATFORM_LABELS,
  CONTENT_TYPES,
  ContentType,
  CONTENT_TYPE_LABELS,
  TONES,
  Tone,
  TONE_LABELS,
  PriceRange,
  BuyerType,
} from '../../constants/config';
import { ListingPriceSelector } from '../../components/ListingPriceSelector';
import { BuyerTypeSelector } from '../../components/BuyerTypeSelector';
import { usePreFillStore } from '../../store/preFillStore';
import type { GeneratedPost } from '../../types';

const MAX_DETAILS = 2000;

export default function GenerateScreen() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [contentType, setContentType] = useState<ContentType>('new_listing');
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(['instagram']));
  const [tone, setTone] = useState<Tone>('professional');
  const [details, setDetails] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [buyerTypes, setBuyerTypes] = useState<Set<BuyerType>>(new Set());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedPost[] | null>(null);
  const [activeTab, setActiveTab] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [history, setHistory] = useState<GeneratedPost[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const draft = useFormDraftStore.getState().generateDraft;
      if (draft && useFormDraftStore.getState().returnPath === '/(tabs)/generate') {
        setContentType(draft.contentType as any);
        setPlatforms(new Set(draft.platforms as any[]));
        setTone(draft.tone as any);
        setDetails(draft.details);
        setPriceRange(draft.priceRange);
        setBuyerTypes(new Set(draft.buyerTypes as any[]));
        useFormDraftStore.getState().clear();
      }

      api.generate.history(1)
        .then(r => setHistory(r.posts.slice(0, 5)))
        .catch(() => {});
    }, [])
  );

  function togglePlatform(p: Platform) {
    setPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(p) && next.size > 1) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function handleGenerate() {
    if (!details.trim()) {
      Alert.alert('Add listing details', 'Describe the property, price, features, and any key selling points.');
      return;
    }
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.generate.create({
        content_type: contentType,
        agent_name: user?.name ?? 'Agent',
        listing_details: details.trim(),
        tone,
        platforms: Array.from(platforms),
        include_hashtags: true,
        ...(priceRange ? { listing_price_range: priceRange } : {}),
        ...(buyerTypes.size > 0 ? { target_buyer_type: Array.from(buyerTypes) } : {}),
      });
      setResults(res.generated_posts);
      setActiveTab(res.generated_posts[0]?.platform ?? '');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        useFormDraftStore.getState().saveGenerate(
          { contentType, platforms: Array.from(platforms), tone, details, priceRange, buyerTypes: Array.from(buyerTypes) },
          '/(tabs)/generate'
        );
        await useAuthStore.getState().expireSession();
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Generation failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(post: GeneratedPost) {
    if (post.saved) return;
    setSavingId(post.id);
    try {
      await api.generate.save(post.id);
      setResults(prev => prev?.map(p => p.id === post.id ? { ...p, saved: true } : p) ?? null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleGetScore(post: GeneratedPost) {
    setScoringId(post.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await api.analyses.submit({
        platform: post.platform,
        content_type: post.contentType,
        draft_text: post.generatedCopy,
        ...(post.listingPriceRange ? { listing_price_range: post.listingPriceRange } : {}),
        ...(post.targetBuyerType?.length > 0 ? { target_buyer_type: post.targetBuyerType } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/analysis/${result.analysis.id}`);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Analysis failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setScoringId(null);
    }
  }

  const activePost = results?.find(p => p.platform === activeTab);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Generate Post</Text>
        <Text style={styles.subheading}>Describe your listing and get ready-to-post copy</Text>

        {/* Content Type */}
        <Text style={styles.sectionLabel}>Content Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillContent}>
          {CONTENT_TYPES.map(ct => (
            <TouchableOpacity
              key={ct}
              style={[styles.pill, contentType === ct && styles.pillSelected]}
              onPress={() => { Haptics.selectionAsync(); setContentType(ct); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillLabel, contentType === ct && styles.pillLabelSelected]}>
                {CONTENT_TYPE_LABELS[ct]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Platforms (multi-select) */}
        <Text style={styles.sectionLabel}>
          Platforms <Text style={styles.hint}>(select all that apply)</Text>
        </Text>
        <View style={styles.platformGrid}>
          {PLATFORMS.map(p => {
            const selected = platforms.has(p);
            return (
              <TouchableOpacity
                key={p}
                style={[styles.platformPill, selected && styles.platformPillSelected]}
                onPress={() => { Haptics.selectionAsync(); togglePlatform(p); }}
                activeOpacity={0.7}
              >
                {selected && (
                  <Ionicons name="checkmark" size={13} color={Colors.surface} style={styles.checkmark} />
                )}
                <Text style={[styles.platformPillLabel, selected && styles.platformPillLabelSelected]}>
                  {PLATFORM_LABELS[p]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tone */}
        <Text style={styles.sectionLabel}>Tone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillContent}>
          {TONES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, tone === t && styles.tonePillSelected]}
              onPress={() => { Haptics.selectionAsync(); setTone(t); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillLabel, tone === t && styles.tonePillLabelSelected]}>
                {TONE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Listing Details */}
        <Text style={styles.sectionLabel}>Listing Details</Text>
        <TextInput
          style={styles.textArea}
          placeholder={
            'e.g. 3BR/2BA in Westwood, $1.2M, newly renovated kitchen, mountain views, ' +
            'open house Saturday 1–4pm. Target: move-up buyers.'
          }
          placeholderTextColor={Colors.textSecondary}
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={MAX_DETAILS}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{details.length} / {MAX_DETAILS}</Text>

        {/* Audience Targeting */}
        <View style={styles.targetingTitleRow}>
          <Text style={styles.sectionLabel}>Who are you writing for?</Text>
          <Text style={styles.targetingOptional}>(optional — improves targeting)</Text>
        </View>
        <View style={styles.targetingBody}>
          <Text style={styles.subLabel}>Listing Price Range</Text>
          <ListingPriceSelector value={priceRange} onChange={setPriceRange} />
          <Text style={styles.subLabel}>Target Buyer</Text>
          <BuyerTypeSelector value={buyerTypes} onChange={setBuyerTypes} />
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator color={Colors.surface} size="small" />
              <Text style={styles.generateButtonText}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>Generate Copy</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {results && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Generated Copy</Text>
            <Text style={styles.sectionSub}>Ready to copy and post for each platform</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
              {results.map(post => (
                <TouchableOpacity
                  key={post.platform}
                  style={[styles.tab, activeTab === post.platform && styles.tabActive]}
                  onPress={() => { Haptics.selectionAsync(); setActiveTab(post.platform); }}
                >
                  <Text style={[styles.tabLabel, activeTab === post.platform && styles.tabLabelActive]}>
                    {PLATFORM_LABELS[post.platform as Platform] ?? post.platform}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {activePost && (
              <View style={styles.copyBox}>
                <Text style={styles.copyText}>{activePost.generatedCopy}</Text>

                {activePost.hashtags.length > 0 && (
                  <View style={styles.hashtagRow}>
                    {activePost.hashtags.map((tag, i) => (
                      <View key={i} style={styles.hashtagPill}>
                        <Text style={styles.hashtagText}>{tag.startsWith('#') ? tag : `#${tag}`}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.copyActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert('Copied!', 'Post copied to clipboard.');
                    }}
                  >
                    <Ionicons name="copy-outline" size={15} color={Colors.teal} />
                    <Text style={styles.actionButtonText}>Copy</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, activePost.saved && styles.actionButtonSaved]}
                    onPress={() => handleSave(activePost)}
                    disabled={activePost.saved || savingId === activePost.id}
                  >
                    {savingId === activePost.id ? (
                      <ActivityIndicator size="small" color={Colors.teal} />
                    ) : (
                      <>
                        <Ionicons
                          name={activePost.saved ? 'bookmark' : 'bookmark-outline'}
                          size={15}
                          color={activePost.saved ? Colors.navy : Colors.teal}
                        />
                        <Text style={[styles.actionButtonText, activePost.saved && styles.savedText]}>
                          {activePost.saved ? 'Saved' : 'Save'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.scoreButton, scoringId === activePost.id && styles.scoreButtonDisabled]}
                  onPress={() => handleGetScore(activePost)}
                  disabled={scoringId === activePost.id}
                  activeOpacity={0.85}
                >
                  {scoringId === activePost.id ? (
                    <View style={styles.scoreButtonInner}>
                      <ActivityIndicator size="small" color={Colors.surface} />
                      <Text style={styles.scoreButtonText}>Scoring...</Text>
                    </View>
                  ) : (
                    <View style={styles.scoreButtonInner}>
                      <Ionicons name="analytics-outline" size={16} color={Colors.surface} />
                      <Text style={styles.scoreButtonText}>Get Score</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.scoreInfo}
                  onPress={() => { Haptics.selectionAsync(); setScoreInfoOpen(o => !o); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.scoreInfoLabel}>What does Get Score do?</Text>
                  <Ionicons
                    name={scoreInfoOpen ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
                {scoreInfoOpen && (
                  <Text style={styles.scoreInfoBody}>
                    Scores this post across virality, lead capture, follower attraction, and trust — then returns a composite score, platform rewrites, hashtag strategy, and your top fixes.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}


        {/* History */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>Recent Generations</Text>
            {history.map(post => {
              const expanded = expandedId === post.id;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.historyCard}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExpandedId(expanded ? null : post.id);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyPlatform}>
                      {PLATFORM_LABELS[post.platform as Platform] ?? post.platform}
                    </Text>
                    <View style={styles.historyMetaRight}>
                      <Text style={styles.historyDate}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </Text>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={Colors.textSecondary}
                      />
                    </View>
                  </View>
                  <Text style={styles.historyPreview} numberOfLines={expanded ? undefined : 2}>
                    {post.generatedCopy}
                  </Text>
                  {expanded && post.hashtags.length > 0 && (
                    <View style={styles.hashtagRow}>
                      {post.hashtags.map((tag, i) => (
                        <View key={i} style={styles.hashtagPill}>
                          <Text style={styles.hashtagText}>{tag.startsWith('#') ? tag : `#${tag}`}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {expanded && (
                    <TouchableOpacity
                      style={styles.historyClipboard}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert('Copied!', 'Post copied to clipboard.');
                      }}
                    >
                      <Ionicons name="copy-outline" size={14} color={Colors.teal} />
                      <Text style={styles.historyClipboardText}>Copy</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

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
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  hint: {
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginBottom: 14,
  },

  // Shared pills
  pillRow: { marginBottom: 24 },
  pillContent: { paddingRight: 20 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  pillSelected: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  pillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  pillLabelSelected: { color: Colors.surface },

  // Tone override colors
  tonePillSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  tonePillLabelSelected: { color: Colors.surface },

  // Platform multi-select grid
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  platformPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  platformPillSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  platformPillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  platformPillLabelSelected: { color: Colors.surface },
  checkmark: { marginRight: 4 },

  // Listing details
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    minHeight: 140,
    marginBottom: 6,
  },
  charCount: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 24,
  },

  // Generate button
  generateButton: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 32,
  },
  generateButtonDisabled: { opacity: 0.7 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generateButtonText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },

  // Results
  resultsSection: { marginBottom: 32 },
  tabRow: { marginBottom: 14 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  tabActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  tabLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  tabLabelActive: { color: Colors.surface },

  copyBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 14,
  },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  hashtagPill: {
    backgroundColor: Colors.offWhite,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hashtagText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.mono,
    color: Colors.navy,
  },
  copyActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionButtonSaved: { borderColor: Colors.navy },
  actionButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
  },
  savedText: { color: Colors.navy },

  // Get Score info toggle
  scoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  scoreInfoLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  scoreInfoBody: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },

  // Get Score button
  scoreButton: {
    backgroundColor: Colors.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  scoreButtonDisabled: { opacity: 0.6 },
  scoreButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },

  // Audience targeting
  targetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 4,
  },
  targetingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  targetingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.teal,
  },
  targetingOptional: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  targetingBody: {
    marginBottom: 8,
  },
  subLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 4,
  },

  // History
  historySection: { gap: 10 },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyClipboard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyClipboardText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
  },
  historyPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  historyDate: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  historyPreview: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
});
