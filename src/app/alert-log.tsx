import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import type { StreamerAlertEvent } from '@/types';

const eventPresentation = {
  live_started: { label: '방송 시작', icon: { ios: 'play.fill' as const, android: 'play_arrow' as const } },
  live_ended: { label: '방송 종료', icon: { ios: 'stop.fill' as const, android: 'stop' as const } },
  title_changed: { label: '방제 변경', icon: { ios: 'textformat' as const, android: 'title' as const } },
  category_changed: { label: '카테고리 변경', icon: { ios: 'tag.fill' as const, android: 'sell' as const } },
};

function timeLabel(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function dayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dayLabel(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(timestamp));
}

function shortDateTimeLabel(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

type BroadcastSession = {
  key: string;
  items: StreamerAlertEvent[];
  startedAt: number;
  endedAt: number | null;
};

function groupByBroadcast(events: StreamerAlertEvent[]): BroadcastSession[] {
  const ascending = [...events].sort((a, b) => a.occurredAt - b.occurredAt);
  const sessions: BroadcastSession[] = [];
  let active: BroadcastSession | null = null;

  for (const event of ascending) {
    if (event.eventType === 'live_started') {
      if (active) sessions.push(active);
      active = { key: `broadcast-${event.id}`, items: [event], startedAt: event.occurredAt, endedAt: null };
      continue;
    }

    if (!active) {
      sessions.push({
        key: `event-${event.id}`,
        items: [event],
        startedAt: event.occurredAt,
        endedAt: event.eventType === 'live_ended' ? event.occurredAt : null,
      });
      continue;
    }

    active.items.push(event);
    if (event.eventType === 'live_ended') {
      active.endedAt = event.occurredAt;
      sessions.push(active);
      active = null;
    }
  }

  if (active) sessions.push(active);
  return sessions.sort((a, b) => b.items[b.items.length - 1]!.occurredAt - a.items[a.items.length - 1]!.occurredAt);
}

function sessionLabel(session: BroadcastSession) {
  const start = `${dayLabel(session.startedAt)} · ${timeLabel(session.startedAt)}`;
  if (!session.endedAt) return session.items[0]?.eventType === 'live_started' ? `${start}–방송 중` : start;
  const end = dayKey(session.startedAt) === dayKey(session.endedAt)
    ? timeLabel(session.endedAt)
    : shortDateTimeLabel(session.endedAt);
  return `${start}–${end}`;
}

export default function AlertLogSheet() {
  const { channelId } = useLocalSearchParams<{ channelId?: string }>();
  const store = useAlertStore();
  const streamer = store.streamers.find((item) => item.channelId === channelId);
  const [events, setEvents] = useState<StreamerAlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    setFailed(false);
    try {
      const result = await api.streamerAlertEvents(channelId);
      setEvents(result.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;
    const controller = new AbortController();
    api.streamerAlertEvents(channelId, controller.signal)
      .then((result) => setEvents(result.data))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [channelId]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => b.occurredAt - a.occurredAt),
    [events],
  );
  const eventGroups = useMemo(() => groupByBroadcast(events), [events]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>알림 기록</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{streamer?.channelName ?? '스트리머'} · 최신순</Text>
        </View>
        <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.closeButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close' }} size={15} tintColor={palette.textSecondary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={palette.accent} />}>
        <Text style={styles.description}>방송 시작부터 종료까지 한 묶음으로 표시합니다.</Text>
        <View style={styles.groups}>
          {eventGroups.map((group) => (
            <View key={group.key} style={styles.dateGroup}>
              <Text style={styles.dayLabel}>{sessionLabel(group)}</Text>
              <View style={styles.list}>
                {[...group.items].sort((a, b) => b.occurredAt - a.occurredAt).map((event) => {
                  const presentation = eventPresentation[event.eventType];
                  return (
                    <View key={event.id} style={styles.row}>
                      <View style={styles.icon}>
                        <SymbolView name={presentation.icon} size={15} tintColor={palette.accent} />
                      </View>
                      <View style={styles.rowBody}>
                        <View style={styles.rowHeading}>
                          <View style={styles.eventHeading}>
                            <Text style={styles.eventLabel}>{presentation.label}</Text>
                            {event.eventType === 'live_started' && !!event.category && (
                              <Text numberOfLines={1} style={styles.startCategory}>{event.category}</Text>
                            )}
                          </View>
                          <Text style={styles.date}>
                            {dayKey(event.occurredAt) === dayKey(group.startedAt)
                              ? timeLabel(event.occurredAt)
                              : shortDateTimeLabel(event.occurredAt)}
                          </Text>
                        </View>
                        {event.eventType === 'live_started' && (
                          <Text numberOfLines={2} style={styles.value}>{event.newValue ?? event.broadcastTitle}</Text>
                        )}
                        {event.eventType === 'live_ended' && (
                          <Text numberOfLines={2} style={styles.value}>{event.previousValue ?? event.broadcastTitle}</Text>
                        )}
                        {(event.eventType === 'title_changed' || event.eventType === 'category_changed') && (
                          <View style={styles.changeValues}>
                            <Text numberOfLines={1} style={styles.previous}>{event.previousValue ?? '정보 없음'}</Text>
                            <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward' }} size={10} tintColor={palette.textMuted} />
                            <Text numberOfLines={1} style={styles.current}>{event.newValue ?? '정보 없음'}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          {!loading && !failed && !sortedEvents.length && (
            <Text style={styles.empty}>아직 감지된 방송 변경 기록이 없습니다.</Text>
          )}
          {!loading && failed && (
            <Pressable onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>기록을 불러오지 못했습니다 · 다시 시도</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 40, paddingBottom: 14 },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: palette.text, fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  subtitle: { marginTop: 2, color: palette.textSecondary, fontSize: 12 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  content: { paddingHorizontal: 18, paddingBottom: 88 },
  description: { marginBottom: 10, color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
  groups: { gap: 24 },
  dateGroup: { gap: 9 },
  dayLabel: { marginLeft: 3, color: palette.textSecondary, fontSize: 12, fontWeight: '800' },
  list: { overflow: 'hidden', backgroundColor: palette.background, borderRadius: radius.card },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  rowBody: { flex: 1, minWidth: 0, gap: 7 },
  rowHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventHeading: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  eventLabel: { color: palette.text, fontSize: 14, fontWeight: '800' },
  startCategory: { flexShrink: 1, color: palette.textSecondary, fontSize: 10, fontWeight: '700' },
  date: { color: palette.textMuted, fontSize: 10 },
  value: { color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
  changeValues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previous: { maxWidth: '40%', color: palette.textMuted, fontSize: 11 },
  current: { flex: 1, color: palette.textSecondary, fontSize: 12, fontWeight: '700' },
  empty: { padding: 28, color: palette.textMuted, textAlign: 'center', fontSize: 13 },
  retry: { padding: 24 },
  retryText: { color: palette.accent, textAlign: 'center', fontSize: 13, fontWeight: '800' },
});
