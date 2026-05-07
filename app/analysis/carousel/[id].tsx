import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors, scoreColor } from '../../../constants/colors';
import { FontFamily, FontSize } from '../../../constants/typography';
import { ScoreRing } from '../../../components/ScoreRing';
import { InfoCallout } from '../../../components/InfoCallout';
import { api, AuthExpiredError } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import type { SlideScore } from '../../../types';

function dimensionVerdict(score: number): string {
  if (score >= 7.0) return 'Strong';
  if (score >= 4.0) return 'Needs work';
  return 'Weak';
}

function SkeletonBlock({ style }: { style?: object }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.skeleton, style, { opacity }]} />;
}

export default function CarouselResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedSlide, setSelectedSlide] = useState<{ score: SlideScore; uri: string } | null>(null);

  useEffect(() => {
    if (error instanceof AuthExpiredError) {
      useAuthStore.getState().expireSession();
    }
  }, [error]);
  const [showReorder, setShowReorder] = useState(true);
  const [captionCopied, setCaptionCopied] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['carousel', id],
    queryFn: async () => {
      const res = await api.carousel.get(id);
      return res.carouselAnalysis;
    },
  });

  const dimensions = data
    ? [
        { label: 'Hook', score: data.hookScore ?? 0 },
        { label: 'Sequence', score: data.sequenceScore ?? 0 },
        { label: 'Consistency', score: data.consistencyScore ?? 0 },
        { label: 'Swipe Momentum', score: data.swipeMomentumScore ?? 0 },
        { label: 'CTA', score: data.ctaScore ?? 0 },
      ]
    : [];

  async function copyCaption() {
    if (!data?.captionRewrites?.instagram) return;
    await Clipboard.setStringAsync(data.captionRewrites.instagram);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Carousel Analysis</Text>
          {data && (
            <Text style={styles.headerSubtitle}>{data.slideCount} slides analyzed</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <>
            <SkeletonBlock style={styles.skeletonRing} />
            <View style={styles.skeletonDimRow}>
              {[1, 2, 3, 4, 5].map((k) => (
                <SkeletonBlock key={k} style={styles.skeletonDimCard} />
              ))}
            </View>
            <SkeletonBlock style={styles.skeletonStrip} />
            <SkeletonBlock style={styles.skeletonCallout} />
            <SkeletonBlock style={styles.skeletonCallout} />
          </>
        )}

        {isError && (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>
              {error instanceof AuthExpiredError
                ? 'Session expired — redirecting to sign in...'
                : 'Failed to load analysis.'}
            </Text>
            {!(error instanceof AuthExpiredError) && (
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {data && (
          <>
            {/* Composite score */}
            <View style={styles.ringSection}>
              <ScoreRing
                score={data.carouselCompositeScore ?? 0}
                color={scoreColor(data.carouselCompositeScore ?? 0)}
                size={160}
                strokeWidth={14}
              />
              <Text style={styles.ringLabel}>Carousel Score</Text>
            </View>

            {/* Dimension cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dimScroll}
              contentContainerStyle={styles.dimContent}
            >
              {dimensions.map((dim) => (
                <View key={dim.label} style={styles.dimCard}>
                  <ScoreRing
                    score={dim.score}
                    color={scoreColor(dim.score)}
                    size={60}
                    strokeWidth={6}
                  />
                  <Text style={styles.dimLabel}>{dim.label}</Text>
                  <Text style={[styles.dimVerdict, { color: scoreColor(dim.score) }]}>
                    {dimensionVerdict(dim.score)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Slide strip */}
            <Text style={styles.sectionTag}>SLIDE BREAKDOWN</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.slideStrip}
              contentContainerStyle={styles.slideStripContent}
            >
              {data.perSlideScores.map((slide, i) => (
                <TouchableOpacity
                  key={slide.slide_number}
                  style={styles.slideThumbnailWrap}
                  onPress={() =>
                    setSelectedSlide({ score: slide, uri: data.slideImageUrls[i] ?? '' })
                  }
                  activeOpacity={0.8}
                >
                  {data.slideImageUrls[i] ? (
                    <Image
                      source={{ uri: data.slideImageUrls[i] }}
                      style={styles.slideThumbnail}
                    />
                  ) : (
                    <View style={[styles.slideThumbnail, styles.slidePlaceholder]} />
                  )}
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: scoreColor(slide.individual_score ?? 0) },
                    ]}
                  >
                    <Text style={styles.scoreBadgeText}>
                      {(slide.individual_score ?? 0).toFixed(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Reorder suggestion */}
            {showReorder && data.recommendedSlideOrder && (
              <View style={styles.reorderWrap}>
                <InfoCallout
                  label="SLIDE ORDER SUGGESTION"
                  body={`Recommended order: ${data.recommendedSlideOrder.join(' → ')}${data.reorderRationale ? ` — ${data.reorderRationale}` : ''}`}
                />
                <TouchableOpacity
                  style={styles.dismissBtn}
                  onPress={() => setShowReorder(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.dismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Sequence verdict */}
            <InfoCallout label="CAROUSEL STORY ARC" body={data.sequenceVerdict} />

            {/* Top 3 fixes */}
            <Text style={styles.fixesLabel}>TOP CAROUSEL FIXES</Text>
            {data.top3Fixes.map((fix, i) => (
              <View key={i} style={styles.fixRow}>
                <View style={styles.fixBadge}>
                  <Text style={styles.fixBadgeNum}>{i + 1}</Text>
                </View>
                <Text style={styles.fixText}>{fix}</Text>
              </View>
            ))}

            {/* Caption rewrite */}
            {data.captionRewrites?.instagram && (
              <View style={styles.captionSection}>
                <Text style={styles.sectionTag}>OPTIMIZED CAPTION</Text>
                <View style={styles.copyBox}>
                  <Text style={styles.copyBoxText}>{data.captionRewrites.instagram}</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={copyCaption}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={captionCopied ? 'checkmark-circle-outline' : 'copy-outline'}
                      size={18}
                      color={captionCopied ? Colors.teal : Colors.textSecondary}
                    />
                    <Text style={[styles.copyBtnText, captionCopied && styles.copyBtnTextDone]}>
                      {captionCopied ? 'Copied!' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Slide detail modal */}
      <Modal
        visible={selectedSlide !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSlide(null)}
      >
        {selectedSlide && (
          <SafeAreaView style={styles.modalSafe} edges={['top']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Slide {selectedSlide.score.slide_number}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedSlide(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={24} color={Colors.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedSlide.uri ? (
                <Image
                  source={{ uri: selectedSlide.uri }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.modalImage, styles.slidePlaceholder]} />
              )}
              <View style={styles.modalScores}>
                {[
                  { label: 'Composition', value: selectedSlide.score.composition_score ?? 0 },
                  { label: 'Lighting', value: selectedSlide.score.lighting_score ?? 0 },
                  { label: 'Content', value: selectedSlide.score.content_score ?? 0 },
                ].map((s) => (
                  <View key={s.label} style={styles.modalScoreRow}>
                    <Text style={styles.modalScoreLabel}>{s.label}</Text>
                    <Text style={[styles.modalScoreVal, { color: scoreColor(s.value) }]}>
                      {s.value.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.modalSectionTag}>VERDICT</Text>
              <Text style={styles.modalBodyText}>{selectedSlide.score.verdict}</Text>
              <Text style={styles.modalSectionTag}>ONE FIX</Text>
              <Text style={styles.modalBodyText}>{selectedSlide.score.one_fix}</Text>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.offWhite,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  skeleton: { backgroundColor: Colors.border, borderRadius: 8 },
  skeletonRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignSelf: 'center',
    marginBottom: 28,
  },
  skeletonDimRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  skeletonDimCard: { width: 100, height: 120, borderRadius: 12 },
  skeletonStrip: { height: 80, borderRadius: 8, marginBottom: 28 },
  skeletonCallout: { height: 80, borderRadius: 8, marginBottom: 16 },
  errorState: { alignItems: 'center', paddingTop: 60, gap: 16 },
  errorText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  retryBtn: {
    backgroundColor: Colors.teal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  ringSection: { alignItems: 'center', marginBottom: 28, gap: 12 },
  ringLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dimScroll: { marginBottom: 28 },
  dimContent: { paddingRight: 20, gap: 10 },
  dimCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    minWidth: 100,
  },
  dimLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  dimVerdict: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    textAlign: 'center',
  },
  sectionTag: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  slideStrip: { marginBottom: 28 },
  slideStripContent: { paddingRight: 20, gap: 10 },
  slideThumbnailWrap: { position: 'relative' },
  slideThumbnail: { width: 80, height: 80, borderRadius: 8, resizeMode: 'cover' },
  slidePlaceholder: { backgroundColor: Colors.border },
  scoreBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  reorderWrap: { marginBottom: 16 },
  dismissBtn: { alignSelf: 'flex-end', marginTop: 6 },
  dismissText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  fixesLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: 12,
  },
  fixRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  fixBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fixBadgeNum: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  fixText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  captionSection: { marginTop: 8 },
  copyBox: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 24,
  },
  copyBoxText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
  },
  copyBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  copyBtnTextDone: { color: Colors.teal },
  modalSafe: { flex: 1, backgroundColor: Colors.offWhite },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
  },
  modalContent: { padding: 20, paddingBottom: 48 },
  modalImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalScores: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  modalScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalScoreLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
  },
  modalScoreVal: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.serif,
  },
  modalSectionTag: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalBodyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 20,
  },
});
