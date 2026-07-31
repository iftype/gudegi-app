import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';

export default function StreamersScreen() {
  const store = useAlertStore();
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(store.preferences.map((item) => item.channelId)), [store.preferences]);
  const visible = useMemo(() => store.streamers.filter((streamer) => streamer.channelName
    .toLocaleLowerCase('ko-KR')
    .includes(query.trim().toLocaleLowerCase('ko-KR'))), [query, store.streamers]);

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
        <View style={styles.list}>
          {visible.map((streamer) => {
            const added = selected.has(streamer.channelId);
            return (
              <View key={streamer.channelId} style={styles.row}>
                {streamer.channelImageUrl ? (
                  <Image source={streamer.channelImageUrl} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}><Text style={styles.avatarText}>{streamer.channelName.slice(0, 1)}</Text></View>
                )}
                <View style={styles.rowText}>
                  <View style={styles.nameLine}>
                    <Text style={styles.name}>{streamer.channelName}</Text>
                    {streamer.isLive && <Text style={styles.live}>LIVE</Text>}
                  </View>
                  <Text numberOfLines={1} style={styles.category}>{streamer.currentCategory ?? '오프라인'}</Text>
                </View>
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
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 14, paddingBottom: 32 },
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
  addButton: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  addedButton: { backgroundColor: palette.surfaceSelected },
  addText: { color: palette.text, fontSize: 10, fontWeight: '800' },
  addedText: { color: palette.accent },
});
