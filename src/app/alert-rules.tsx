import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import type { AlertRules } from '@/types';

const ruleChoices = [
  { key: 'liveStarted' as const, label: '방송 시작', description: '방송이 시작되면 알려드려요.' },
  { key: 'titleChanged' as const, label: '방제 변경', description: '방송 제목이 바뀌면 알려드려요.' },
  { key: 'categoryChanged' as const, label: '카테고리 변경', description: '방송 카테고리가 바뀌면 알려드려요.' },
];

export default function AlertRulesSheet() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const store = useAlertStore();
  const preference = store.preferences.find((item) => item.channelId === channelId);
  const streamer = store.streamers.find((item) => item.channelId === channelId);
  const initial = useMemo<AlertRules>(() => ({
    liveStarted: preference?.liveStarted ?? true,
    titleChanged: preference?.titleChanged ?? true,
    categoryChanged: preference?.categoryChanged ?? true,
    keywords: [...(preference?.keywords ?? [])],
  }), [preference]);
  const [draft, setDraft] = useState(initial);
  const [keyword, setKeyword] = useState('');

  function addKeyword() {
    const normalized = keyword.normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (normalized.length < 2 || draft.keywords.length >= 10) return;
    if (!draft.keywords.some((item) => item.toLocaleLowerCase('ko-KR') === normalized.toLocaleLowerCase('ko-KR'))) {
      setDraft((current) => ({ ...current, keywords: [...current.keywords, normalized] }));
    }
    setKeyword('');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      {Platform.OS !== 'ios' && <View style={styles.handle} />}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ALERT CONDITION</Text>
          <Text style={styles.title}>알림 조건</Text>
          <Text style={styles.subtitle}>{streamer?.channelName ?? '스트리머'}</Text>
        </View>
        <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.closeButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close' }} size={15} tintColor={palette.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.choiceList}>
          {ruleChoices.map((choice) => {
            const selected = draft[choice.key];
            const icon = choice.key === 'liveStarted'
              ? { ios: 'bell.badge' as const, android: 'notifications_active' as const }
              : choice.key === 'titleChanged'
                ? { ios: 'textformat' as const, android: 'title' as const }
                : { ios: 'tag' as const, android: 'sell' as const };
            return (
              <Pressable
                key={choice.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => setDraft((current) => ({ ...current, [choice.key]: !current[choice.key] }))}
                style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>
                <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
                  <SymbolView name={icon} size={15} tintColor={selected ? palette.accent : palette.textSecondary} />
                </View>
                <View style={styles.choiceText}>
                  <Text style={styles.choiceTitle}>{choice.label}</Text>
                  <Text style={styles.choiceDescription}>{choice.description}</Text>
                </View>
                <View style={[styles.check, selected && styles.checkSelected]}>
                  {selected && <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={13} tintColor={palette.accentText} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.keywordCard}>
          <View style={styles.keywordHeader}>
            <View style={styles.keywordIcon}>
              <SymbolView name={{ ios: 'checklist', android: 'checklist' }} size={15} tintColor={palette.accent} />
            </View>
            <View style={styles.keywordTitleWrap}>
              <Text style={styles.keywordTitle}>방제 키워드</Text>
              <Text style={styles.keywordDescription}>새 방제에 단어가 포함되면 알려드려요.</Text>
            </View>
            <Text style={styles.keywordCount}>{draft.keywords.length}/10</Text>
          </View>
          <View style={styles.keywordForm}>
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={addKeyword}
              maxLength={40}
              placeholder="키워드 입력 (예: 합방)"
              placeholderTextColor={palette.textMuted}
              returnKeyType="done"
              style={styles.keywordInput}
            />
            <Pressable
              accessibilityLabel="키워드 추가"
              disabled={keyword.trim().length < 2 || draft.keywords.length >= 10}
              onPress={addKeyword}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'plus', android: 'add' }} size={17} tintColor={palette.accentText} />
            </Pressable>
          </View>
          <View style={styles.keywordList}>
            {draft.keywords.map((item) => (
              <Pressable
                key={item.toLocaleLowerCase('ko-KR')}
                accessibilityLabel={`${item} 키워드 삭제`}
                onPress={() => setDraft((current) => ({
                  ...current,
                  keywords: current.keywords.filter((keywordItem) => keywordItem !== item),
                }))}
                style={styles.keywordChip}>
                <Text style={styles.keywordChipText}>#{item}</Text>
                <SymbolView name={{ ios: 'xmark', android: 'close' }} size={9} tintColor="#B8D8C4" />
              </Pressable>
            ))}
            {!draft.keywords.length && <Text style={styles.emptyKeywords}>아직 등록한 키워드가 없습니다.</Text>}
          </View>
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (channelId) store.updateRules(channelId, draft);
          router.back();
        }}
        style={({ pressed }) => [styles.applyButton, pressed && styles.applyPressed]}>
        <Text style={styles.applyText}>알림 조건 적용</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  handle: { alignSelf: 'center', width: 38, height: 4, marginTop: 9, backgroundColor: palette.borderStrong, borderRadius: radius.pill },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 5, color: palette.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: 2, color: palette.textSecondary, fontSize: 10 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  content: { gap: 12, paddingHorizontal: 18, paddingBottom: 12 },
  choiceList: { gap: 7 },
  choice: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  choiceSelected: { backgroundColor: palette.surfaceRaised, borderColor: palette.borderStrong },
  choiceIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  choiceIconSelected: { backgroundColor: palette.surfaceSelected },
  choiceText: { flex: 1, gap: 3 },
  choiceTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  choiceDescription: { color: palette.textSecondary, fontSize: 10 },
  check: { width: 23, height: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radius.control },
  checkSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  keywordCard: { gap: 10, padding: 12, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  keywordHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  keywordIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  keywordTitleWrap: { flex: 1, gap: 2 },
  keywordTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  keywordDescription: { color: palette.textSecondary, fontSize: 9 },
  keywordCount: { color: palette.accent, fontSize: 10, fontWeight: '800' },
  keywordForm: { flexDirection: 'row', gap: 7 },
  keywordInput: { flex: 1, height: 44, paddingHorizontal: 11, color: palette.text, backgroundColor: palette.background, borderRadius: radius.control, fontSize: 16 },
  addButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: radius.control },
  keywordList: { minHeight: 28, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  keywordChip: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, backgroundColor: '#202B25', borderWidth: 1, borderColor: '#385044', borderRadius: radius.pill },
  keywordChipText: { color: '#B8D8C4', fontSize: 10, fontWeight: '700' },
  emptyKeywords: { color: palette.textMuted, fontSize: 9 },
  applyButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginHorizontal: 18, marginTop: 8, marginBottom: Platform.OS === 'ios' ? 14 : 18, backgroundColor: palette.accent, borderRadius: radius.control },
  applyPressed: { backgroundColor: '#00D98B' },
  applyText: { color: palette.accentText, fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.76 },
});
