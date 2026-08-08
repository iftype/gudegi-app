import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { palette, radius } from '@/constants/theme';
import type { CategoryFollowAlertEvent } from '@/types';

function dateLabel(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function CategoryLogSheet() {
  const { categoryKey, categoryName } = useLocalSearchParams<{
    categoryKey?: string;
    categoryName?: string;
  }>();
  const [events, setEvents] = useState<CategoryFollowAlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!categoryKey) return;
    setLoading(true);
    setFailed(false);
    try {
      const result = await api.categoryAlertEvents(categoryKey);
      setEvents(result.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [categoryKey]);

  useEffect(() => {
    if (!categoryKey) return;
    const controller = new AbortController();
    api.categoryAlertEvents(categoryKey, controller.signal)
      .then((result) => setEvents(result.data))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [categoryKey]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>카테고리 알림 기록</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{categoryName ?? '카테고리'}</Text>
        </View>
        <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.closeButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close' }} size={15} tintColor={palette.textSecondary} />
        </Pressable>
      </View>
      <FlatList
        data={events}
        keyExtractor={(event) => event.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={palette.accent} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.channelImageUrl ? (
              <Image source={item.channelImageUrl} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{item.channelName.slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.rowBody}>
              <View style={styles.rowHeading}>
                <Text numberOfLines={1} style={styles.channelName}>{item.channelName}</Text>
                <Text style={styles.time}>{dateLabel(item.occurredAt)}</Text>
              </View>
              <Text numberOfLines={2} style={styles.broadcastTitle}>{item.broadcastTitle}</Text>
              <Text style={styles.detail}>
                {item.categoryValue} · 감지 당시 {item.concurrentUserCount.toLocaleString('ko-KR')}명
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={loading ? (
          <ActivityIndicator color={palette.accent} style={styles.emptyLoader} />
        ) : failed ? (
          <Pressable onPress={() => void load()} style={styles.empty}>
            <Text style={styles.emptyTitle}>기록을 불러오지 못했어요</Text>
            <Text style={styles.emptyDescription}>눌러서 다시 시도해 주세요.</Text>
          </Pressable>
        ) : (
          <View style={styles.empty}>
            <SymbolView name={{ ios: 'clock', android: 'history' }} size={24} tintColor={palette.textMuted} />
            <Text style={styles.emptyTitle}>아직 감지된 방송이 없어요</Text>
            <Text style={styles.emptyDescription}>이 카테고리를 시작한 방송이 여기에 쌓입니다.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  header: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingTop: 8 },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: palette.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { marginTop: 3, color: palette.accent, fontSize: 12, fontWeight: '800' },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  content: { paddingHorizontal: 14, paddingBottom: 28 },
  row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: palette.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  avatar: { width: 42, height: 42, borderRadius: radius.pill, backgroundColor: palette.surfaceRaised },
  avatarFallback: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: palette.surfaceRaised },
  avatarText: { color: palette.textSecondary, fontSize: 15, fontWeight: '900' },
  rowBody: { flex: 1, minWidth: 0 },
  rowHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  channelName: { flex: 1, color: palette.text, fontSize: 14, fontWeight: '900' },
  time: { color: palette.textMuted, fontSize: 9 },
  broadcastTitle: { marginTop: 3, color: palette.textSecondary, fontSize: 12, lineHeight: 16 },
  detail: { marginTop: 3, color: palette.textMuted, fontSize: 10 },
  emptyLoader: { paddingVertical: 50 },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 52 },
  emptyTitle: { marginTop: 10, color: palette.text, fontSize: 14, fontWeight: '800' },
  emptyDescription: { marginTop: 5, color: palette.textSecondary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
