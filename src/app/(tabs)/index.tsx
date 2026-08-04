import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertRow } from '@/components/alert-row';
import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';

export default function AlertsScreen() {
  const router = useRouter();
  const store = useAlertStore();
  const [query, setQuery] = useState('');
  const preferenceByChannel = useMemo(
    () => new Map(store.preferences.map((item) => [item.channelId, item])),
    [store.preferences],
  );
  const visible = useMemo(() => store.streamers
    .filter((streamer) => preferenceByChannel.has(streamer.channelId))
    .filter((streamer) => streamer.channelName.toLocaleLowerCase('ko-KR')
      .includes(query.trim().toLocaleLowerCase('ko-KR')))
    .sort((a, b) => Number(b.isLive) - Number(a.isLive)), [preferenceByChannel, query, store.streamers]);
  const enabledCount = store.preferences.filter((item) => item.enabled).length;
  const allEnabled = store.preferences.length > 0 && enabledCount === store.preferences.length;
  const notificationLabel = store.notificationState === 'connected'
    ? '기기알림 연결됨'
    : store.notificationState === 'working'
      ? '연결 중…'
      : store.notificationState === 'permission_only'
        ? '알림 권한 승인됨'
        : '기기알림 연결하기';

  function clearAlerts() {
    Alert.alert('알림목록 전체삭제', '저장한 스트리머와 개인 알림 설정을 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '전체삭제', style: 'destructive', onPress: store.clearChannels },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader onRefresh={() => void store.refresh()} serverUnavailable={store.serverState === 'unavailable'} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={store.loading} onRefresh={store.refresh} tintColor={palette.accent} />}>
        <View style={styles.intro}>
          <View style={styles.introHeading}>
            <View style={styles.introText}>
              <Text style={styles.title}>알림 관리</Text>
            </View>
            <Pressable
              disabled={store.notificationState === 'working' || store.notificationState === 'connected'}
              onPress={() => void store.connectNotifications()}
              style={({ pressed }) => [styles.connectButton, store.notificationState === 'connected' && styles.connectButtonDone, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'bell.badge', android: 'notifications_active' }} size={14} tintColor={palette.accent} />
              <Text style={styles.connectButtonText}>{notificationLabel}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.management}>
          <Pressable onPress={() => router.navigate('/follow-import')} style={({ pressed }) => [styles.managementButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'person.crop.circle.badge.plus', android: 'person_add' }} size={15} tintColor={palette.textSecondary} />
            <Text style={styles.managementText}>팔로우 불러오기</Text>
          </Pressable>
          <Pressable disabled={!store.preferences.length} onPress={clearAlerts} style={({ pressed }) => [styles.managementButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'trash', android: 'delete' }} size={14} tintColor={palette.textSecondary} />
            <Text style={styles.managementText}>알림목록 전체삭제</Text>
          </Pressable>
        </View>

        <View style={styles.search}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={15} tintColor={palette.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="스트리머 검색"
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.tools}>
          <Pressable
            onPress={() => router.navigate({ pathname: '/alert-rules', params: { scope: 'all' } })}
            style={({ pressed }) => [styles.globalFilter, pressed && styles.pressed]}>
            <View style={styles.globalFilterIcon}>
              <SymbolView name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list' }} size={15} tintColor={palette.accent} />
            </View>
            <View style={styles.globalFilterText}>
              <Text style={styles.globalFilterTitle}>조건 전체 적용</Text>
            </View>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={12} tintColor={palette.textMuted} />
          </Pressable>
          <View style={styles.allToggle}>
            <View>
              <Text style={styles.allToggleTitle}>전체 선택</Text>
              <Text style={styles.allToggleCount}>{enabledCount}/{store.preferences.length}</Text>
            </View>
            <Switch
              accessibilityLabel="전체 선택"
              style={styles.allSwitch}
              value={allEnabled}
              onValueChange={store.setAllEnabled}
              trackColor={{ false: palette.surfaceRaised, true: palette.accent }}
              thumbColor={allEnabled ? palette.accentText : palette.textSecondary}
            />
          </View>
        </View>

        <View style={styles.list}>
          {visible.map((streamer) => {
            const preference = preferenceByChannel.get(streamer.channelId)!;
            return (
              <AlertRow
                key={streamer.channelId}
                streamer={streamer}
                preference={preference}
                onToggle={() => store.toggleEnabled(streamer.channelId)}
                onRemove={() => store.removeChannel(streamer.channelId)}
              />
            );
          })}
          {!visible.length && <Text style={styles.empty}>알림 목록이 비어 있습니다.</Text>}
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            onPress={() => router.navigate('/streamers')}
            style={({ pressed }) => [styles.bottomAction, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'plus', android: 'add' }} size={16} tintColor={palette.textSecondary} />
            <Text style={styles.bottomActionText}>알림 목록에 추가</Text>
          </Pressable>
          <Pressable
            onPress={() => router.navigate('/suggestion')}
            style={({ pressed }) => [styles.bottomAction, styles.bottomActionStrong, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'paperplane', android: 'send' }} size={16} tintColor={palette.text} />
            <Text style={styles.bottomActionText}>스트리머 제안</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 14, paddingBottom: 112 },
  intro: { marginBottom: 12, paddingHorizontal: 2 },
  introHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  introText: { flex: 1 },
  title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.3 },
  connectButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.control },
  connectButtonDone: { backgroundColor: palette.surfaceSelected, borderColor: palette.borderStrong },
  connectButtonText: { color: palette.text, fontSize: 11, fontWeight: '800' },
  pushBanner: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 9,
    backgroundColor: palette.accent,
    borderRadius: radius.card,
  },
  pushBannerText: { color: palette.accentText, fontSize: 13, fontWeight: '900' },
  management: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  managementButton: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: palette.surface, borderRadius: radius.control },
  managementText: { color: palette.text, fontSize: 12, fontWeight: '800' },
  globalFilter: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, backgroundColor: palette.surface, borderRadius: radius.card },
  globalFilterIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  globalFilterText: { flex: 1 },
  globalFilterTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  tools: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  search: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
    paddingHorizontal: 11,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  searchInput: { flex: 1, color: palette.text, fontSize: 15 },
  allToggle: {
    minWidth: 124,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 9,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  allToggleTitle: { color: palette.text, fontSize: 12, fontWeight: '800' },
  allToggleCount: { color: palette.textMuted, fontSize: 10 },
  allSwitch: { alignSelf: 'center', transform: [{ scale: 0.82 }] },
  list: { overflow: 'hidden', backgroundColor: palette.surface, borderRadius: radius.card },
  empty: { padding: 28, color: palette.textSecondary, textAlign: 'center', fontSize: 14 },
  bottomActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  bottomAction: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: palette.surface, borderRadius: radius.card },
  bottomActionStrong: { backgroundColor: palette.surfaceRaised },
  bottomActionText: { color: palette.text, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
