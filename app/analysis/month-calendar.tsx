import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "../../services/api";
import { posthog } from "../../services/analytics";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import { PLATFORM_LABELS, CONTENT_TYPE_LABELS, Platform, ContentType } from "../../constants/config";
import type { CalendarDaySuggestion } from "../../types";

function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[styles.skeletonCard, { opacity }]} />;
}

const SCHEDULE_TIME_PRESETS = [
  "7 AM","8 AM","9 AM","10 AM","11 AM","12 PM",
  "1 PM","2 PM","3 PM","4 PM","5 PM","6 PM","7 PM","8 PM",
];
const SCHEDULE_DATE_COUNT = 14;

function buildDatePills() {
  return Array.from({ length: SCHEDULE_DATE_COUNT }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label =
      i === 0 ? "Today"
      : i === 1 ? "Tomorrow"
      : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return { label, offset: i };
  });
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function MonthCalendarScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId: string }>();
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<CalendarDaySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [scheduled, setScheduled] = useState<Set<number>>(new Set());

  const [scheduleItem, setScheduleItem] = useState<CalendarDaySuggestion | null>(null);
  const [scheduleDate, setScheduleDate] = useState(1);
  const [scheduleTime, setScheduleTime] = useState("9 AM");
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // Fetch on mount via useCallback + ref pattern (no React Query — one-shot generation)
  const fetchSuggestions = useCallback(async () => {
    if (!analysisId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await api.calendar.generateMonth(analysisId);
      setSuggestions(res.suggestions);
      posthog.capture("calendar_month_generated", {
        analysis_id: analysisId,
        suggestion_count: res.suggestions.length,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => { fetchSuggestions(); }, []);

  function openSchedule(item: CalendarDaySuggestion) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScheduleItem(item);
    setScheduleDate(1);
    setScheduleTime(item.suggested_time ?? "9 AM");
    setScheduleNote("");
  }

  async function handleSchedule() {
    if (!scheduleItem) return;
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
        platform: scheduleItem.platform,
        scheduled_at,
        ...(scheduleNote.trim() ? { note: scheduleNote.trim() } : {}),
      });

      posthog.capture("calendar_item_scheduled", { platform: scheduleItem.platform });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScheduled((prev) => new Set(prev).add(scheduleItem.day));
      setScheduleItem(null);

      const d = new Date();
      d.setDate(d.getDate() + scheduleDate);
      const dateLabel =
        scheduleDate === 0 ? "today"
        : scheduleDate === 1 ? "tomorrow"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      Alert.alert("Scheduled!", `Added to your calendar for ${dateLabel} at ${scheduleTime}.`);
    } catch {
      Alert.alert("Failed", "Could not schedule this post. Please try again.");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>30-Day Calendar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Content Plan</Text>
        <Text style={styles.subheading}>
          AI-curated posts for the next 30 days based on your analysis. Tap any
          day to schedule it.
        </Text>

        {/* Loading state */}
        {loading && (
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        )}

        {/* Error state */}
        {!loading && error && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={Colors.textSecondary} />
            <Text style={styles.errorText}>
              Could not generate your calendar. Please try again.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchSuggestions}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Suggestions */}
        {!loading && !error && suggestions.map((item) => {
          const done = scheduled.has(item.day);
          return (
            <View key={item.day} style={[styles.dayCard, done && styles.dayCardDone]}>
              <View style={styles.dayCardLeft}>
                <View style={[styles.dayBadge, done && styles.dayBadgeDone]}>
                  {done
                    ? <Ionicons name="checkmark" size={14} color={Colors.surface} />
                    : <Text style={styles.dayBadgeText}>{item.day}</Text>
                  }
                </View>
              </View>
              <View style={styles.dayCardBody}>
                <Text style={styles.dayDate}>{dayLabel(item.date)}</Text>
                <View style={styles.dayMeta}>
                  <View style={styles.platformPill}>
                    <Text style={styles.platformPillText}>
                      {PLATFORM_LABELS[item.platform as Platform] ?? item.platform}
                    </Text>
                  </View>
                  <Text style={styles.contentType}>
                    {CONTENT_TYPE_LABELS[item.content_type as ContentType] ?? item.content_type}
                  </Text>
                </View>
                <Text style={styles.dayHook} numberOfLines={2}>{item.hook}</Text>
                <Text style={styles.dayTopic} numberOfLines={1}>{item.topic}</Text>
              </View>
              <TouchableOpacity
                style={[styles.scheduleBtn, done && styles.scheduleBtnDone]}
                onPress={() => !done && openSchedule(item)}
                disabled={done}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={done ? "checkmark-circle" : "calendar-outline"}
                  size={18}
                  color={done ? Colors.scoreGreen : Colors.teal}
                />
              </TouchableOpacity>
            </View>
          );
        })}

        {!loading && !error && suggestions.length > 0 && (
          <Text style={styles.footer}>
            {scheduled.size} of {suggestions.length} days scheduled
          </Text>
        )}
      </ScrollView>

      {/* Schedule modal */}
      <Modal visible={!!scheduleItem} transparent animationType="slide">
        <View style={styles.schedOverlay}>
          <TouchableOpacity
            style={styles.schedOverlayBg}
            onPress={() => setScheduleItem(null)}
          />
          <View style={styles.schedSheet}>
            <View style={styles.schedHandle} />
            <View style={styles.schedHeader}>
              <Text style={styles.schedTitle}>Schedule Post</Text>
              <TouchableOpacity onPress={() => setScheduleItem(null)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {scheduleItem && (
              <Text style={styles.schedPlatform}>
                {PLATFORM_LABELS[scheduleItem.platform as Platform] ?? scheduleItem.platform}
                {" · Day "}{scheduleItem.day}
              </Text>
            )}

            <Text style={styles.schedFieldLabel}>Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.schedPillRow}
            >
              {buildDatePills().map(({ label, offset }) => (
                <TouchableOpacity
                  key={offset}
                  style={[styles.schedPill, scheduleDate === offset && styles.schedPillActive]}
                  onPress={() => { Haptics.selectionAsync(); setScheduleDate(offset); }}
                >
                  <Text style={[styles.schedPillLabel, scheduleDate === offset && styles.schedPillLabelActive]}>
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
                  style={[styles.schedPill, scheduleTime === t && styles.schedPillActive]}
                  onPress={() => { Haptics.selectionAsync(); setScheduleTime(t); }}
                >
                  <Text style={[styles.schedPillLabel, scheduleTime === t && styles.schedPillLabelActive]}>
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
              onPress={handleSchedule}
              disabled={scheduling}
              activeOpacity={0.85}
            >
              {scheduling
                ? <ActivityIndicator color={Colors.surface} size="small" />
                : <Text style={styles.schedSaveBtnText}>Add to Calendar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
  },
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
    lineHeight: 20,
    marginBottom: 24,
  },

  // Skeleton
  skeletonWrap: { gap: 10 },
  skeletonCard: {
    height: 110,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },

  // Error
  errorWrap: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.navy,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },

  // Day cards
  dayCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  dayCardDone: {
    borderColor: Colors.scoreGreen,
    opacity: 0.75,
  },
  dayCardLeft: { alignItems: "center", paddingTop: 2 },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeDone: { backgroundColor: Colors.scoreGreen },
  dayBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  dayCardBody: { flex: 1, gap: 4 },
  dayDate: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dayMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  platformPill: {
    backgroundColor: Colors.navy,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  platformPillText: {
    fontSize: 10,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
  contentType: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  dayHook: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  dayTopic: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontStyle: "italic",
  },
  scheduleBtn: {
    padding: 4,
    marginTop: 2,
  },
  scheduleBtnDone: { opacity: 0.6 },

  // Footer
  footer: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
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
});
