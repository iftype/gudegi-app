import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import { openChzzkLive } from '@/navigation/open-chzzk-live';
import type { Streamer } from '@/types';

const PAGE_SIZE = 40;

export default function StreamersScreen() {
  const store = useAlertStore();
  const rememberStreamers = store.rememberStreamers;
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<Streamer[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestSequence = useRef(0);
  const normalizedQuery = query.normalize('NFKC').trim();
  const selected = useMemo(
    () => new Set(store.preferences.map((item) => item.channelId)),
    [store.preferences],
  );
  const visibleIds = useMemo(() => catalog.map((streamer) => streamer.channelId), [catalog]);
  const allVisibleSelected = visibleIds.length > 0
    && visibleIds.every((channelId) => selected.has(channelId));

  const loadFirstPage = useCallback(async (showRefresh = false) => {
    const sequence = ++requestSequence.current;
    setLoadingMore(false);
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await api.streamers({
        page: 1,
        pageSize: PAGE_SIZE,
        query: normalizedQuery,
      });
      if (sequence !== requestSequence.current) return;
      setCatalog(result.data);
      setPage(1);
      setHasNextPage(result.pagination.hasNextPage);
      rememberStreamers(result.data);
    } catch {
      // 상단 서버 연결 상태가 실패를 안내합니다.
    } finally {
      if (sequence !== requestSequence.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, [normalizedQuery, rememberStreamers]);

  useEffect(() => {
    const timer = setTimeout(() => void loadFirstPage(), normalizedQuery ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadFirstPage, normalizedQuery]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loading || loadingMore) return;
    setLoadingMore(true);
    const sequence = requestSequence.current;
    try {
      const nextPage = page + 1;
      const result = await api.streamers({
        page: nextPage,
        pageSize: PAGE_SIZE,
        query: normalizedQuery,
      });
      if (sequence !== requestSequence.current) return;
      setCatalog((current) => {
        const byChannel = new Map(current.map((streamer) => [streamer.channelId, streamer]));
        for (const streamer of result.data) byChannel.set(streamer.channelId, streamer);
        return [...byChannel.values()];
      });
      setPage(nextPage);
      setHasNextPage(result.pagination.hasNextPage);
      rememberStreamers(result.data);
    } finally {
      if (sequence === requestSequence.current) setLoadingMore(false);
    }
  }, [hasNextPage, loading, loadingMore, normalizedQuery, page, rememberStreamers]);

  function confirmSelectAll() {
    if (!visibleIds.length) return;
    const nextSelected = !allVisibleSelected;
    Alert.alert(
      nextSelected ? '불러온 목록 전체 추가' : '불러온 목록 전체 해제',
      nextSelected
        ? `현재 불러온 ${visibleIds.length}명을 알림 목록에 추가할까요?`
        : `현재 불러온 ${visibleIds.length}명을 알림 목록에서 제거할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: nextSelected ? '전체 추가' : '선택 해제',
          style: nextSelected ? 'default' : 'destructive',
          onPress: () => {
            store.rememberStreamers(catalog);
            store.setChannelsSelected(visibleIds, nextSelected);
          },
        },
      ],
    );
  }

  function renderStreamer({ item: streamer }: { item: Streamer }) {
    const added = selected.has(streamer.channelId);
    return (
      <View style={styles.row}>
        <Pressable
          accessibilityLabel={streamer.isLive ? `${streamer.channelName} 방송 열기` : `${streamer.channelName} 프로필`}
          disabled={!streamer.isLive}
          onPress={() => void openChzzkLive(streamer.channelId)}
          style={({ pressed }) => pressed && styles.pressed}>
          {streamer.channelImageUrl ? (
            <Image source={streamer.channelImageUrl} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{streamer.channelName.slice(0, 1)}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.name}>{streamer.channelName}</Text>
          <Text style={styles.viewerCount}>
            {streamer.isLive && (streamer.concurrentUserCount ?? 0) > 0
              ? `${streamer.concurrentUserCount?.toLocaleString('ko-KR')}명 시청 중`
              : '현재 방송 없음'}
          </Text>
        </View>
        <View style={styles.rowActions}>
          <Pressable
            accessibilityLabel={`${streamer.channelName} ${added ? '알림 삭제' : '알림 추가'}`}
            onPress={() => {
              if (added) store.removeChannel(streamer.channelId);
              else {
                store.rememberStreamers([streamer]);
                store.addChannel(streamer.channelId);
              }
            }}
            style={[styles.addButton, added && styles.addedButton]}>
            <SymbolView
              name={{ ios: added ? 'checkmark' : 'plus', android: added ? 'check' : 'add' }}
              size={14}
              tintColor={added ? palette.accent : palette.text}
            />
            <Text style={[styles.addText, added && styles.addedText]}>{added ? '추가됨' : '추가'}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`${streamer.channelName} 알림 기록`}
            onPress={() => router.navigate({ pathname: '/alert-log', params: { channelId: streamer.channelId } })}
            style={styles.logButton}>
            <Text style={styles.logText}>LOG</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader serverUnavailable={store.serverState === 'unavailable'} />
      <FlatList
        data={catalog}
        keyExtractor={(streamer) => streamer.channelId}
        renderItem={renderStreamer}
        contentContainerStyle={styles.content}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadFirstPage(true)}
            tintColor={palette.accent}
          />
        )}
        ListHeaderComponent={(
          <>
            <View style={styles.intro}>
              <Text style={styles.title}>스트리머</Text>
              <Text style={styles.policy}>시청자 100명 이상 방송만 기록하며, 현재 시청자 수 순으로 보여드려요.</Text>
            </View>
            <View style={styles.tools}>
              <View style={styles.search}>
                <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={16} tintColor={palette.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="스트리머 검색"
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                />
              </View>
              <Pressable
                accessibilityLabel={allVisibleSelected ? '불러온 목록 전체 해제' : '불러온 목록 전체 추가'}
                accessibilityRole="button"
                disabled={!catalog.length}
                onPress={confirmSelectAll}
                style={({ pressed }) => [styles.selectAll, allVisibleSelected && styles.selectAllSelected, pressed && styles.pressed]}>
                <SymbolView
                  name={{ ios: allVisibleSelected ? 'minus' : 'plus', android: allVisibleSelected ? 'remove' : 'add' }}
                  size={14}
                  tintColor={allVisibleSelected ? palette.accent : palette.textSecondary}
                />
                <Text style={[styles.selectAllTitle, allVisibleSelected && styles.selectAllTitleSelected]}>
                  {allVisibleSelected ? '전체 해제' : '전체 추가'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
        ListEmptyComponent={loading ? (
          <ActivityIndicator color={palette.accent} style={styles.empty} />
        ) : normalizedQuery ? (
          <View style={styles.suggestion}>
            <View style={styles.suggestionIcon}>
              <SymbolView name={{ ios: 'person.badge.plus', android: 'person_add' }} size={20} tintColor={palette.accent} />
            </View>
            <Text style={styles.suggestionTitle}>‘{normalizedQuery}’ 검색 결과가 없어요</Text>
            <Text style={styles.suggestionDescription}>추가를 원하는 스트리머로 제안해 주세요.</Text>
            <Pressable
              onPress={() => router.navigate({ pathname: '/suggestion', params: { streamerName: normalizedQuery } })}
              style={({ pressed }) => [styles.suggestionButton, pressed && styles.pressed]}>
              <Text style={styles.suggestionButtonText}>스트리머 제안</Text>
            </Pressable>
          </View>
        ) : null}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator color={palette.accent} style={styles.footerLoader} />
        ) : <View style={styles.footerSpace} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 14, paddingBottom: 112 },
  intro: { marginBottom: 12, paddingHorizontal: 2 },
  title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.3 },
  policy: { marginTop: 5, color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  tools: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  search: {
    flex: 5,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  input: { flex: 1, color: palette.text, fontSize: 14 },
  selectAll: { flex: 1, minWidth: 58, height: 48, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: palette.surface, borderRadius: radius.card },
  selectAllSelected: { backgroundColor: palette.surfaceSelected },
  selectAllTitle: { color: palette.text, fontSize: 10, fontWeight: '800' },
  selectAllTitleSelected: { color: palette.accent },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.surfaceRaised },
  avatarFallback: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: palette.surfaceRaised },
  avatarText: { color: palette.text, fontWeight: '900' },
  rowText: { flex: 1, minWidth: 0 },
  name: { color: palette.text, fontSize: 16, fontWeight: '800' },
  viewerCount: { marginTop: 2, color: palette.textSecondary, fontSize: 11 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  logText: { color: palette.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  addButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  addedButton: { backgroundColor: palette.surfaceSelected },
  addText: { color: palette.text, fontSize: 12, fontWeight: '800' },
  addedText: { color: palette.accent },
  empty: { padding: 36 },
  suggestion: { alignItems: 'center', padding: 25, backgroundColor: palette.surface, borderRadius: radius.card },
  suggestionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: palette.surfaceRaised, borderRadius: 22 },
  suggestionTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  suggestionDescription: { marginTop: 4, color: palette.textSecondary, fontSize: 12 },
  suggestionButton: { minWidth: 140, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: palette.accent, borderRadius: radius.control },
  suggestionButtonText: { color: palette.accentText, fontSize: 13, fontWeight: '900' },
  footerLoader: { padding: 18 },
  footerSpace: { height: 12 },
  pressed: { opacity: 0.72 },
});
