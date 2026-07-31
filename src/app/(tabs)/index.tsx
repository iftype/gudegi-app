import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader onRefresh={() => void store.refresh()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={store.loading} onRefresh={store.refresh} tintColor={palette.accent} />}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>MY ALERTS</Text>
          <Text style={styles.title}>알림 관리</Text>
          <Text style={styles.description}>이 기기에 저장한 {enabledCount}명의 맞춤 알림을 관리합니다.</Text>
        </View>

        <Pressable onPress={() => router.push('/(tabs)/settings')} style={styles.pushBanner}>
          <SymbolView name={{ ios: 'bell.badge', android: 'notifications_active' }} size={18} tintColor={palette.accentText} />
          <Text style={styles.pushBannerText}>이 기기에서 알림 받기</Text>
        </Pressable>

        {store.usingDemoData && (
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeText}>서버 연결 전이라 미리보기 데이터를 표시하고 있습니다.</Text>
          </View>
        )}

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
                categories={store.categories}
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
  content: { padding: 14, paddingBottom: 32 },
  intro: { marginBottom: 13, paddingHorizontal: 2 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { marginTop: 5, color: palette.text, fontSize: 25, fontWeight: '900', letterSpacing: -1.2 },
  description: { marginTop: 3, color: palette.textSecondary, fontSize: 12 },
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
    paddingRight: 5,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  allToggleTitle: { color: palette.text, fontSize: 10, fontWeight: '800' },
  allToggleCount: { color: palette.textMuted, fontSize: 8 },
  list: { overflow: 'hidden', backgroundColor: palette.surface, borderRadius: radius.card },
  empty: { padding: 28, color: palette.textSecondary, textAlign: 'center', fontSize: 12 },
});
