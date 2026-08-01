import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
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

import { api } from '@/api/client';
import { AlertRow } from '@/components/alert-row';
import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';

export default function AlertsScreen() {
  const router = useRouter();
  const store = useAlertStore();
  const [query, setQuery] = useState('');
  const [importing, setImporting] = useState(false);
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

  async function importFollows() {
    if (importing) return;
    setImporting(true);
    try {
      const start = await api.beginAccountImport();
      const auth = await WebBrowser.openAuthSessionAsync(
        start.data.authorizationUrl,
        'gudegi://auth/callback',
        { preferEphemeralSession: false },
      );
      if (auth.type !== 'success') return;
      const callback = new URL(auth.url);
      const code = callback.searchParams.get('code');
      const state = callback.searchParams.get('state');
      if (!code || !state) throw new Error('invalid_oauth_callback');
      const result = await api.completeAccountImport(code, state);
      const account = result.data.import;
      store.importAccountData(account.supported, account.preferences);
      const importedCount = new Set([
        ...account.supported,
        ...account.preferences.map((item) => item.channelId),
      ]).size;
      Alert.alert(
        '가져오기 완료',
        importedCount
          ? `계정에 저장된 ${importedCount}명의 스트리머와 알림 설정을 가져왔습니다.`
          : '계정에 저장된 스트리머가 없습니다. 스트리머 탭에서 먼저 추가해 주세요.',
      );
    } catch {
      Alert.alert('가져오기 실패', '로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setImporting(false);
    }
  }

  function clearAlerts() {
    Alert.alert('알림목록 전체삭제', '저장한 스트리머와 개인 알림 설정을 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '전체삭제', style: 'destructive', onPress: store.clearChannels },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader onRefresh={() => void store.refresh()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={store.loading} onRefresh={store.refresh} tintColor={palette.accent} />}>
        <View style={styles.intro}>
          <View style={styles.introHeading}>
            <View style={styles.introText}>
              <Text style={styles.eyebrow}>MY ALERTS</Text>
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
          <Text style={styles.description}>이 기기에 저장한 {enabledCount}명의 맞춤 알림을 관리합니다.</Text>
        </View>

        {store.usingDemoData && (
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>서버 연결 전이라 미리보기 데이터를 표시하고 있습니다.</Text>
          </View>
        )}

        <View style={styles.management}>
          <Pressable disabled={importing} onPress={() => void importFollows()} style={({ pressed }) => [styles.managementButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'person.crop.circle.badge.plus', android: 'person_add' }} size={15} tintColor={palette.textSecondary} />
            <Text style={styles.managementText}>{importing ? '로그인 중…' : '팔로우 불러오기'}</Text>
          </Pressable>
          <Pressable disabled={!store.preferences.length} onPress={clearAlerts} style={({ pressed }) => [styles.managementButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'trash', android: 'delete' }} size={14} tintColor={palette.textSecondary} />
            <Text style={styles.managementText}>알림목록 전체삭제</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.navigate({ pathname: '/alert-rules', params: { scope: 'all' } })}
          style={({ pressed }) => [styles.globalFilter, pressed && styles.pressed]}>
          <View style={styles.globalFilterIcon}>
            <SymbolView name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list' }} size={15} tintColor={palette.accent} />
          </View>
          <View style={styles.globalFilterText}>
            <Text style={styles.globalFilterTitle}>전체 필터</Text>
            <Text style={styles.globalFilterDescription}>모든 스트리머의 알림 조건을 한 번에 설정해요.</Text>
          </View>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={12} tintColor={palette.textMuted} />
        </Pressable>

        <View style={styles.tools}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 14, paddingBottom: 112 },
  intro: { marginBottom: 13, paddingHorizontal: 2 },
  introHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  introText: { flex: 1 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { marginTop: 5, color: palette.text, fontSize: 25, fontWeight: '900', letterSpacing: -1.2 },
  description: { marginTop: 3, color: palette.textSecondary, fontSize: 12 },
  connectButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.control },
  connectButtonDone: { backgroundColor: palette.surfaceSelected, borderColor: palette.borderStrong },
  connectButtonText: { color: palette.text, fontSize: 9, fontWeight: '800' },
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
  demoNotice: { marginBottom: 9, padding: 10, backgroundColor: '#30291A', borderRadius: radius.control },
  demoNoticeText: { color: '#E5C98B', fontSize: 10, lineHeight: 15 },
  management: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  managementButton: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: palette.surface, borderRadius: radius.control },
  managementText: { color: palette.text, fontSize: 10, fontWeight: '800' },
  globalFilter: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9, paddingHorizontal: 11, backgroundColor: palette.surface, borderRadius: radius.card },
  globalFilterIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  globalFilterText: { flex: 1, gap: 2 },
  globalFilterTitle: { color: palette.text, fontSize: 11, fontWeight: '800' },
  globalFilterDescription: { color: palette.textSecondary, fontSize: 9 },
  tools: { flexDirection: 'row', gap: 8, marginBottom: 9 },
  search: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  allToggleTitle: { color: palette.text, fontSize: 10, fontWeight: '800' },
  allToggleCount: { color: palette.textMuted, fontSize: 8 },
  allSwitch: { alignSelf: 'center', transform: [{ scale: 0.82 }] },
  list: { overflow: 'hidden', backgroundColor: palette.surface, borderRadius: radius.card },
  empty: { padding: 28, color: palette.textSecondary, textAlign: 'center', fontSize: 12 },
  pressed: { opacity: 0.72 },
});
