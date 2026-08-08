import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radius } from '@/constants/theme';
import { normalizedSearchText } from '@/data/category-catalog';
import { useAlertStore } from '@/features/alerts/alert-store';
import type { LiveCategory } from '@/types';

const MAX_CATEGORY_FOLLOWS = 30;

function categoryTypeLabel(type: string) {
  if (type === 'GAME') return '게임';
  if (type === 'SPORTS') return '스포츠';
  return '기타';
}

export default function CategoryPickerSheet() {
  const store = useAlertStore();
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizedSearchText(query);
  const followed = useMemo(
    () => new Set(store.followedCategoryKeys),
    [store.followedCategoryKeys],
  );
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return store.categories
      .filter((category) => normalizedSearchText(category.categoryValue).includes(normalizedQuery))
      .sort((left, right) => (
        Number(followed.has(right.categoryKey)) - Number(followed.has(left.categoryKey))
        || right.concurrentUserCount - left.concurrentUserCount
        || left.categoryValue.localeCompare(right.categoryValue, 'ko-KR')
      ))
      .slice(0, 50);
  }, [followed, normalizedQuery, store.categories]);

  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => void store.searchCategories(query), 350);
    return () => clearTimeout(timer);
  }, [query, store]);

  function toggle(category: LiveCategory) {
    if (!followed.has(category.categoryKey) && followed.size >= MAX_CATEGORY_FOLLOWS) {
      Alert.alert('최대 30개까지 추가할 수 있어요');
      return;
    }
    store.toggleCategoryFollow(category.categoryKey);
  }

  function renderCategory({ item }: { item: LiveCategory }) {
    const selected = followed.has(item.categoryKey);
    return (
      <View style={styles.row}>
        {item.posterImageUrl ? (
          <Image source={item.posterImageUrl} style={styles.poster} contentFit="cover" />
        ) : (
          <View style={styles.posterFallback}>
            <SymbolView name={{ ios: 'tag', android: 'sell' }} size={18} tintColor={palette.textSecondary} />
          </View>
        )}
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.categoryName}>{item.categoryValue}</Text>
          <Text style={styles.categoryType}>{categoryTypeLabel(item.categoryType)}</Text>
        </View>
        <Pressable
          accessibilityLabel={`${item.categoryValue} ${selected ? '팔로우 해제' : '팔로우 추가'}`}
          onPress={() => toggle(item)}
          style={({ pressed }) => [styles.followButton, selected && styles.followButtonSelected, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: selected ? 'checkmark' : 'plus', android: selected ? 'check' : 'add' }}
            size={14}
            tintColor={selected ? palette.accent : palette.text}
          />
          <Text style={[styles.followText, selected && styles.followTextSelected]}>
            {selected ? '추가됨' : '추가'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>카테고리 추가</Text>
          <Text style={styles.subtitle}>{followed.size}/{MAX_CATEGORY_FOLLOWS}개 팔로우 중</Text>
        </View>
        <Pressable accessibilityLabel="닫기" onPress={() => router.back()} style={styles.closeButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close' }} size={15} tintColor={palette.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.search}>
        <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={16} tintColor={palette.textMuted} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="게임이나 카테고리 검색"
          placeholderTextColor={palette.textMuted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.input}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(category) => category.categoryKey}
        renderItem={renderCategory}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListEmptyComponent={normalizedQuery ? (
          <View style={styles.empty}>
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search' }}
              size={24}
              tintColor={palette.textMuted}
            />
            <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
            <Text style={styles.emptyDescription}>다른 이름으로 다시 검색해 보세요.</Text>
          </View>
        ) : <View style={styles.emptySpace} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.surface },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8 },
  title: { color: palette.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { marginTop: 3, color: palette.textSecondary, fontSize: 11 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  search: { height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 10, paddingHorizontal: 11, backgroundColor: palette.background, borderRadius: radius.card },
  input: { flex: 1, color: palette.text, fontSize: 14 },
  content: { paddingHorizontal: 14, paddingBottom: 24 },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: palette.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  poster: { width: 38, height: 46, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  posterFallback: { width: 38, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  rowText: { flex: 1, minWidth: 0 },
  categoryName: { color: palette.text, fontSize: 14, fontWeight: '800' },
  categoryType: { marginTop: 2, color: palette.textSecondary, fontSize: 10 },
  followButton: { minWidth: 68, height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  followButtonSelected: { backgroundColor: palette.surfaceSelected },
  followText: { color: palette.text, fontSize: 11, fontWeight: '800' },
  followTextSelected: { color: palette.accent },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 54 },
  emptyTitle: { marginTop: 11, color: palette.text, fontSize: 14, fontWeight: '800' },
  emptyDescription: { marginTop: 5, color: palette.textSecondary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  emptySpace: { height: 24 },
  pressed: { opacity: 0.72 },
});
