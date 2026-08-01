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

import { api } from '@/api/client';
import { palette, radius } from '@/constants/theme';
import { getInstallationId } from '@/notifications/native-push';

type SuggestionType = 'streamer_request' | 'idea' | 'bug' | 'usability';

const choices: { key: SuggestionType; label: string }[] = [
  { key: 'streamer_request', label: '스트리머' },
  { key: 'idea', label: '아이디어' },
  { key: 'bug', label: '오류' },
  { key: 'usability', label: '사용성' },
];

export default function SuggestionSheet() {
  const params = useLocalSearchParams<{ streamerName?: string }>();
  const initialStreamerName = typeof params.streamerName === 'string' ? params.streamerName : '';
  const [type, setType] = useState<SuggestionType>(initialStreamerName ? 'streamer_request' : 'idea');
  const [value, setValue] = useState(initialStreamerName);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const valid = useMemo(
    () => type === 'streamer_request' ? value.trim().length > 0 : value.trim().length >= 5,
    [type, value],
  );

  async function submit() {
    if (!valid || state === 'sending') return;
    setState('sending');
    try {
      const anonymousId = await getInstallationId();
      await api.feedback(type === 'streamer_request'
        ? { category: type, streamerName: value.trim(), anonymousId }
        : { category: type, message: value.trim(), anonymousId });
      setState('done');
    } catch {
      setState('failed');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      collapsable={false}
      keyboardVerticalOffset={8}
      style={styles.screen}>
      <View collapsable={false} style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>GROW TOGETHER</Text>
          <Text style={styles.title}>제안하기</Text>
          <Text style={styles.subtitle}>더 좋은 구데기를 함께 만들어요.</Text>
        </View>
        <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.closeButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close' }} size={15} tintColor={palette.textSecondary} />
        </Pressable>
      </View>

      {state === 'done' ? (
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={24} tintColor={palette.accentText} />
          </View>
          <Text style={styles.doneTitle}>제안을 접수했어요</Text>
          <Text style={styles.doneDescription}>검토한 뒤 서비스 개선에 반영할게요.</Text>
          <Pressable onPress={() => router.back()} style={styles.doneButton}>
            <Text style={styles.doneButtonText}>확인</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={styles.content}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled">
            <View style={styles.types}>
              {choices.map((choice) => (
                <Pressable
                  key={choice.key}
                  onPress={() => {
                    setType(choice.key);
                    setValue('');
                    setState('idle');
                  }}
                  style={[styles.typeButton, type === choice.key && styles.typeButtonSelected]}>
                  <Text style={[styles.typeText, type === choice.key && styles.typeTextSelected]}>{choice.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{type === 'streamer_request' ? '추가할 스트리머' : '의견을 들려주세요'}</Text>
              <Text style={styles.formDescription}>
                {type === 'streamer_request'
                  ? '치지직 채널명이나 채널 주소를 입력해 주세요.'
                  : '개인정보를 제외하고 편하게 적어주세요.'}
              </Text>
              <TextInput
                value={value}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={type === 'streamer_request' ? 80 : 1000}
                multiline={type !== 'streamer_request'}
                onChangeText={(next) => {
                  setValue(next);
                  if (state === 'failed') setState('idle');
                }}
                placeholder={type === 'streamer_request' ? '스트리머 이름' : '제안 내용을 입력하세요'}
                placeholderTextColor={palette.textMuted}
                style={[styles.input, type !== 'streamer_request' && styles.multilineInput]}
              />
              <Text style={styles.count}>{value.length}/{type === 'streamer_request' ? 80 : 1000}</Text>
              {state === 'failed' && <Text style={styles.error}>전송하지 못했습니다. 서버 연결을 확인하고 다시 시도해 주세요.</Text>}
            </View>
            <Pressable
              disabled={!valid || state === 'sending'}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.submit, (!valid || state === 'sending') && styles.submitDisabled, pressed && styles.pressed]}>
              <Text style={styles.submitText}>{state === 'sending' ? '보내는 중…' : '제안 보내기'}</Text>
            </Pressable>
          </ScrollView>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { marginTop: 5, color: palette.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { marginTop: 2, color: palette.textSecondary, fontSize: 10 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  content: { gap: 12, paddingHorizontal: 18, paddingBottom: 34 },
  types: { height: 42, flexDirection: 'row', gap: 4, padding: 4, backgroundColor: palette.background, borderRadius: radius.control },
  typeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  typeButtonSelected: { backgroundColor: palette.surfaceRaised },
  typeText: { color: palette.textSecondary, fontSize: 10, fontWeight: '800' },
  typeTextSelected: { color: palette.accent },
  formCard: { padding: 14, backgroundColor: palette.surfaceRaised, borderRadius: radius.card },
  formTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  formDescription: { marginTop: 4, color: palette.textSecondary, fontSize: 10, lineHeight: 15 },
  input: { height: 48, marginTop: 13, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.background, borderRadius: radius.control, fontSize: 15 },
  multilineInput: { height: 150, paddingTop: 12, textAlignVertical: 'top' },
  count: { marginTop: 6, color: palette.textMuted, textAlign: 'right', fontSize: 9 },
  error: { marginTop: 8, color: '#FF8E8E', fontSize: 10, lineHeight: 15 },
  submit: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: radius.control },
  submitDisabled: { opacity: 0.38 },
  submitText: { color: palette.accentText, fontSize: 13, fontWeight: '900' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  doneIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 13, backgroundColor: palette.accent, borderRadius: 26 },
  doneTitle: { color: palette.text, fontSize: 18, fontWeight: '900' },
  doneDescription: { marginTop: 5, color: palette.textSecondary, fontSize: 11 },
  doneButton: { minWidth: 150, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 20, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  doneButtonText: { color: palette.text, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
