import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import type { CategoryFilter } from '@/types';

export default function CategoryFilterSheet() {
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const store = useAlertStore();
  const preference = store.preferences.find((item) => item.channelId === channelId);
  const streamer = store.streamers.find((item) => item.channelId === channelId);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<CategoryFilter>(
    preference?.categoryFilter ?? { allCategories: true, categoryKeys: [] },
  );
  const selected = useMemo(() => new Set(draft.categoryKeys), [draft.categoryKeys]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    if (!normalized) return store.categories;
    return store.categories.filter((category) => category.categoryValue.toLocaleLowerCase('ko-KR').includes(normalized));
  }, [query, store.categories]);

  function toggleCategory(categoryKey: string) {
    const next = new Set(draft.allCategories ? [] : draft.categoryKeys);
    if (next.has(categoryKey)) next.delete(categoryKey);
    else next.add(categoryKey);
    setDraft(next.size
      ? { allCategories: false, categoryKeys: [...next] }
      : { allCategories: true, categoryKeys: [] });
  }

  return (
    <View style={styles.screen}>
      {Platform.OS !== 'ios' && <View style={styles.handle} />}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CHZZK CATEGORY</Text>
          <Text style={styles.title}>카테고리 태그 선택</Text>
          <Text style={styles.subtitle}>{streamer?.channelName ?? '스트리머'}</Text>
        </View>
        <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.closeButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close' }} size={15} tintColor={palette.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.tools}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.allCategories }}
          onPress={() => setDraft({ allCategories: true, categoryKeys: [] })}
          style={[styles.allButton, draft.allCategories && styles.allButtonSelected]}>
          <View>
            <Text style={styles.allTitle}>전체 체크</Text>
            <Text style={styles.allDescription}>모든 방송 카테고리 알림</Text>
          </View>
          <View style={[styles.check, draft.allCategories && styles.checkSelected]}>
            {draft.allCategories && <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={13} tintColor={palette.accentText} />}
          </View>
        </Pressable>
        <View style={styles.search}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={15} tintColor={palette.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="카테고리 검색"
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {visible.map((category) => {
          const checked = !draft.allCategories && selected.has(category.categoryKey);
          return (
            <Pressable
              key={category.categoryKey}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => toggleCategory(category.categoryKey)}
              style={[styles.category, checked && styles.categorySelected]}>
              <View style={styles.categoryText}>
                <Text numberOfLines={1} style={styles.categoryTitle}>{category.categoryId === 'talk' ? '저챗' : category.categoryValue}</Text>
                <Text style={styles.categoryDescription}>라이브 {category.openLiveCount.toLocaleString()}개</Text>
              </View>
              <View style={[styles.check, checked && styles.checkSelected]}>
                {checked && <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={13} tintColor={palette.accentText} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => {
          if (channelId) store.updateCategoryFilter(channelId, draft);
          router.back();
        }}
        style={({ pressed }) => [styles.applyButton, pressed && styles.applyPressed]}>
        <Text style={styles.applyText}>카테고리 선택</Text>
      </Pressable>
    </View>
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
  tools: { gap: 8, paddingHorizontal: 18, paddingBottom: 10 },
  allButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  allButtonSelected: { backgroundColor: palette.surfaceRaised, borderColor: palette.borderStrong },
  allTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  allDescription: { marginTop: 3, color: palette.textSecondary, fontSize: 10 },
  check: { width: 23, height: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radius.control },
  checkSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
  search: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, backgroundColor: palette.background, borderRadius: radius.control },
  searchInput: { flex: 1, color: palette.text, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 18, paddingBottom: 10 },
  category: { width: '48.8%', minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, borderRadius: radius.card },
  categorySelected: { backgroundColor: palette.surfaceRaised, borderColor: palette.borderStrong },
  categoryText: { flex: 1, minWidth: 0, gap: 3 },
  categoryTitle: { color: palette.text, fontSize: 12, fontWeight: '800' },
  categoryDescription: { color: palette.textSecondary, fontSize: 9 },
  applyButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginHorizontal: 18, marginTop: 8, marginBottom: Platform.OS === 'ios' ? 14 : 18, backgroundColor: palette.accent, borderRadius: radius.control },
  applyPressed: { backgroundColor: '#00D98B' },
  applyText: { color: palette.accentText, fontSize: 13, fontWeight: '900' },
});
