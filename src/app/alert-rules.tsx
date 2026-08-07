import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
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
import { normalizedSearchText } from '@/data/category-catalog';
import { useAlertStore } from '@/features/alerts/alert-store';
import type { AlertRules, CategoryFilter, LiveCategory } from '@/types';

type EditorPane = 'main' | 'categories' | 'keywords';

const ruleChoices = [
  { key: 'liveStarted' as const, label: '방송 시작', description: '방송이 시작되면 알려드려요.' },
  { key: 'titleChanged' as const, label: '방제 변경', description: '방송 제목이 바뀌면 알려드려요.' },
  { key: 'categoryChanged' as const, label: '카테고리 변경', description: '누르면 감지할 카테고리를 설정해요.' },
];

function categoryTypeLabel(categoryType: string) {
  if (categoryType === 'GAME') return '게임';
  if (categoryType === 'SPORTS') return '스포츠';
  if (categoryType === 'ENTERTAINMENT') return '엔터테인먼트';
  return '기타';
}

export default function AlertRulesSheet() {
  const { channelId, scope } = useLocalSearchParams<{ channelId?: string; scope?: string }>();
  const store = useAlertStore();
  const isAll = scope === 'all';
  const { searchCategories } = store;
  const preference = store.preferences.find((item) => item.channelId === channelId);
  const streamer = store.streamers.find((item) => item.channelId === channelId);
  const initialPreference = preference ?? (isAll ? store.preferences[0] : undefined);
  const [activePane, setActivePane] = useState<EditorPane>('main');
  const [rules, setRules] = useState<AlertRules>(() => ({
    liveStarted: initialPreference?.liveStarted ?? true,
    titleChanged: initialPreference?.titleChanged ?? true,
    categoryChanged: initialPreference?.categoryChanged ?? true,
    keywords: [...(initialPreference?.keywords ?? [])],
  }));
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(
    initialPreference?.categoryFilter ?? { allCategories: true, categoryKeys: [] },
  );
  const [categoryQuery, setCategoryQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const categoryByKey = useMemo(
    () => new Map(store.categories.map((category) => [category.categoryKey, category])),
    [store.categories],
  );
  const selectedCategoryKeys = useMemo(() => new Set(categoryFilter.categoryKeys), [categoryFilter.categoryKeys]);
  const categoryResults = useMemo(() => {
    const normalized = normalizedSearchText(categoryQuery);
    if (!normalized) return [];
    return store.categories.filter((category) => normalizedSearchText(category.categoryValue).includes(normalized)).slice(0, 30);
  }, [categoryQuery, store.categories]);
  const normalizedKeyword = keyword.normalize('NFKC').trim().replace(/\s+/g, ' ');
  const canAddKeyword = normalizedKeyword.length >= 2 && rules.keywords.length < 10;
  const selectionDisabled = activePane === 'keywords' && rules.keywords.length === 0;

  useEffect(() => {
    if (activePane !== 'categories' || !categoryQuery.trim()) return;
    const timer = setTimeout(() => {
      void searchCategories(categoryQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [activePane, categoryQuery, searchCategories]);

  function addKeyword() {
    const normalized = keyword.normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (normalized.length < 2 || rules.keywords.length >= 10) return;
    if (!rules.keywords.some((item) => item.toLocaleLowerCase('ko-KR') === normalized.toLocaleLowerCase('ko-KR'))) {
      setRules((current) => ({ ...current, keywords: [...current.keywords, normalized] }));
    }
    setKeyword('');
  }

  function toggleCategory(category: LiveCategory) {
    const next = new Set(categoryFilter.categoryKeys);
    if (next.has(category.categoryKey)) next.delete(category.categoryKey);
    else next.add(category.categoryKey);
    setCategoryFilter({ allCategories: next.size === 0, categoryKeys: [...next] });
  }

  function apply() {
    Keyboard.dismiss();
    if (isAll) {
      store.updateAllRules(rules);
      store.updateAllCategoryFilter(categoryFilter);
    } else if (channelId) {
      store.updateRules(channelId, rules);
      store.updateCategoryFilter(channelId, categoryFilter);
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      collapsable={false}
      keyboardVerticalOffset={8}
      style={styles.screen}>
      {Platform.OS !== 'ios' && <View style={styles.handle} />}
      <View collapsable={false} style={styles.header}>
        <View>
          <Text style={styles.title}>
            {activePane === 'main' ? (isAll ? '조건 전체 적용' : '알림 조건') : activePane === 'categories' ? '카테고리 선택' : '방제 변경 설정'}
          </Text>
          <Text style={styles.subtitle}>{isAll ? '모든 스트리머에 적용' : streamer?.channelName ?? '스트리머'}</Text>
        </View>
        <Pressable
          accessibilityLabel={activePane === 'main' ? '닫기' : '알림 조건으로 돌아가기'}
          onPress={() => activePane === 'main' ? router.back() : setActivePane('main')}
          style={({ pressed }) => [styles.closeButton, pressed && styles.controlPressed]}>
          <SymbolView
            name={activePane === 'main'
              ? { ios: 'xmark', android: 'close' }
              : { ios: 'chevron.left', android: 'arrow_back' }}
            size={15}
            tintColor={palette.textSecondary}
          />
        </Pressable>
      </View>

      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled">
        {activePane === 'main' && (
          <View>
            <View style={styles.choiceList}>
              {ruleChoices.map((choice) => {
                const selected = rules[choice.key];
                const configurable = choice.key !== 'liveStarted';
                const icon = choice.key === 'liveStarted'
                  ? { ios: 'bell.badge' as const, android: 'notifications_active' as const }
                  : choice.key === 'titleChanged'
                    ? { ios: 'textformat' as const, android: 'title' as const }
                    : { ios: 'tag' as const, android: 'sell' as const };
                const description = choice.key === 'titleChanged'
                  ? rules.keywords.length
                    ? `${rules.keywords.length}개 키워드 등록됨`
                    : '누르면 방제 키워드를 설정해요.'
                  : choice.key === 'categoryChanged'
                    ? categoryFilter.categoryKeys.length
                      ? `${categoryFilter.categoryKeys.length}개 카테고리만 알림`
                      : '모든 카테고리 변경을 알려드려요.'
                    : choice.description;
                const toggle = () => setRules((current) => ({ ...current, [choice.key]: !current[choice.key] }));
                if (!configurable) {
                  return (
                    <Pressable
                      key={choice.key}
                      accessibilityLabel={`${choice.label} ${selected ? '끄기' : '켜기'}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={toggle}
                      style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.choicePressed]}>
                      <View style={styles.choiceBody}>
                        <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
                          <SymbolView name={icon} size={16} tintColor={selected ? palette.accent : palette.textSecondary} />
                        </View>
                        <View style={styles.choiceText}>
                          <Text style={styles.choiceTitle}>{choice.label}</Text>
                          <Text style={styles.choiceDescription}>{description}</Text>
                        </View>
                      </View>
                      <View style={styles.choiceDivider} />
                      <View style={styles.checkButton}>
                        <View style={[styles.check, selected && styles.checkSelected]}>
                          {selected && <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={14} tintColor={palette.accentText} />}
                        </View>
                      </View>
                    </Pressable>
                  );
                }
                return (
                  <View key={choice.key} style={styles.splitChoice}>
                    <Pressable
                      accessibilityLabel={`${choice.label} 설정`}
                      onPress={() => {
                        if (choice.key === 'titleChanged') setActivePane('keywords');
                        else setActivePane('categories');
                      }}
                      style={({ pressed }) => [styles.choiceSettings, selected && styles.choiceSelected, pressed && styles.choicePressed]}>
                      <View style={[styles.choiceIcon, selected && styles.choiceIconSelected]}>
                        <SymbolView name={icon} size={16} tintColor={selected ? palette.accent : palette.textSecondary} />
                      </View>
                      <View style={styles.choiceText}>
                        <Text style={styles.choiceTitle}>{choice.label}</Text>
                        <Text style={styles.choiceDescription}>{description}</Text>
                      </View>
                      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={13} tintColor={palette.textMuted} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`${choice.label} ${selected ? '끄기' : '켜기'}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={toggle}
                      style={({ pressed }) => [styles.detachedCheckButton, selected && styles.detachedCheckButtonSelected, pressed && styles.choicePressed]}>
                      <View style={[styles.check, selected && styles.checkSelected]}>
                        {selected && <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={14} tintColor={palette.accentText} />}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {activePane === 'categories' && (
          <View style={styles.editorSection}>
            <Text style={styles.sectionDescription}>
              검색해서 원하는 카테고리를 추가하세요. 아무것도 추가하지 않으면 모든 카테고리 변경을 알려드립니다.
            </Text>
            <View style={styles.search}>
              <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={15} tintColor={palette.textMuted} />
              <TextInput
                value={categoryQuery}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setCategoryQuery}
                placeholder="카테고리 검색 · 띄어쓰기 생략 가능"
                placeholderTextColor={palette.textMuted}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {!!categoryQuery && (
                <Pressable accessibilityLabel="검색어 지우기" onPress={() => setCategoryQuery('')}>
                  <SymbolView name={{ ios: 'xmark.circle.fill', android: 'cancel' }} size={16} tintColor={palette.textMuted} />
                </Pressable>
              )}
            </View>

            {!!categoryFilter.categoryKeys.length && (
              <View style={styles.selectedBlock}>
                <View style={styles.selectedHeader}>
                  <Text style={styles.selectedTitle}>추가한 카테고리 {categoryFilter.categoryKeys.length}개</Text>
                  <Pressable onPress={() => setCategoryFilter({ allCategories: true, categoryKeys: [] })}>
                    <Text style={styles.clearText}>모두 지우기</Text>
                  </Pressable>
                </View>
                <View style={styles.selectedCategories}>
                    {categoryFilter.categoryKeys.map((key) => {
                      const category = categoryByKey.get(key);
                      return (
                        <Pressable
                          key={key}
                          onPress={() => category && toggleCategory(category)}
                          style={({ pressed }) => [styles.categoryChip, pressed && styles.chipPressed]}>
                          <Text numberOfLines={1} style={styles.categoryChipText}>{category?.categoryValue ?? key}</Text>
                          <SymbolView name={{ ios: 'xmark', android: 'close' }} size={9} tintColor="#B8D8C4" />
                        </Pressable>
                      );
                    })}
                </View>
              </View>
            )}

            <View style={styles.searchResults}>
                  {categoryResults.map((category) => {
                    const selected = selectedCategoryKeys.has(category.categoryKey);
                    return (
                      <Pressable
                        key={category.categoryKey}
                        onPress={() => toggleCategory(category)}
                        style={({ pressed }) => [styles.resultRow, pressed && styles.rowPressed]}>
                        <View style={styles.resultText}>
                          <Text style={styles.resultTitle}>{category.categoryValue}</Text>
                          <Text style={styles.resultMeta}>
                            {categoryTypeLabel(category.categoryType)}
                          </Text>
                        </View>
                        <View style={[styles.addResult, selected && styles.addResultSelected]}>
                          <SymbolView
                            name={{ ios: selected ? 'checkmark' : 'plus', android: selected ? 'check' : 'add' }}
                            size={13}
                            tintColor={selected ? palette.accentText : palette.text}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                  {!!categoryQuery.trim() && !categoryResults.length && (
                    <Text style={styles.emptyText}>일치하는 카테고리가 없습니다.</Text>
                  )}
            </View>
          </View>
        )}

        {activePane === 'keywords' && (
          <View style={styles.editorSection}>
            <View style={styles.keywordHeader}>
              <View style={styles.keywordIcon}>
                <SymbolView name={{ ios: 'text.magnifyingglass', android: 'search' }} size={16} tintColor={palette.accent} />
              </View>
              <View style={styles.keywordTitleWrap}>
                <Text style={styles.keywordTitle}>방제 키워드</Text>
                <Text style={styles.keywordDescription}>새 방제에 단어가 포함되면 알려드려요.</Text>
              </View>
              <Text style={styles.keywordCount}>{rules.keywords.length}/10</Text>
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
                disabled={!canAddKeyword}
                onPress={addKeyword}
                style={({ pressed }) => [
                  styles.addButton,
                  !canAddKeyword && styles.disabledButton,
                  pressed && canAddKeyword && styles.actionPressed,
                ]}>
                <SymbolView
                  name={{ ios: 'plus', android: 'add' }}
                  size={17}
                  tintColor={canAddKeyword ? palette.accentText : palette.textMuted}
                />
              </Pressable>
            </View>
            <View style={styles.keywordList}>
              {rules.keywords.map((item) => (
                <Pressable
                  key={item.toLocaleLowerCase('ko-KR')}
                  onPress={() => setRules((current) => ({
                    ...current,
                    keywords: current.keywords.filter((keywordItem) => keywordItem !== item),
                  }))}
                  style={({ pressed }) => [styles.keywordChip, pressed && styles.chipPressed]}>
                  <Text style={styles.keywordChipText}>#{item}</Text>
                  <SymbolView name={{ ios: 'xmark', android: 'close' }} size={9} tintColor="#B8D8C4" />
                </Pressable>
              ))}
              {!rules.keywords.length && <Text style={styles.emptyText}>아직 등록한 키워드가 없습니다.</Text>}
            </View>
          </View>
        )}
        <View style={styles.footer}>
          <Pressable
            disabled={selectionDisabled}
            onPress={() => activePane === 'main' ? apply() : setActivePane('main')}
            style={({ pressed }) => [
              styles.applyButton,
              selectionDisabled && styles.disabledButton,
              pressed && !selectionDisabled && styles.applyPressed,
            ]}>
            <Text style={[styles.applyText, selectionDisabled && styles.disabledButtonText]}>
              {activePane === 'main' ? '알림 조건 저장' : '선택 완료'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  handle: { alignSelf: 'center', width: 38, height: 4, marginTop: 9, backgroundColor: palette.borderStrong, borderRadius: radius.pill },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12 },
  title: { color: palette.text, fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  subtitle: { marginTop: 2, color: palette.textSecondary, fontSize: 12 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 72 },
  choiceList: { gap: 8 },
  splitChoice: { minHeight: 68, flexDirection: 'row', alignItems: 'stretch', gap: 7 },
  choiceSettings: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  detachedCheckButton: { width: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  detachedCheckButtonSelected: { backgroundColor: palette.surfaceRaised, borderColor: palette.borderStrong },
  choice: { minHeight: 68, flexDirection: 'row', alignItems: 'stretch', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card, overflow: 'hidden' },
  choiceSelected: { backgroundColor: palette.surfaceRaised, borderColor: palette.borderStrong },
  choicePressed: { backgroundColor: '#3A3C40', borderColor: '#4B4E53', transform: [{ scale: 0.995 }] },
  choiceBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11 },
  choiceIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  choiceIconSelected: { backgroundColor: palette.surfaceSelected },
  choiceText: { flex: 1, gap: 3 },
  choiceTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  choiceDescription: { color: palette.textSecondary, fontSize: 12 },
  choiceDivider: { width: StyleSheet.hairlineWidth, marginVertical: 10, backgroundColor: palette.borderStrong },
  checkButton: { width: 52, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: 8 },
  checkSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  navigationCard: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  editorSection: { gap: 11 },
  sectionDescription: { color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
  search: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, backgroundColor: palette.background, borderRadius: radius.control },
  searchInput: { flex: 1, color: palette.text, fontSize: 15 },
  selectedBlock: { gap: 8, padding: 10, backgroundColor: palette.surfaceRaised, borderRadius: radius.card },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedTitle: { color: palette.text, fontSize: 12, fontWeight: '800' },
  clearText: { color: palette.textSecondary, fontSize: 11, fontWeight: '700' },
  selectedCategories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChip: { maxWidth: '100%', minHeight: 29, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, backgroundColor: '#202B25', borderWidth: 1, borderColor: '#385044', borderRadius: radius.pill },
  categoryChipText: { flexShrink: 1, color: '#B8D8C4', fontSize: 11, fontWeight: '700' },
  searchResults: { overflow: 'hidden', borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  resultRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  rowPressed: { backgroundColor: palette.surfaceRaised },
  resultText: { flex: 1, minWidth: 0, gap: 3 },
  resultTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  resultMeta: { color: palette.textSecondary, fontSize: 11 },
  addResult: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: 8 },
  addResultSelected: { backgroundColor: palette.accent },
  emptyText: { padding: 18, color: palette.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 17 },
  keywordHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, backgroundColor: palette.surfaceRaised, borderRadius: radius.card },
  keywordIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceSelected, borderRadius: radius.control },
  keywordTitleWrap: { flex: 1, gap: 2 },
  keywordTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  keywordDescription: { color: palette.textSecondary, fontSize: 11 },
  keywordCount: { color: palette.accent, fontSize: 12, fontWeight: '800' },
  keywordForm: { flexDirection: 'row', gap: 7 },
  keywordInput: { flex: 1, height: 46, paddingHorizontal: 11, color: palette.text, backgroundColor: palette.background, borderRadius: radius.control, fontSize: 16 },
  addButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: radius.control },
  keywordList: { minHeight: 45, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  keywordChip: { minHeight: 29, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, backgroundColor: '#202B25', borderWidth: 1, borderColor: '#385044', borderRadius: radius.pill },
  keywordChipText: { color: '#B8D8C4', fontSize: 11, fontWeight: '700' },
  chipPressed: { backgroundColor: palette.surfaceSelected, borderColor: '#4B4E53' },
  footer: { marginTop: 18, paddingBottom: Platform.OS === 'ios' ? 12 : 16 },
  applyButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: radius.control },
  applyPressed: { backgroundColor: '#00D98B' },
  actionPressed: { backgroundColor: '#00D98B' },
  disabledButton: { backgroundColor: palette.surfaceRaised },
  disabledButtonText: { color: palette.textMuted },
  controlPressed: { backgroundColor: palette.surfaceSelected },
  applyText: { color: palette.accentText, fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
