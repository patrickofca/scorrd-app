import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "../../services/api";
import { posthog } from "../../services/analytics";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";
import {
  PLATFORMS,
  PLATFORM_LABELS,
  Platform,
  PLATFORM_OPTIMAL_TIMES,
} from "../../constants/config";
import type { CalendarItem } from "../../types";

const DOT_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  twitter: "#000000",
  tiktok: "#69C9D0",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];
const TIME_PRESETS = [
  "7 AM",
  "8 AM",
  "9 AM",
  "12 PM",
  "3 PM",
  "5 PM",
  "6 PM",
  "8 PM",
];

const STATUS_COLORS = {
  scheduled: Colors.teal,
  published: "#16A34A",
  skipped: Colors.textSecondary,
} as const;
const STATUS_LABELS = {
  scheduled: "Scheduled",
  published: "Published",
  skipped: "Skipped",
} as const;

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function toRows(arr: (number | null)[]): (number | null)[][] {
  const rows: (number | null)[][] = [];
  for (let i = 0; i < arr.length; i += 7) rows.push(arr.slice(i, i + 7));
  return rows;
}

function timeToPreset(iso: string): string {
  const h = new Date(iso).getHours();
  const hours = [7, 8, 9, 12, 15, 17, 18, 20];
  const idx = hours.reduce(
    (b, c, i) => (Math.abs(c - h) < Math.abs(hours[b] - h) ? i : b),
    0,
  );
  return TIME_PRESETS[idx];
}

function buildISO(
  year: number,
  month: number,
  day: number,
  preset: string,
): string {
  const [num, period] = preset.split(" ");
  let hour = parseInt(num, 10);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return new Date(year, month, day, hour, 0, 0, 0).toISOString();
}

export default function CalendarScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [addVisible, setAddVisible] = useState(false);
  const [addDay, setAddDay] = useState(today.getDate());
  const [addPlatform, setAddPlatform] = useState<Platform>("instagram");
  const [addTime, setAddTime] = useState("9 AM");
  const [addNote, setAddNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<CalendarItem | null>(null);
  const [editTime, setEditTime] = useState("9 AM");
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState<
    "scheduled" | "published" | "skipped"
  >("scheduled");
  const [updating, setUpdating] = useState(false);

  const router = useRouter();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [monthKey]),
  );

  async function fetchItems() {
    setLoading(true);
    try {
      const data = await api.calendar.list(monthKey);
      setItems(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    Haptics.selectionAsync();
    setSelectedDay(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    Haptics.selectionAsync();
    setSelectedDay(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  function openAdd(day: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddDay(day);
    setAddPlatform("instagram");
    setAddTime("9 AM");
    setAddNote("");
    setAddVisible(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.calendar.create({
        platform: addPlatform,
        scheduled_at: buildISO(year, month, addDay, addTime),
        ...(addNote.trim() ? { note: addNote.trim() } : {}),
      });
      posthog.capture("calendar_item_scheduled", { platform: addPlatform });
      await fetchItems();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddVisible(false);
    } catch {
    } finally {
      setSaving(false);
    }
  }

  function openEdit(item: CalendarItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditItem(item);
    setEditTime(timeToPreset(item.scheduledAt));
    setEditNote(item.note ?? "");
    setEditStatus(item.status);
  }

  async function handleUpdate() {
    if (!editItem) return;
    setUpdating(true);
    try {
      const dt = new Date(editItem.scheduledAt);
      const scheduled_at = buildISO(
        dt.getFullYear(),
        dt.getMonth(),
        dt.getDate(),
        editTime,
      );
      await api.calendar.update(editItem.id, {
        scheduled_at,
        status: editStatus,
        note: editNote.trim(),
      });
      await fetchItems();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditItem(null);
    } catch {
    } finally {
      setUpdating(false);
    }
  }

  function handleDelete(id: string) {
    Alert.alert("Remove", "Remove this scheduled post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.calendar.remove(id);
            setItems((prev) => prev.filter((i) => i.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
        },
      },
    ]);
  }

  const dayMap = new Map<number, CalendarItem[]>();
  items.forEach((item) => {
    const d = new Date(item.scheduledAt).getDate();
    if (!dayMap.has(d)) dayMap.set(d, []);
    dayMap.get(d)!.push(item);
  });

  const displayItems = selectedDay
    ? (dayMap.get(selectedDay) ?? [])
    : [...items].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );

  const todayNum =
    today.getMonth() === month && today.getFullYear() === year
      ? today.getDate()
      : -1;

  const rows = toRows(buildGrid(year, month));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Posting Calendar</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={prevMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.navy} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={nextMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={22} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.weekRow}>
          {DAY_HEADERS.map((d, i) => (
            <Text key={i} style={styles.weekLabel}>
              {d}
            </Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((day, ci) => {
                const dots = day ? (dayMap.get(day) ?? []) : [];
                const isToday = day === todayNum;
                const isSelected = day === selectedDay;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={styles.cell}
                    onPress={() => {
                      if (!day) return;
                      Haptics.selectionAsync();
                      setSelectedDay(day === selectedDay ? null : day);
                    }}
                    disabled={!day}
                    activeOpacity={0.7}
                  >
                    {day ? (
                      <>
                        <View
                          style={[
                            styles.dayCircle,
                            isSelected && styles.dayCircleSelected,
                            isToday && !isSelected && styles.dayCircleToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNum,
                              isSelected && styles.dayNumSelected,
                              isToday && !isSelected && styles.dayNumToday,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                        <View style={styles.dotRow}>
                          {dots.slice(0, 3).map((item, di) => (
                            <View
                              key={di}
                              style={[
                                styles.dot,
                                {
                                  backgroundColor:
                                    DOT_COLORS[item.platform] ?? Colors.teal,
                                },
                              ]}
                            />
                          ))}
                        </View>
                      </>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Scheduled list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDay
              ? `${MONTH_NAMES[month]} ${selectedDay}`
              : "All Scheduled"}
          </Text>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.teal} />
            </View>
          ) : displayItems.length === 0 ? (
            <Text style={styles.emptyText}>
              {selectedDay
                ? "Nothing scheduled — tap + to add."
                : "No posts scheduled this month."}
            </Text>
          ) : (
            displayItems.map((item) => (
              <CalendarCard
                key={item.id}
                item={item}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => openAdd(selectedDay ?? today.getDate())}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.surface} />
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={addVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayBg}
            onPress={() => setAddVisible(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Schedule Post</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetDate}>
              {MONTH_NAMES[month]} {addDay}, {year}
            </Text>

            <Text style={styles.fieldLabel}>Platform</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillRow}
            >
              {PLATFORMS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pill, addPlatform === p && styles.pillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAddPlatform(p);
                  }}
                >
                  <Text
                    style={[
                      styles.pillLabel,
                      addPlatform === p && styles.pillLabelActive,
                    ]}
                  >
                    {PLATFORM_LABELS[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Time</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillRow}
            >
              {TIME_PRESETS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, addTime === t && styles.pillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAddTime(t);
                  }}
                >
                  <Text
                    style={[
                      styles.pillLabel,
                      addTime === t && styles.pillLabelActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>
              Note <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="e.g. Open house promo"
              placeholderTextColor={Colors.textSecondary}
              value={addNote}
              onChangeText={setAddNote}
              maxLength={200}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={Colors.surface} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Schedule</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit modal */}
      <Modal visible={!!editItem} transparent animationType="slide">
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayBg}
            onPress={() => setEditItem(null)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Scheduled Post</Text>
              <TouchableOpacity onPress={() => setEditItem(null)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Time</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillRow}
            >
              {TIME_PRESETS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pill, editTime === t && styles.pillActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEditTime(t);
                  }}
                >
                  <Text
                    style={[
                      styles.pillLabel,
                      editTime === t && styles.pillLabelActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.statusRow}>
              {(["scheduled", "published", "skipped"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.pill,
                    editStatus === s && {
                      backgroundColor: STATUS_COLORS[s],
                      borderColor: STATUS_COLORS[s],
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEditStatus(s);
                  }}
                >
                  <Text
                    style={[
                      styles.pillLabel,
                      editStatus === s && styles.pillLabelActive,
                    ]}
                  >
                    {STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              Note <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note..."
              placeholderTextColor={Colors.textSecondary}
              value={editNote}
              onChangeText={setEditNote}
              maxLength={200}
            />

            {editItem?.generatedPost && (
              <TouchableOpacity
                style={styles.viewPostBtn}
                onPress={() => {
                  setEditItem(null);
                  router.push({
                    pathname: "/(tabs)/generate",
                    params: { postId: editItem.generatedPost!.id },
                  });
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={15} color={Colors.teal} />
                <Text style={styles.viewPostBtnText}>Take me to this post</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, updating && styles.saveBtnDisabled]}
              onPress={handleUpdate}
              disabled={updating}
              activeOpacity={0.85}
            >
              {updating ? (
                <ActivityIndicator color={Colors.surface} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CalendarCard({
  item,
  onEdit,
  onDelete,
}: {
  item: CalendarItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dt = new Date(item.scheduledAt);
  const timeStr = dt.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = dt.toLocaleDateString([], { month: "short", day: "numeric" });
  const accentColor = DOT_COLORS[item.platform] ?? Colors.teal;
  const statusColor = STATUS_COLORS[item.status] ?? Colors.textSecondary;
  const optimalTimes = PLATFORM_OPTIMAL_TIMES[item.platform] ?? [];

  return (
    <TouchableOpacity style={styles.card} onPress={onEdit} activeOpacity={0.8}>
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardPlatform, { color: accentColor }]}>
            {item.platform.toUpperCase()}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "18" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] ?? item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTime}>
          {dateStr} · {timeStr}
        </Text>
        {optimalTimes.length > 0 && (
          <Text style={styles.cardOptimalTimes}>
            Best: {optimalTimes.join(" · ")}
          </Text>
        )}
        {item.note ? (
          <Text style={styles.cardNote} numberOfLines={2}>
            {item.note}
          </Text>
        ) : null}
        {item.generatedPost ? (
          <Text style={styles.cardPreview} numberOfLines={1}>
            {item.generatedPost.generatedCopy}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.offWhite },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  heading: {
    fontSize: FontSize["2xl"],
    fontFamily: FontFamily.serif,
    color: Colors.navy,
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthLabel: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
  },

  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },

  grid: { marginBottom: 28 },
  gridRow: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", paddingVertical: 4, minHeight: 52 },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: Colors.teal },
  dayCircleToday: { borderWidth: 1.5, borderColor: Colors.teal },
  dayNum: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
  },
  dayNumSelected: {
    color: Colors.surface,
    fontFamily: FontFamily.sansSemibold,
  },
  dayNumToday: { color: Colors.teal, fontFamily: FontFamily.sansSemibold },
  dotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 6,
    alignItems: "center",
  },
  dot: { width: 5, height: 5, borderRadius: 3 },

  section: { gap: 10 },
  sectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.serif,
    color: Colors.navy,
    marginBottom: 4,
  },
  center: { paddingVertical: 24, alignItems: "center" },
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 16,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  cardAccent: { width: 4, alignSelf: "stretch" },
  cardBody: { flex: 1, padding: 12 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardPlatform: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sansSemibold,
    letterSpacing: 0.5,
  },
  cardTime: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.mono,
    color: Colors.textSecondary,
  },
  cardOptimalTimes: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.teal,
    marginTop: 2,
    lineHeight: 15,
  },
  cardNote: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  cardPreview: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: FontSize.xs, fontFamily: FontFamily.sansMedium },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  deleteBtn: { paddingRight: 12 },

  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  overlay: { flex: 1, justifyContent: "flex-end" },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.navy,
  },
  sheetDate: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  optional: {
    fontFamily: FontFamily.sans,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  pillRow: { marginTop: 6, marginBottom: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.offWhite,
    marginRight: 8,
  },
  pillActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  pillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.sansMedium,
    color: Colors.textSecondary,
  },
  pillLabelActive: { color: Colors.surface },
  noteInput: {
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
  viewPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.teal,
    marginBottom: 8,
  },
  viewPostBtnText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  saveBtn: {
    backgroundColor: Colors.teal,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.surface,
  },
});
