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
  const eventGroups = useMemo(() => {
    const grouped = new Map<string, StreamerAlertEvent[]>();
    for (const event of sortedEvents) {
      const key = dayKey(event.occurredAt);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return [...grouped.entries()].map(([key, items]) => ({ key, items }));
  }, [sortedEvents]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>ALERT LOG</Text>
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
        <Text style={styles.description}>서버가 감지한 방송 시작·종료·방제·카테고리 변경 기록입니다.</Text>
        <View style={styles.groups}>
          {eventGroups.map((group) => (
            <View key={group.key} style={styles.dateGroup}>
              <Text style={styles.dayLabel}>{dayLabel(group.items[0]!.occurredAt)}</Text>
              <View style={styles.list}>
                {group.items.map((event) => {
                  const presentation = eventPresentation[event.eventType];
                  return (
                    <View key={event.id} style={styles.row}>
                      <View style={styles.icon}>
                        <SymbolView name={presentation.icon} size={15} tintColor={palette.accent} />
                      </View>
                      <View style={styles.rowBody}>
                        <View style={styles.rowHeading}>
                          <Text style={styles.eventLabel}>{presentation.label}</Text>
                          <Text style={styles.date}>{timeLabel(event.occurredAt)}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 28, paddingBottom: 12 },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 5, color: palette.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: 2, color: palette.textSecondary, fontSize: 10 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  content: { paddingHorizontal: 18, paddingBottom: 64 },
  description: { marginBottom: 10, color: palette.textSecondary, fontSize: 10, lineHeight: 15 },
  groups: { gap: 14 },
  dateGroup: { gap: 6 },
  dayLabel: { marginLeft: 3, color: palette.textSecondary, fontSize: 10, fontWeight: '800' },
  list: { overflow: 'hidden', backgroundColor: palette.background, borderRadius: radius.card },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  rowBody: { flex: 1, minWidth: 0, gap: 7 },
  rowHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventLabel: { color: palette.text, fontSize: 12, fontWeight: '800' },
  date: { color: palette.textMuted, fontSize: 8 },
  value: { color: palette.textSecondary, fontSize: 10, lineHeight: 15 },
  changeValues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previous: { maxWidth: '40%', color: palette.textMuted, fontSize: 9 },
  current: { flex: 1, color: palette.textSecondary, fontSize: 10, fontWeight: '700' },
  empty: { padding: 28, color: palette.textMuted, textAlign: 'center', fontSize: 11 },
  retry: { padding: 24 },
  retryText: { color: palette.accent, textAlign: 'center', fontSize: 11, fontWeight: '800' },
});
