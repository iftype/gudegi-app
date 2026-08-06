import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import { useLocalRefresh } from '@/hooks/use-local-refresh';
import { openChzzkLive } from '@/navigation/open-chzzk-live';

const FILTER_GUIDE_COMPLETED_KEY = 'gudegi-native-filter-guide-completed-v1';

export default function StreamersScreen() {
  const store = useAlertStore();
  const tabRefresh = useLocalRefresh(store.refresh);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(store.preferences.map((item) => item.channelId)), [store.preferences]);
  const visible = useMemo(() => store.streamers.filter((streamer) => streamer.channelName
    .toLocaleLowerCase('ko-KR')
    .includes(query.trim().toLocaleLowerCase('ko-KR'))), [query, store.streamers]);
  const visibleIds = useMemo(() => visible.map((streamer) => streamer.channelId), [visible]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((channelId) => selected.has(channelId));

  async function addChannel(channelId: string) {
    store.addChannel(channelId);
    let completed = false;
    try {
      completed = await AsyncStorage.getItem(FILTER_GUIDE_COMPLETED_KEY) === 'true';
      if (completed) return;
      await AsyncStorage.setItem(FILTER_GUIDE_COMPLETED_KEY, 'true');
    } catch {
      // 안내 상태 저장에 실패해도 이번 설정 안내는 표시합니다.
    }
    router.navigate({ pathname: '/alert-rules', params: { channelId, guide: 'first-add' } });
  }

  function confirmSelectAll() {
    if (!visibleIds.length) return;
    const nextSelected = !allVisibleSelected;
    const scopeLabel = query.trim() ? '검색 결과' : '전체 스트리머';
    Alert.alert(
      nextSelected ? `${scopeLabel} 추가` : `${scopeLabel} 선택 해제`,
      nextSelected
        ? `${visibleIds.length}명을 알림 목록에 모두 추가할까요?`
        : `${visibleIds.length}명을 알림 목록에서 모두 제거할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: nextSelected ? '전체 추가' : '선택 해제',
          style: nextSelected ? 'default' : 'destructive',
          onPress: () => store.setChannelsSelected(visibleIds, nextSelected),
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader serverUnavailable={store.serverState === 'unavailable'} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={tabRefresh.refreshing} onRefresh={tabRefresh.onRefresh} tintColor={palette.accent} />}>
        <View style={styles.intro}>
          <Text style={styles.title}>스트리머</Text>
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
            accessibilityLabel={query.trim()
              ? `검색 결과 ${allVisibleSelected ? '전체 해제' : '전체 추가'}`
              : allVisibleSelected ? '전체 해제' : '전체 추가'}
            accessibilityRole="button"
            disabled={!visible.length}
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
        <View style={styles.list}>
          {visible.map((streamer) => {
            const added = selected.has(streamer.channelId);
            return (
              <View key={streamer.channelId} style={styles.row}>
                <Pressable
                  accessibilityLabel={streamer.isLive ? `${streamer.channelName} 방송 열기` : `${streamer.channelName} 프로필`}
                  disabled={!streamer.isLive}
                  onPress={() => void openChzzkLive(streamer.channelId)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  {streamer.channelImageUrl ? (
                    <Image source={streamer.channelImageUrl} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}><Text style={styles.avatarText}>{streamer.channelName.slice(0, 1)}</Text></View>
                  )}
                </Pressable>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={styles.name}>{streamer.channelName}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityLabel={`${streamer.channelName} ${added ? '알림 삭제' : '알림 추가'}`}
                    onPress={() => added ? store.removeChannel(streamer.channelId) : void addChannel(streamer.channelId)}
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
          })}
          {!!query.trim() && !visible.length && (
            <View style={styles.suggestion}>
              <View style={styles.suggestionIcon}>
                <SymbolView name={{ ios: 'person.badge.plus', android: 'person_add' }} size={20} tintColor={palette.accent} />
              </View>
              <Text style={styles.suggestionTitle}>‘{query.trim()}’ 검색 결과가 없어요</Text>
              <Text style={styles.suggestionDescription}>추가를 원하는 스트리머로 제안해 주세요.</Text>
              <Pressable
                onPress={() => router.navigate({ pathname: '/suggestion', params: { streamerName: query.trim() } })}
                style={({ pressed }) => [styles.suggestionButton, pressed && styles.pressed]}>
                <Text style={styles.suggestionButtonText}>스트리머 제안</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 14, paddingBottom: 112 },
  intro: { marginBottom: 12, paddingHorizontal: 2 },
  title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.3 },
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
  list: { overflow: 'hidden', backgroundColor: palette.surface, borderRadius: radius.card },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.surfaceRaised },
  avatarFallback: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: palette.surfaceRaised },
  avatarText: { color: palette.text, fontWeight: '900' },
  rowText: { flex: 1, minWidth: 0 },
  name: { color: palette.text, fontSize: 16, fontWeight: '800' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  logText: { color: palette.textSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  addButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  addedButton: { backgroundColor: palette.surfaceSelected },
  addText: { color: palette.text, fontSize: 12, fontWeight: '800' },
  addedText: { color: palette.accent },
  suggestion: { alignItems: 'center', padding: 25 },
  suggestionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: palette.surfaceRaised, borderRadius: 22 },
  suggestionTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  suggestionDescription: { marginTop: 4, color: palette.textSecondary, fontSize: 12 },
  suggestionButton: { minWidth: 140, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: palette.accent, borderRadius: radius.control },
  suggestionButtonText: { color: palette.accentText, fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
