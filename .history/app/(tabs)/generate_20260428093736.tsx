import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, AuthExpiredError } from "../../services/api";
import { posthog } from "../../services/analytics";
import { useFormDraftStore } from "../../store/formDraftStore";
import { useAuthStore } from "../../store/authStore";
import { Colors, scoreColor } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
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
} from "../../constants/config";
import { ListingPriceSelector } from "../../components/ListingPriceSelector";
import { BuyerTypeSelector } from "../../components/BuyerTypeSelector";
import { usePreFillStore } from "../../store/preFillStore";
import type { GeneratedPost, ReelScriptResult } from "../../types";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";

const MAX_DETAILS = 2000;
const REEL_PLATFORMS: Platform[] = ["instagram", "facebook", "tiktok"];
const SCHEDULE_TIME_PRESETS = [
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
];
const SCHEDULE_DATE_COUNT = 14;

const PLATFORM_OPTIMAL_TIMES: Record<string, string[]> = {
  instagram: ["Weekdays 9–11 AM", "Tue–Thu 6–8 PM"],
  facebook: ["Weekdays 8–10 AM", "Fri 12–3 PM"],
  linkedin: ["Tue–Thu 7–10 AM", "Wed 12 PM"],
  twitter: ["Weekdays 8–10 AM", "Weekdays 5–7 PM"],
  tiktok: ["Daily 9–11 AM", "Daily 6–9 PM"],
};

const REEL_POSTING_STRATEGY: Record<
  string,
  { times: string[]; frequency: string; cadence: string }
> = {
  instagram: {
    times: ["Weekdays 9–11 AM", "Evenings 6–8 PM"],
    frequency: "3–5 Reels/week",
    cadence: "Post consistently — timing matters less than consistency",
  },
  facebook: {
    times: ["Weekdays 8–10 AM", "Weekends 9–11 AM"],
    frequency: "2–4 Reels/week",
    cadence: "Every 2–3 days works well",
  },
  tiktok: {
    times: ["Daily 9–11 AM", "Daily 6–9 PM"],
    frequency: "1–3 posts/day",
    cadence: "Daily posting helps growth, but consistency is key",
  },
};

const PLATFORM_PHOTO_TIPS: Record<string, { tips: string[]; avoid: string[] }> =
  {
    instagram: {
      tips: [
        "General - Shoot vertical (4:5) so your photo takes up more space in the feed",
        "Interior - Use natural light — position the room so light is coming in from the side",
        "InteriorLead with your best room: primary bedroom, living room, or a great view",
        "Exterior - Take exterior photos around sunset — the warm light makes everything look better",
      ],
      avoid: [
        "Placeing text or logos on photos — it can reduce engagement and reach",
        "Horizontal photos — they look smaller and get skipped",
        "Clutter, personal items, open toilet lids, or messy beds",
        "Over-editing or fake skies — it makes the listing feel less trustworthy",
      ],
    },
    facebook: {
      tips: [
        "Interior -Add simple staging like a plant or coffee setup — helps buyers picture living there",
        "Exterior - Include neighborhood shots to show what it’s like to live there",
        "General - Slightly warm, natural-looking photos tend to get more engagement",
        "Use a mix of exterior and interior photos for better results",
      ],
      avoid: [
        "Starting with drone shots — eye-level photos connect better",
        "Watermarks or text on images — they hurt reach",
        "Dark photos — bright and clean always perform better",
      ],
    },
    linkedin: {
      tips: [
        "Exterior - Use a straight-on exterior shot — clean and professional",
        "Interior - Stick with natural daylight — no flash",
        "General - Include a person when it makes sense — people connect with faces",
        "General - Keep things simple and tidy — less is more here",
      ],
      avoid: [
        "Filters — keep it real and natural",
        "Vertical photos — horizontal fits better on LinkedIn",
        "Leading with drone shots — save those for later",
      ],
    },
    twitter: {
      tips: [
        "Keep it simple — one clear main feature",
        "Use good contrast so the photo stands out even when small",
        "A clean exterior with blue sky works well and stops scrolling",
        "If adding text, keep it short and near the top or bottom",
      ],
      avoid: [
        "Close-up details — they don’t read well in previews",
        "Busy photos with too much going on",
        "Text in the middle — it can get cut off",
      ],
    },
    tiktok: {
      tips: [
        "Always shoot vertical (phone upright)",
        "Start with the most eye-catching part of the home",
        "Use movement — walk-throughs or slow pans work best",
        "Natural, real footage often performs better than polished video",
      ],
      avoid: [
        "Horizontal video — it won’t perform",
        "Still shots — movement is key on TikTok",
        "Overly polished, “corporate” video — keep it real",
      ],
    },
  };

export default function GenerateScreen() {
  const user = useAuthStore((s) => s.user);
  const scrollRef = useRef<ScrollView>(null);
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const handledPostIdRef = useRef<string | null>(null);

  const [contentType, setContentType] = useState<ContentType>("new_listing");
  const [platforms, setPlatforms] = useState<Set<Platform>>(
    new Set(["instagram"]),
  );
  const [tone, setTone] = useState<Tone>("professional");
  const [details, setDetails] = useState("");
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [buyerTypes, setBuyerTypes] = useState<Set<BuyerType>>(new Set());
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedPost[] | null>(null);
  const [activeTab, setActiveTab] = useState("");

  const [history, setHistory] = useState<GeneratedPost[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMediaType, setPhotoMediaType] = useState<string>("image/jpeg");
  const [photoExtractLoading, setPhotoExtractLoading] = useState(false);
  const [photoExtractConfirm, setPhotoExtractConfirm] = useState(false);
  const [photoScoreResult, setPhotoScoreResult] = useState<{
    photoScore: number;
    verdict: string;
    fix: string;
  } | null>(null);
  const [photoScoreLoading, setPhotoScoreLoading] = useState(false);
  const photoScoreDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [schedulePost, setSchedulePost] = useState<GeneratedPost | null>(null);
  const [scheduleDate, setScheduleDate] = useState(1);
  const [scheduleTime, setScheduleTime] = useState("9 AM");
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [photoTipsOpen, setPhotoTipsOpen] = useState(false);
  const [mode, setMode] = useState<"post" | "reel">("post");
  const [reelResult, setReelResult] = useState<{
    post: GeneratedPost;
    script: ReelScriptResult;
  } | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      const draft = useFormDraftStore.getState().generateDraft;
      if (
        draft &&
        useFormDraftStore.getState().returnPath === "/(tabs)/generate"
      ) {
        setContentType(draft.contentType as any);
        setPlatforms(new Set(draft.platforms as any[]));
        setTone(draft.tone as any);
        setDetails(draft.details);
        setPriceRange(draft.priceRange);
        setBuyerTypes(new Set(draft.buyerTypes as any[]));
        useFormDraftStore.getState().clear();
      }

      api.generate
        .history(1)
        .then((r) => setHistory(r.posts.slice(0, 5)))
        .catch(() => {});
    }, []),
  );

  useEffect(() => {
    if (!postId || postId === handledPostIdRef.current || history.length === 0)
      return;
    const found = history.find((p) => p.id === postId);
    if (found) {
      setExpandedId(postId);
      handledPostIdRef.current = postId;
    }
  }, [history, postId]);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p) && next.size > 1) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function handleCopyFullScript() {
    if (!reelResult) return;
    const { script } = reelResult;
    const lines = [
      `HOOK: ${script.hook_line}`,
      `(${script.hook_direction})`,
      "",
      ...script.scenes.map(
        (s) =>
          `SCENE ${s.scene_number} (${s.duration_seconds}s) — ${s.location}\nSHOW: ${s.what_to_show}\nSAY: ${s.what_to_say}\nDELIVERY: ${s.delivery_note}`,
      ),
      "",
      `CLOSE CTA: ${script.close_cta}`,
      "",
      `CAPTION:\n${script.caption}`,
      "",
      script.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" "),
      ...(script.tiktok_repurpose_hook
        ? ["", `TIKTOK HOOK: ${script.tiktok_repurpose_hook}`]
        : []),
    ];
    await Clipboard.setStringAsync(lines.join("\n"));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Copied!", "Full reel script copied to clipboard.");
  }

  function toggleScene(n: number) {
    setExpandedScenes((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  async function handleGenerate() {
    if (!details.trim()) {
      Alert.alert(
        "Add listing details",
        "Describe the property, price, features, and any key selling points.",
      );
      return;
    }
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (mode === "reel") {
        const platform = Array.from(platforms)[0] ?? "instagram";
        const res = await api.generate.createReel({
          platform,
          content_type: contentType,
          listing_details: details.trim(),
          tone,
          ...(priceRange ? { listing_price_range: priceRange } : {}),
          ...(buyerTypes.size > 0
            ? { target_buyer_type: Array.from(buyerTypes) }
            : {}),
        });
        setReelResult({ post: res.generated_post, script: res.reel_script });
        setExpandedScenes(new Set());
        posthog.capture("reel_script_generated", {
          platform,
          tone,
          has_audience_target: priceRange != null || buyerTypes.size > 0,
        });
      } else {
        const res = await api.generate.create({
          content_type: contentType,
          agent_name: user?.name ?? "Agent",
          listing_details: details.trim(),
          tone,
          platforms: Array.from(platforms),
          include_hashtags: true,
          ...(priceRange ? { listing_price_range: priceRange } : {}),
          ...(buyerTypes.size > 0
            ? { target_buyer_type: Array.from(buyerTypes) }
            : {}),
          ...(user?.brokerageName
            ? { brokerage_name: user.brokerageName }
            : {}),
        });
        setResults(res.generated_posts);
        setActiveTab(res.generated_posts[0]?.platform ?? "");
        posthog.capture("post_generated", {
          platform: Array.from(platforms).join(","),
          tone,
          has_audience_target: priceRange != null || buyerTypes.size > 0,
          extracted_from_image: !!photoUri,
        });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        useFormDraftStore.getState().saveGenerate(
          {
            contentType,
            platforms: Array.from(platforms),
            tone,
            details,
            priceRange,
            buyerTypes: Array.from(buyerTypes),
          },
          "/(tabs)/generate",
        );
        await useAuthStore.getState().expireSession();
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Generation failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openSchedule(post: GeneratedPost) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSchedulePost(post);
    setScheduleDate(1);
    setScheduleTime("9 AM");
    setScheduleNote("");
  }

  function buildDatePills() {
    return Array.from({ length: SCHEDULE_DATE_COUNT }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label =
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
      return { label, offset: i };
    });
  }

  async function handleSchedulePost() {
    if (!schedulePost) return;
    setScheduling(true);
    try {
      const now = new Date();
      const [num, period] = scheduleTime.split(" ");
      let hour = parseInt(num, 10);
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      const scheduled_at = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + scheduleDate,
        hour,
        0,
      ).toISOString();
      await api.calendar.create({
        platform: schedulePost.platform,
        scheduled_at,
        generated_post_id: schedulePost.id,
        ...(scheduleNote.trim() ? { note: scheduleNote.trim() } : {}),
      });
      posthog.capture("calendar_item_scheduled", {
        platform: schedulePost.platform,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSchedulePost(null);
      const d = new Date();
      d.setDate(d.getDate() + scheduleDate);
      const dateLabel =
        scheduleDate === 0
          ? "today"
          : scheduleDate === 1
            ? "tomorrow"
            : d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
      Alert.alert(
        "Scheduled!",
        `Post added to your calendar for ${dateLabel} at ${scheduleTime}.`,
      );
    } catch {
      Alert.alert("Failed", "Could not schedule this post. Please try again.");
    } finally {
      setScheduling(false);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    const b64 = asset.base64 ?? "";
    setPhotoUri(asset.uri);
    setPhotoBase64(b64);
    setPhotoMediaType(mimeType);
    setPhotoScoreResult(null);
    setPhotoExtractConfirm(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    runPhotoExtract(b64, mimeType);
    runPhotoScore(b64, mimeType, Array.from(platforms)[0] ?? "instagram");
  }

  async function runPhotoExtract(b64: string, mediaType: string) {
    setPhotoExtractLoading(true);
    try {
      const result = await api.generate.extractImage({
        imageBase64: b64,
        mediaType,
      });
      setDetails((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed}, ${result.details}` : result.details;
      });
      setPhotoExtractConfirm(true);
      setTimeout(() => setPhotoExtractConfirm(false), 3000);
    } catch {
      // silent — extraction is optional
    } finally {
      setPhotoExtractLoading(false);
    }
  }

  async function runPhotoScore(
    b64: string,
    mediaType: string,
    platform: string,
  ) {
    setPhotoScoreLoading(true);
    try {
      const result = await api.generate.photoScore({
        imageBase64: b64,
        platform,
        buyerType: buyerTypes.size > 0 ? Array.from(buyerTypes) : undefined,
        mediaType,
      });
      setPhotoScoreResult(result);
    } catch {
      // silent
    } finally {
      setPhotoScoreLoading(false);
    }
  }

  function handleRemovePhoto() {
    setPhotoUri(null);
    setPhotoBase64(null);
    setPhotoMediaType("image/jpeg");
    setPhotoScoreResult(null);
    setPhotoExtractConfirm(false);
  }

  useEffect(() => {
    if (!photoBase64) return;
    if (photoScoreDebounceRef.current)
      clearTimeout(photoScoreDebounceRef.current);
    photoScoreDebounceRef.current = setTimeout(() => {
      runPhotoScore(
        photoBase64,
        photoMediaType,
        Array.from(platforms)[0] ?? "instagram",
      );
    }, 800);
    return () => {
      if (photoScoreDebounceRef.current)
        clearTimeout(photoScoreDebounceRef.current);
    };
  }, [platforms]);

  const activePost = results?.find((p) => p.platform === activeTab);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Generate Post</Text>
        <Text style={styles.subheading}>
          Describe your listing and get ready-to-post copy
        </Text>

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {(["post", "reel"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setMode(m);
                if (m === "reel") {
                  setPlatforms((prev) => {
                    const filtered = new Set(
                      [...prev].filter((p) => REEL_PLATFORMS.includes(p)),
                    );
                    return filtered.size > 0
                      ? filtered
                      : new Set<Platform>(["instagram"]);
                  });
                }
                setResults(null);
                setReelResult(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeBtnText,
                  mode === m && styles.modeBtnTextActive,
                ]}
              >
                {m === "post" ? "Post" : "Reel"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Type */}
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
              style={[styles.pill, contentType === ct && styles.pillSelected]}
              onPress={() => {
                Haptics.selectionAsync();
                setContentType(ct);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillLabel,
                  contentType === ct && styles.pillLabelSelected,
                ]}
              >
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
          {(mode === "reel"
            ? PLATFORMS.filter((p) => REEL_PLATFORMS.includes(p))
            : PLATFORMS
          ).map((p) => {
            const selected = platforms.has(p);
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.platformPill,
                  selected && styles.platformPillSelected,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  togglePlatform(p);
                }}
                activeOpacity={0.7}
              >
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={Colors.surface}
                    style={styles.checkmark}
                  />
                )}
                <Text
                  style={[
                    styles.platformPillLabel,
                    selected && styles.platformPillLabelSelected,
                  ]}
                >
                  {PLATFORM_LABELS[p]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tone */}
        <Text style={styles.sectionLabel}>Tone</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillRow}
          contentContainerStyle={styles.pillContent}
        >
          {TONES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, tone === t && styles.tonePillSelected]}
              onPress={() => {
                Haptics.selectionAsync();
                setTone(t);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillLabel,
                  tone === t && styles.tonePillLabelSelected,
                ]}
              >
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
            "e.g. 3BR/2BA in Westwood, $1.2M, newly renovated kitchen, mountain views, " +
            "open house Saturday 1–4pm. Target: move-up buyers."
          }
          placeholderTextColor={Colors.textSecondary}
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={MAX_DETAILS}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {details.length} / {MAX_DETAILS}
        </Text>

        {/* Listing Photo */}
        <Text style={styles.sectionLabel}>
          Listing Photo <Text style={styles.hint}>(optional)</Text>
        </Text>
        {!photoUri ? (
          <TouchableOpacity
            style={styles.photoZone}
            onPress={pickPhoto}
            activeOpacity={0.75}
          >
            <Ionicons name="camera-outline" size={22} color={Colors.teal} />
            <Text style={styles.photoZoneLabel}>Add a listing photo</Text>
            <Text style={styles.photoZoneHint}>
              Extracts details · scores for your platform
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photoRow}>
            <View style={styles.photoThumbWrap}>
              <Image source={{ uri: photoUri }} style={styles.photoThumb} />
              {photoScoreLoading ? (
                <View style={styles.scoreBadgeWrap}>
                  <ActivityIndicator size="small" color={Colors.surface} />
                </View>
              ) : photoScoreResult ? (
                <View
                  style={[
                    styles.scoreBadgeWrap,
                    {
                      backgroundColor: scoreColor(photoScoreResult.photoScore),
                    },
                  ]}
                >
                  <Text style={styles.scoreBadgeText}>
                    {photoScoreResult.photoScore.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.photoMeta}>
              {photoExtractLoading && (
                <Text style={styles.photoStatusText}>
                  Extracting details...
                </Text>
              )}
              {!photoExtractLoading && photoExtractConfirm && (
                <Text style={styles.photoConfirmText}>
                  ✓ Details added to listing
                </Text>
              )}
              {photoScoreResult && (
                <>
                  <Text style={styles.photoVerdict}>
                    {photoScoreResult.verdict}
                  </Text>
                  {photoScoreResult.fix ? (
                    <View style={styles.photoFixRow}>
                      <Ionicons
                        name={
                          photoScoreResult.photoScore >= 7.0
                            ? "checkmark-circle-outline"
                            : "build-outline"
                        }
                        size={11}
                        color={
                          photoScoreResult.photoScore >= 7.0
                            ? Colors.teal
                            : Colors.scoreAmber
                        }
                      />
                      <Text
                        style={[
                          styles.photoFix,
                          photoScoreResult.photoScore < 7.0 && {
                            color: Colors.scoreAmber,
                          },
                        ]}
                      >
                        {photoScoreResult.fix}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
              <TouchableOpacity
                onPress={handleRemovePhoto}
                style={styles.photoRemoveBtn}
              >
                <Text style={styles.photoRemoveText}>Remove photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Photo Tips (collapsible) */}
        <TouchableOpacity
          style={styles.photoTipsToggle}
          onPress={() => {
            Haptics.selectionAsync();
            setPhotoTipsOpen((o) => !o);
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={Colors.teal}
          />
          <Text style={styles.photoTipsToggleText}>Photo guidance</Text>
          <Ionicons
            name={photoTipsOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
        {photoTipsOpen && (
          <View style={styles.photoTipsBody}>
            {Array.from(platforms).map((p) => {
              const entry = PLATFORM_PHOTO_TIPS[p];
              if (!entry) return null;
              return (
                <View key={p} style={styles.photoTipRow}>
                  <Text style={styles.photoTipPlatform}>
                    {PLATFORM_LABELS[p]}
                  </Text>
                  {entry.tips.map((tip, i) => (
                    <View key={i} style={styles.photoTipBulletRow}>
                      <Text style={styles.photoTipBullet}>{"•"}</Text>
                      <Text style={styles.photoTipText}>{tip}</Text>
                    </View>
                  ))}
                  <Text style={styles.photoTipAvoidLabel}>AVOID</Text>
                  {entry.avoid.map((tip, i) => (
                    <View key={i} style={styles.photoTipBulletRow}>
                      <Text style={styles.photoTipAvoidBullet}>{"✕"}</Text>
                      <Text style={styles.photoTipAvoidText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* Audience Targeting */}
        <View style={styles.targetingTitleRow}>
          <Text style={[styles.sectionLabel, { marginBottom: 1 }]}>
            Who are you writing for?
          </Text>
          <Text
            style={[
              styles.targetingOptional,
              { marginTop: -1, marginBottom: 8 },
            ]}
          >
            (optional — improves targeting)
          </Text>
        </View>
        <View style={styles.targetingBody}>
          <Text style={styles.subLabel}>Listing Price Range</Text>
          <ListingPriceSelector value={priceRange} onChange={setPriceRange} />
          <Text style={styles.subLabel}>Target Buyer</Text>
          <BuyerTypeSelector value={buyerTypes} onChange={setBuyerTypes} />
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            loading && styles.generateButtonDisabled,
          ]}
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
            <Text style={styles.generateButtonText}>
              {mode === "reel" ? "Generate Reel Script" : "Generate Copy"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {results && results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Generated Copy</Text>
            <Text style={styles.sectionSub}>
              Ready to copy and post for each platform
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabRow}
            >
              {results.map((post) => (
                <TouchableOpacity
                  key={post.platform}
                  style={[
                    styles.tab,
                    activeTab === post.platform && styles.tabActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(post.platform);
                  }}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === post.platform && styles.tabLabelActive,
                    ]}
                  >
                    {PLATFORM_LABELS[post.platform as Platform] ??
                      post.platform}
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
                        <Text style={styles.hashtagText}>
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.copyActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={async () => {
                      await Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      );

                      const textToCopy = [
                        activePost.generatedCopy,
                        activePost.hashtags
                          .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
                          .join(" "),
                      ]
                        .filter(Boolean)
                        .join("\n\n");

                      await Clipboard.setStringAsync(textToCopy);
                      posthog.capture("post_copied", {
                        platform: activePost.platform,
                      });
                      Alert.alert("Copied!", "Post copied to clipboard.");
                    }}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={15}
                      color={Colors.teal}
                    />
                    <Text style={styles.actionButtonText} numberOfLines={1}>
                      Copy
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openSchedule(activePost)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={Colors.teal}
                    />
                    <Text style={styles.actionButtonText} numberOfLines={1}>
                      Schedule
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Optimal posting times */}
            {activeTab && PLATFORM_OPTIMAL_TIMES[activeTab] && (
              <View style={styles.optimalTimesSection}>
                <Text style={styles.optimalTimesTitle}>Best Times to Post</Text>
                <Text style={styles.optimalTimesPlatform}>
                  {PLATFORM_LABELS[activeTab as Platform] ?? activeTab}
                </Text>
                <View style={styles.optimalTimePills}>
                  {PLATFORM_OPTIMAL_TIMES[activeTab].map((t, i) => (
                    <View key={i} style={styles.optimalTimePill}>
                      <Text style={styles.optimalTimePillText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Reel Script Results */}
        {mode === "reel" && reelResult && (
          <View style={styles.resultsSection}>
            <View style={styles.reelResultHeader}>
              <Text style={styles.sectionTitle}>Reel Script</Text>
              <View style={styles.reelDurationBadge}>
                <Text style={styles.reelDurationText}>
                  ~{reelResult.script.total_duration_seconds} sec
                </Text>
              </View>
            </View>

            {/* Hook */}
            <View style={styles.reelHookBlock}>
              <Text style={styles.reelHookLine}>
                {reelResult.script.hook_line}
              </Text>
              <Text style={styles.reelHookDirection}>
                {reelResult.script.hook_direction}
              </Text>
            </View>

            {/* Scenes */}
            {reelResult.script.scenes.map((scene) => {
              const isExpanded = expandedScenes.has(scene.scene_number);
              return (
                <TouchableOpacity
                  key={scene.scene_number}
                  style={styles.reelSceneCard}
                  onPress={() => {
                    Haptics.selectionAsync();
                    toggleScene(scene.scene_number);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.reelSceneHeader}>
                    <Text style={styles.reelSceneNumber}>
                      Scene {scene.scene_number}
                    </Text>
                    <View style={styles.reelDurationBadge}>
                      <Text style={styles.reelDurationText}>
                        {scene.duration_seconds}s
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reelSceneLocation}>{scene.location}</Text>
                  <Text style={styles.reelSceneShow}>{scene.what_to_show}</Text>
                  <Text style={styles.reelSceneSay}>{scene.what_to_say}</Text>
                  {isExpanded && (
                    <Text style={styles.reelSceneDelivery}>
                      {scene.delivery_note}
                    </Text>
                  )}
                  <View style={styles.reelSceneExpandRow}>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={13}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.reelSceneExpandText}>
                      {isExpanded ? "Hide delivery note" : "Show delivery note"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Close CTA */}
            <View style={styles.reelCtaBlock}>
              <Text style={styles.reelCtaLabel}>CLOSE CTA</Text>
              <Text style={styles.reelCtaLine}>
                {reelResult.script.close_cta}
              </Text>
            </View>

            {/* Caption */}
            <View style={styles.reelCaptionBlock}>
              <View style={styles.reelCaptionHeader}>
                <Text style={styles.reelCaptionPlatform}>
                  {PLATFORM_LABELS[reelResult.post.platform as Platform] ??
                    reelResult.post.platform}{" "}
                  Caption
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(reelResult.script.caption);
                    Alert.alert("Copied!", "Caption copied to clipboard.");
                  }}
                >
                  <Ionicons name="copy-outline" size={15} color={Colors.teal} />
                </TouchableOpacity>
              </View>
              <Text style={styles.reelCaptionText}>
                {reelResult.script.caption}
              </Text>
            </View>

            {/* Hashtags */}
            <TouchableOpacity
              style={styles.hashtagRow}
              onPress={async () => {
                const tags = reelResult.script.hashtags
                  .map((t) => (t.startsWith("#") ? t : `#${t}`))
                  .join(" ");
                await Clipboard.setStringAsync(tags);
                Alert.alert("Copied!", "Hashtags copied to clipboard.");
              }}
              activeOpacity={0.7}
            >
              {reelResult.script.hashtags.map((tag, i) => (
                <View key={i} style={styles.hashtagPill}>
                  <Text style={styles.hashtagText}>
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>

            {/* TikTok repurpose hook */}
            {reelResult.script.tiktok_repurpose_hook && (
              <View style={styles.reelTikTokBlock}>
                <Text style={styles.reelTikTokLabel}>
                  TIKTOK REPURPOSE HOOK
                </Text>
                <Text style={styles.reelTikTokLine}>
                  {reelResult.script.tiktok_repurpose_hook}
                </Text>
              </View>
            )}

            {/* Reel posting strategy */}
            {REEL_POSTING_STRATEGY[reelResult.post.platform] &&
              (() => {
                const s = REEL_POSTING_STRATEGY[reelResult.post.platform];
                return (
                  <View style={styles.optimalTimesSection}>
                    <Text style={styles.optimalTimesTitle}>
                      Best Times to Post
                    </Text>
                    <Text style={styles.optimalTimesPlatform}>
                      {(PLATFORM_LABELS[reelResult.post.platform as Platform] ??
                        reelResult.post.platform) + " Reels"}
                    </Text>
                    <View style={styles.optimalTimePills}>
                      {s.times.map((t, i) => (
                        <View key={i} style={styles.optimalTimePill}>
                          <Text style={styles.optimalTimePillText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.reelFrequencyRow}>
                      <Ionicons
                        name="repeat-outline"
                        size={14}
                        color={Colors.teal}
                      />
                      <Text style={styles.reelFrequencyBold}>
                        {s.frequency}
                      </Text>
                      <Text style={styles.reelFrequencyNote}>
                        {" "}
                        · {s.cadence}
                      </Text>
                    </View>
                  </View>
                );
              })()}

            {/* Bottom actions */}
            <View style={styles.copyActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleCopyFullScript}
              >
                <Ionicons name="copy-outline" size={15} color={Colors.teal} />
                <Text style={styles.actionButtonText} numberOfLines={1}>
                  Copy full script
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openSchedule(reelResult.post)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={Colors.teal}
                />
                <Text style={styles.actionButtonText} numberOfLines={1}>
                  Add to calendar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>Recent Generations</Text>
            {history.map((post) => {
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
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={styles.historyPlatform}>
                        {(PLATFORM_LABELS[post.platform as Platform] ??
                          post.platform) +
                          (post.isReelScript ? " — Reel" : " — Post")}
                      </Text>
                    </View>
                    <View style={styles.historyMetaRight}>
                      <Text style={styles.historyDate}>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </Text>
                      <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={Colors.textSecondary}
                      />
                    </View>
                  </View>
                  <Text
                    style={styles.historyPreview}
                    numberOfLines={expanded ? undefined : 2}
                  >
                    {post.isReelScript
                      ? (() => {
                          try {
                            const s = JSON.parse(post.generatedCopy);
                            return `Hook: ${s.hook_line ?? ""}`;
                          } catch {
                            return post.generatedCopy;
                          }
                        })()
                      : post.generatedCopy}
                  </Text>
                  {expanded && post.hashtags.length > 0 && (
                    <View style={styles.hashtagRow}>
                      {post.hashtags.map((tag, i) => (
                        <View key={i} style={styles.hashtagPill}>
                          <Text style={styles.hashtagText}>
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {expanded && (
                    <TouchableOpacity
                      style={styles.historyClipboard}
                      onPress={async () => {
                        await Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Light,
                        );

                        const textToCopy = [
                          post.generatedCopy,
                          post.hashtags
                            .map((tag) =>
                              tag.startsWith("#") ? tag : `#${tag}`,
                            )
                            .join(" "),
                        ]
                          .filter(Boolean)
                          .join("\n\n");

                        await Clipboard.setStringAsync(textToCopy);

                        Alert.alert("Copied!", "Post copied to clipboard.");
                      }}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={14}
                        color={Colors.teal}
                      />
                      <Text style={styles.historyClipboardText}>Copy</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Schedule modal */}
      <Modal visible={!!schedulePost} transparent animationType="slide">
        <View style={styles.schedOverlay}>
          <TouchableOpacity
            style={styles.schedOverlayBg}
            onPress={() => setSchedulePost(null)}
          />
          <View style={styles.schedSheet}>
            <View style={styles.schedHandle} />
            <View style={styles.schedHeader}>
              <Text style={styles.schedTitle}>Schedule Post</Text>
              <TouchableOpacity onPress={() => setSchedulePost(null)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.schedPlatform}>
              {schedulePost
                ? (PLATFORM_LABELS[schedulePost.platform as Platform] ??
                  schedulePost.platform)
                : ""}
            </Text>

            <Text style={styles.schedFieldLabel}>Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.schedPillRow}
            >
              {buildDatePills().map(({ label, offset }) => (
                <TouchableOpacity
                  key={offset}
                  style={[
                    styles.schedPill,
                    scheduleDate === offset && styles.schedPillActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setScheduleDate(offset);
                  }}
                >
                  <Text
                    style={[
                      styles.schedPillLabel,
                      scheduleDate === offset && styles.schedPillLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.schedFieldLabel}>Time</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.schedPillRow}
            >
              {SCHEDULE_TIME_PRESETS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.schedPill,
                    scheduleTime === t && styles.schedPillActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setScheduleTime(t);
                  }}
                >
                  <Text
                    style={[
                      styles.schedPillLabel,
                      scheduleTime === t && styles.schedPillLabelActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.schedFieldLabel}>
              Note <Text style={styles.schedOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.schedNoteInput}
              placeholder="e.g. Open house promo"
              placeholderTextColor={Colors.textSecondary}
              value={scheduleNote}
              onChangeText={setScheduleNote}
              maxLength={200}
            />

            <TouchableOpacity
              style={[styles.schedSaveBtn, scheduling && { opacity: 0.7 }]}
              onPress={handleSchedulePost}
              disabled={scheduling}
              activeOpacity={0.85}
            >
              {scheduling ? (
                <ActivityIndicator color={Colors.surface} size="small" />
              ) : (
                <Text style={styles.schedSaveBtnText}>Add to Calendar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  heading: {
    fontSize: FontSize["2xl"],
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
    fontWeight: "400",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  platformPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  platformPillSelected: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
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
    textAlign: "right",
    marginBottom: 24,
  },

  // Generate button
  generateButton: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 32,
  },
  generateButtonDisabled: { opacity: 0.7 },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  hashtagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
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
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  actionButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
  },

  // Get Score info toggle
  scoreInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 4,
  },

  // Get Score button
  scoreButton: {
    backgroundColor: Colors.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  scoreButtonDisabled: { opacity: 0.6 },
  scoreButtonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },

  // Audience targeting
  targetingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    marginBottom: 4,
  },
  targetingTitleRow: {
    flexDirection: "column",
    alignItems: "flex-start",

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
    marginTop: -4,
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

  // Photo zone (no photo)
  photoZone: {
    borderWidth: 1.5,
    borderColor: Colors.teal,
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: Colors.teal + "08",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 6,
    marginBottom: 24,
    opacity: 0.5,
  },
  photoZoneLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  photoZoneHint: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },

  // Photo row (photo selected)
  photoRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  photoThumbWrap: {
    position: "relative",
    width: 90,
    height: 68,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
  },
  photoThumb: { width: "100%", height: "100%" },
  scoreBadgeWrap: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: Colors.navy,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: "center",
  },
  scoreBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  photoMeta: { flex: 1, gap: 4 },
  photoStatusText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  photoConfirmText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  photoVerdict: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  photoFix: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  photoRemoveBtn: { marginTop: 4, alignSelf: "flex-start" },
  photoRemoveText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.error,
  },

  // Photo guidance callout in results
  photoGuidanceWrap: { marginTop: 14 },

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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  historyMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyClipboard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
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

  // Mode toggle
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 20,
  },
  modeBtnActive: {
    backgroundColor: Colors.navy,
  },
  modeBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  modeBtnTextActive: {
    color: Colors.surface,
  },

  // Reel results
  reelResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  reelDurationBadge: {
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  reelDurationText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.surface,
  },
  reelHookBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reelHookLine: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.serif,
    color: Colors.textPrimary,
    lineHeight: 26,
    marginBottom: 6,
  },
  reelHookDirection: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reelSceneCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  reelSceneHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reelSceneNumber: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reelSceneLocation: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reelSceneShow: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: "italic",
  },
  reelSceneSay: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  reelSceneDelivery: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: "italic",
    paddingTop: 2,
  },
  reelSceneExpandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  reelSceneExpandText: {
    fontSize: 11,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
  },
  reelCtaBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  reelCtaLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reelCtaLine: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  reelCaptionBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  reelCaptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reelCaptionPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reelCaptionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  reelTikTokBlock: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  reelTikTokLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reelTikTokLine: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  reelFrequencyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 4,
  },
  reelFrequencyBold: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  reelFrequencyNote: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    flex: 1,
  },
  reelBadge: {
    backgroundColor: Colors.teal,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reelBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Schedule modal
  schedOverlay: { flex: 1, justifyContent: "flex-end" },
  schedOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  schedSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  schedHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  schedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  schedTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
  },
  schedPlatform: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  schedFieldLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  schedOptional: {
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    fontWeight: "400" as const,
  },
  schedPillRow: { marginTop: 6, marginBottom: 4 },
  schedPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.offWhite,
    marginRight: 8,
  },
  schedPillActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  schedPillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  schedPillLabelActive: { color: Colors.surface },
  schedNoteInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: FontSize.base,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    marginTop: 6,
    marginBottom: 16,
  },
  schedSaveBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  schedSaveBtnText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },

  // Photo tips collapsible
  photoTipsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },
  photoTipsToggleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.teal,
    flex: 1,
  },
  photoTipsBody: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  photoTipRow: { gap: 3 },
  photoTipBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  photoTipBullet: {
    fontSize: FontSize.sm,
    color: Colors.teal,
    lineHeight: 18,
  },
  photoTipPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  photoTipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 18,
    flex: 1,
  },
  photoTipAvoidLabel: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.error,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 2,
  },
  photoTipAvoidBullet: {
    fontSize: 10,
    color: Colors.error,
    lineHeight: 18,
    width: 12,
  },
  photoTipAvoidText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  photoFixRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 2,
  },

  // Optimal posting times
  optimalTimesSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginTop: 12,
  },
  optimalTimesTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
    marginBottom: 8,
  },
  optimalTimesPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optimalTimePills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optimalTimePill: {
    backgroundColor: Colors.offWhite,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optimalTimePillText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.mono,
    color: Colors.navy,
  },
});
