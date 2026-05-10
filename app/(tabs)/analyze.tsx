import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../services/api";
import { posthog } from "../../services/analytics";
import { Colors, scoreColor } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import {
  PLATFORMS,
  Platform,
  PLATFORM_LABELS,
  CONTENT_TYPES,
  ContentType,
  CONTENT_TYPE_LABELS,
  PriceRange,
  BUYER_TYPES,
  BuyerType,
} from "../../constants/config";
import { PlatformPill } from "../../components/PlatformPill";
import { ListingPriceSelector } from "../../components/ListingPriceSelector";
import { BuyerTypeSelector } from "../../components/BuyerTypeSelector";
import { useAuthStore } from "../../store/authStore";
import { usePreFillStore } from "../../store/preFillStore";
import { useFormDraftStore } from "../../store/formDraftStore";
import { AuthExpiredError } from "../../services/api";
import type { Analysis } from "../../types";

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 5000,
  linkedin: 3000,
  twitter: 280,
  tiktok: 2200,
};

export default function AnalyzeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [contentType, setContentType] = useState<ContentType>("new_listing");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{
    base64: string;
    uri: string;
    type: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [buyerTypes, setBuyerTypes] = useState<Set<BuyerType>>(new Set());
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [mode, setMode] = useState<'single' | 'carousel'>('single');
  const [slides, setSlides] = useState<{ uri: string; base64: string; mediaType: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      const prefill = usePreFillStore.getState().prefill;
      if (prefill) {
        if (prefill.draft) setText(prefill.draft);
        if (prefill.priceRange) setPriceRange(prefill.priceRange);
        if (prefill.buyerTypes.length > 0)
          setBuyerTypes(new Set(prefill.buyerTypes));
        usePreFillStore.getState().clear();
      }

      const draft = useFormDraftStore.getState().analyzeDraft;
      if (
        draft &&
        useFormDraftStore.getState().returnPath === "/(tabs)/analyze"
      ) {
        setPlatform(draft.platform as any);
        setContentType(draft.contentType as any);
        setText(draft.text);
        setPriceRange(draft.priceRange);
        setBuyerTypes(new Set(draft.buyerTypes as any[]));
        useFormDraftStore.getState().clear();
      }

      async function loadRecent() {
        setLoadingRecent(true);
        try {
          const res = await api.analyses.list(1);
          setRecentAnalyses(res.analyses.slice(0, 5));
        } catch {
          // silent fail — empty list is fine
        } finally {
          setLoadingRecent(false);
        }
      }
      loadRecent();
    }, []),
  );

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow Scorrd to access your photos to analyze listing images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({
        base64: asset.base64!,
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
      });
    }
  }

  async function pickSlide(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow Scorrd to access your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.75,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const newSlide = { uri: asset.uri, base64: asset.base64!, mediaType: asset.mimeType ?? 'image/jpeg' };
      setSlides(prev => {
        const updated = [...prev];
        if (index < updated.length) {
          updated[index] = newSlide;
        } else {
          updated.push(newSlide);
        }
        return updated;
      });
    }
  }

  function removeSlide(index: number) {
    setSlides(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCarouselAnalyze() {
    if (slides.length < 2) return;
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.carousel.analyze({
        slides: slides.map(s => ({ imageBase64: s.base64, mediaType: s.mediaType })),
        content_type: contentType,
        ...(text.trim() ? { caption: text.trim() } : {}),
        ...(priceRange ? { listing_price_range: priceRange } : {}),
        ...(buyerTypes.size > 0 ? { target_buyer_type: Array.from(buyerTypes) } : {}),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/analysis/carousel/${res.carouselAnalysis.id}`);
    } catch (err) {
      if (err instanceof AuthExpiredError) return;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Analysis failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!text.trim()) {
      Alert.alert(
        "Add your post",
        "Paste or type the social media post you want to analyze.",
      );
      return;
    }

    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    posthog.capture("analysis_submitted", {
      platform,
      content_type: contentType,
      has_image: !!image,
      has_audience_context: !!priceRange && buyerTypes.size > 0,
    });

    try {
      const result = await api.analyses.submit({
        platform,
        content_type: contentType,
        draft_text: text.trim(),
        ...(image
          ? { image_base64: image.base64, image_media_type: image.type }
          : {}),
        ...(priceRange ? { listing_price_range: priceRange } : {}),
        ...(buyerTypes.size > 0
          ? { target_buyer_type: Array.from(buyerTypes) }
          : {}),
        ...(user?.name ? { agent_name: user.name } : {}),
        ...(user?.brokerageName ? { brokerage_name: user.brokerageName } : {}),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/analysis/${result.analysis.id}`);
      setText("");
      setImage(null);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        useFormDraftStore.getState().saveAnalyze(
          {
            platform,
            contentType,
            text,
            priceRange,
            buyerTypes: Array.from(buyerTypes),
          },
          "/(tabs)/analyze",
        );
        await useAuthStore.getState().expireSession();
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Analysis failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.heading}>Paste a post. Get graded in 13 seconds.</Text>
        <Text style={styles.subheading}>Score across 4 dimensions. Know exactly what to fix.</Text>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {(['single', 'carousel'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modePill, mode === m && styles.modePillSelected]}
              onPress={() => { Haptics.selectionAsync(); setMode(m); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.modePillLabel, mode === m && styles.modePillLabelSelected]}>
                {m === 'single' ? 'Single Post' : 'Carousel'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Platform pills */}
        <Text style={styles.sectionLabel}>Platform</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillRow}
          contentContainerStyle={styles.pillContent}
        >
          {PLATFORMS.map((p) => (
            <PlatformPill
              key={p}
              platform={p}
              selected={platform === p}
              onPress={setPlatform}
            />
          ))}
        </ScrollView>

        {/* Content type */}
        <Text style={styles.sectionLabel}>Content Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillRow}
          contentContainerStyle={styles.pillContent}
        >
          {CONTENT_TYPES.map((ct) => (
            <TouchableOpacity
              key={ct}
              style={[
                styles.typePill,
                contentType === ct && styles.typePillSelected,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setContentType(ct);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typePillLabel,
                  contentType === ct && styles.typePillLabelSelected,
                ]}
              >
                {CONTENT_TYPE_LABELS[ct]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Text area */}
        <Text style={styles.sectionLabel}>Post Text</Text>
        <TextInput
          style={styles.textArea}
          placeholder={`Paste your ${PLATFORM_LABELS[platform]} post here...`}
          placeholderTextColor={Colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={PLATFORM_CHAR_LIMITS[platform] ?? 5000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {text.length} / {PLATFORM_CHAR_LIMITS[platform] ?? 5000}
        </Text>

        {/* Image picker — single mode only */}
        {mode === 'single' && (
          <>
            <Text style={styles.sectionLabel}>
              Listing Image <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TouchableOpacity
              style={styles.imageZone}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {image ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImage}
                    onPress={() => setImage(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.navy} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={32}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.imagePlaceholderText}>
                    Tap to add a listing photo
                  </Text>
                  <Text style={styles.imagePlaceholderSub}>
                    Scored for staging, lighting & platform fit
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Carousel slide picker — carousel mode only */}
        {mode === 'carousel' && (
          <>
            <Text style={styles.sectionLabel}>
              Slides <Text style={styles.optional}>(min 2, max 10)</Text>
            </Text>
            <View style={styles.carouselGrid}>
              {Array.from({ length: Math.min(slides.length + 1, 10) }).map((_, i) => {
                const isFilled = i < slides.length;
                const slideNum = i + 1;
                const isHook = i === 0;
                const isCta = isFilled && i === slides.length - 1 && slides.length >= 2;
                const label = isHook
                  ? 'Slide 1 — Hook'
                  : isCta
                  ? `Slide ${slideNum} — CTA`
                  : `Slide ${slideNum}`;
                const labelIsTeal = isHook || isCta;

                if (isFilled) {
                  return (
                    <View key={i} style={styles.slideZone}>
                      <Image source={{ uri: slides[i].uri }} style={styles.slideThumbnail} />
                      <View style={styles.slideLabelOverlay}>
                        <Text style={[styles.slideLabelText, labelIsTeal && styles.slideLabelTeal]}>
                          {label}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.slideRemoveBtn}
                        onPress={() => removeSlide(i)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={22} color={Colors.surface} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.slideZoneEmpty}
                    onPress={() => pickSlide(i)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={28} color={Colors.teal} />
                    <Text style={[styles.slideEmptyLabel, isHook && styles.slideEmptyLabelTeal]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Audience Targeting — optional */}
        <Text style={styles.sectionLabel}>
          Audience Targeting{" "}
          <Text style={styles.optional}>(optional — unlocks Match Score)</Text>
        </Text>

        <Text style={styles.subLabel}>Listing Price Range</Text>
        <ListingPriceSelector value={priceRange} onChange={setPriceRange} />

        <Text style={styles.subLabel}>Target Buyer</Text>
        <BuyerTypeSelector value={buyerTypes} onChange={setBuyerTypes} />

        {/* Analyze button */}
        <TouchableOpacity
          style={[
            styles.analyzeButton,
            (loading || (mode === 'carousel' && slides.length < 2)) && styles.analyzeButtonDisabled,
          ]}
          onPress={mode === 'carousel' ? handleCarouselAnalyze : handleAnalyze}
          disabled={loading || (mode === 'carousel' && slides.length < 2)}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={styles.analyzeButtonInner}>
              <ActivityIndicator color={Colors.surface} size="small" />
              <Text style={styles.analyzeButtonText}>Analyzing...</Text>
            </View>
          ) : (
            <Text style={styles.analyzeButtonText}>
              {mode === 'carousel' ? 'Analyze Carousel' : 'Analyze Post'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Recent analyses */}
        {recentAnalyses.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionLabel}>Recent Analyses</Text>
            {loadingRecent ? (
              <ActivityIndicator
                color={Colors.teal}
                style={styles.recentLoader}
              />
            ) : (
              recentAnalyses.map((analysis) => (
                <TouchableOpacity
                  key={analysis.id}
                  style={styles.recentCard}
                  onPress={() => router.push(`/analysis/${analysis.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recentLeft}>
                    <Text style={styles.recentPlatform}>
                      {analysis.post?.platform ?? "—"}
                    </Text>
                    <Text style={styles.recentText} numberOfLines={2}>
                      {analysis.post?.draftText ?? "No text"}
                    </Text>
                    <View style={styles.recentBadgeRow}>
                      {analysis.audienceMatchScore != null && (
                        <Text style={styles.recentBadge}>
                          👥 Match: {analysis.audienceMatchScore.toFixed(1)}
                        </Text>
                      )}
                      {analysis.platformFit &&
                        analysis.platformFit.length > 0 &&
                        (() => {
                          const best = [...analysis.platformFit].sort(
                            (a, b) => b.fit_score - a.fit_score,
                          )[0];
                          const label =
                            PLATFORM_LABELS[best.platform as Platform] ??
                            best.platform;
                          return (
                            <Text style={styles.recentBadge}>
                              📱 Best: {label} {best.fit_score.toFixed(1)}
                            </Text>
                          );
                        })()}
                    </View>
                    <Text style={styles.recentDate}>
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.recentScore,
                      { color: scoreColor(analysis.compositeScore) },
                    ]}
                  >
                    {analysis.compositeScore.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  heading: {
    fontSize: FontSize["2xl"],
    fontFamily: FontFamily.serif,
    color: Colors.teal,
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
  optional: {
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  pillRow: { marginBottom: 24 },
  pillContent: { paddingRight: 20 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  typePillSelected: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  typePillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  typePillLabelSelected: { color: Colors.surface },
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
    textAlign: "right",
    marginBottom: 24,
  },
  imageZone: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 24,
    minHeight: 120,
    justifyContent: "center",
  },
  imagePreviewWrapper: { position: "relative" },
  imagePreview: { width: "100%", height: 200, resizeMode: "cover" },
  removeImage: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  imagePlaceholderSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  analyzeButton: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 32,
  },
  analyzeButtonDisabled: { opacity: 0.7 },
  analyzeButtonInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  analyzeButtonText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  subLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginTop: 4,
  },
  recentSection: { gap: 12 },
  recentLoader: { marginTop: 16 },
  recentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recentLeft: { flex: 1 },
  recentPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: "capitalize",
    marginBottom: 4,
  },
  recentText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  recentBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
    marginTop: 2,
  },
  recentBadge: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
  },
  recentDate: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  recentScore: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  modePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modePillSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  modePillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  modePillLabelSelected: { color: Colors.surface },
  carouselGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  slideZone: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  slideZoneEmpty: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.teal,
    borderStyle: 'dashed',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  slideThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slideLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  slideLabelText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  slideLabelTeal: { color: Colors.teal },
  slideRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  slideEmptyLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  slideEmptyLabelTeal: { color: Colors.teal },
});
