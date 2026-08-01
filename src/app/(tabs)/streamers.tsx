import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import { openChzzkLive } from '@/navigation/open-chzzk-live';

export default function StreamersScreen() {
  const store = useAlertStore();
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(store.preferences.map((item) => item.channelId)), [store.preferences]);
  const visible = useMemo(() => store.streamers.filter((streamer) => streamer.channelName
    .toLocaleLowerCase('ko-KR')
    .includes(query.trim().toLocaleLowerCase('ko-KR'))), [query, store.streamers]);
  const visibleIds = useMemo(() => visible.map((streamer) => streamer.channelId), [visible]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((channelId) => selected.has(channelId));

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader onRefresh={() => void store.refresh()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>STREAMERS</Text>
          <Text style={styles.title}>스트리머</Text>
          <Text style={styles.description}>알림을 받을 스트리머를 선택하세요.</Text>
        </View>
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
        {!!visible.length && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allVisibleSelected }}
            onPress={() => store.setChannelsSelected(visibleIds, !allVisibleSelected)}
            style={({ pressed }) => [styles.selectAll, pressed && styles.pressed]}>
            <View>
              <Text style={styles.selectAllTitle}>{query.trim() ? '검색 결과 전체 선택' : '전체 선택'}</Text>
              <Text style={styles.selectAllDescription}>{visibleIds.filter((id) => selected.has(id)).length}/{visibleIds.length}명 추가됨</Text>
            </View>
            <View style={[styles.selectAllCheck, allVisibleSelected && styles.selectAllCheckSelected]}>
              {allVisibleSelected && <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={13} tintColor={palette.accentText} />}
            </View>
          </Pressable>
        )}
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
                  <View style={styles.nameLine}>
                    <Text style={styles.name}>{streamer.channelName}</Text>
                    {streamer.isLive && <Text style={styles.live}>LIVE</Text>}
                  </View>
                  <Text numberOfLines={1} style={styles.category}>{streamer.currentCategory ?? '오프라인'}</Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityLabel={`${streamer.channelName} 알림 기록`}
                    onPress={() => router.navigate({ pathname: '/alert-log', params: { channelId: streamer.channelId } })}
                    style={styles.logButton}>
                    <SymbolView name={{ ios: 'doc.text', android: 'description' }} size={14} tintColor={palette.textSecondary} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`${streamer.channelName} ${added ? '알림 삭제' : '알림 추가'}`}
                    onPress={() => added ? store.removeChannel(streamer.channelId) : store.addChannel(streamer.channelId)}
                    style={[styles.addButton, added && styles.addedButton]}>
                    <SymbolView
                      name={{ ios: added ? 'checkmark' : 'plus', android: added ? 'check' : 'add' }}
                      size={14}
                      tintColor={added ? palette.accent : palette.text}
                    />
                    <Text style={[styles.addText, added && styles.addedText]}>{added ? '추가됨' : '추가'}</Text>
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
  intro: { marginBottom: 14, paddingHorizontal: 2 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { marginTop: 5, color: palette.text, fontSize: 25, fontWeight: '900', letterSpacing: -1.2 },
  description: { marginTop: 3, color: palette.textSecondary, fontSize: 12 },
  search: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  input: { flex: 1, color: palette.text, fontSize: 16 },
  selectAll: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 12, backgroundColor: palette.surface, borderRadius: radius.card },
  selectAllTitle: { color: palette.text, fontSize: 11, fontWeight: '800' },
  selectAllDescription: { marginTop: 2, color: palette.textMuted, fontSize: 9 },
  selectAllCheck: { width: 25, height: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 8 },
  selectAllCheckSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  list: { overflow: 'hidden', backgroundColor: palette.surface, borderRadius: radius.card },
  row: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.surfaceRaised },
  avatarFallback: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: palette.surfaceRaised },
  avatarText: { color: palette.text, fontWeight: '900' },
  rowText: { flex: 1, minWidth: 0, gap: 3 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: palette.text, fontSize: 14, fontWeight: '800' },
  live: { color: palette.live, fontSize: 8, fontWeight: '900' },
  category: { color: palette.textSecondary, fontSize: 10 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  logButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  addButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  addedButton: { backgroundColor: palette.surfaceSelected },
  addText: { color: palette.text, fontSize: 10, fontWeight: '800' },
  addedText: { color: palette.accent },
  suggestion: { alignItems: 'center', padding: 25 },
  suggestionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: palette.surfaceRaised, borderRadius: 22 },
  suggestionTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  suggestionDescription: { marginTop: 4, color: palette.textSecondary, fontSize: 10 },
  suggestionButton: { minWidth: 140, minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 14, backgroundColor: palette.accent, borderRadius: radius.control },
  suggestionButtonText: { color: palette.accentText, fontSize: 11, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
