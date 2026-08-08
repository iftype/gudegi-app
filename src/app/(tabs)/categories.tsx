import { Image } from 'expo-image';
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

import { ScreenHeader } from '@/components/screen-header';
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

export default function CategoriesScreen() {
  const store = useAlertStore();
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizedSearchText(query);
  const followed = useMemo(
    () => new Set(store.followedCategoryKeys),
    [store.followedCategoryKeys],
  );
  const categoryByKey = useMemo(
    () => new Map(store.categories.map((category) => [category.categoryKey, category])),
    [store.categories],
  );
  const selectedCategories = useMemo(
    () => store.followedCategoryKeys.map((key) => categoryByKey.get(key) ?? {
      categoryKey: key,
      categoryType: key.split(':', 1)[0] ?? 'ETC',
      categoryId: key.slice(key.indexOf(':') + 1),
      categoryValue: key,
      posterImageUrl: null,
      openLiveCount: 0,
      concurrentUserCount: 0,
      syncedAt: 0,
    }),
    [categoryByKey, store.followedCategoryKeys],
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
      .slice(0, 40);
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
      <Pressable
        accessibilityLabel={`${item.categoryValue} ${selected ? '팔로우 해제' : '팔로우'}`}
        accessibilityRole="button"
        onPress={() => toggle(item)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {item.posterImageUrl ? (
          <Image source={item.posterImageUrl} style={styles.poster} contentFit="cover" />
        ) : (
          <View style={styles.posterFallback}>
            <SymbolView
              name={{ ios: 'tag', android: 'sell' }}
              size={18}
              tintColor={palette.textSecondary}
            />
          </View>
        )}
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.categoryName}>{item.categoryValue}</Text>
          <Text style={styles.categoryType}>{categoryTypeLabel(item.categoryType)}</Text>
        </View>
        <View style={[styles.followButton, selected && styles.followButtonSelected]}>
          <SymbolView
            name={{ ios: selected ? 'checkmark' : 'plus', android: selected ? 'check' : 'add' }}
            size={15}
            tintColor={selected ? palette.accent : palette.textSecondary}
          />
          <Text style={[styles.followText, selected && styles.followTextSelected]}>
            {selected ? '팔로우 중' : '팔로우'}
          </Text>
        </View>
      </Pressable>
    );
  }

  const data = normalizedQuery ? results : selectedCategories;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader serverUnavailable={store.serverState === 'unavailable'} />
      <FlatList
        data={data}
        keyExtractor={(category) => category.categoryKey}
        renderItem={renderCategory}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <>
            <View style={styles.intro}>
              <Text style={styles.title}>카테고리 팔로우</Text>
              <Text style={styles.description}>
                스트리머를 추가하지 않아도 관심 카테고리를 시작한 방송을 알려드려요.
              </Text>
            </View>
            <View style={styles.policy}>
              <SymbolView
                name={{ ios: 'person.2', android: 'group' }}
                size={16}
                tintColor={palette.accent}
              />
              <Text style={styles.policyText}>
                시청자 100명 이상 방송 대상 · 상위 방송 약 1분, 그 외 약 5분 간격
              </Text>
            </View>
            {store.notificationState !== 'connected' && (
              <Pressable
                onPress={() => void store.connectNotifications()}
                style={({ pressed }) => [styles.notificationCard, pressed && styles.pressed]}>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>알림 연결이 필요해요</Text>
                  <Text style={styles.notificationDescription}>선택한 카테고리 알림을 이 기기에서 받아보세요.</Text>
                </View>
                <Text style={styles.notificationAction}>연결</Text>
              </Pressable>
            )}
            <View style={styles.search}>
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search' }}
                size={17}
                tintColor={palette.textMuted}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="게임이나 카테고리 검색"
                placeholderTextColor={palette.textMuted}
                returnKeyType="search"
                clearButtonMode="while-editing"
                style={styles.input}
              />
            </View>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>
                {normalizedQuery ? '검색 결과' : '팔로우 중'}
              </Text>
              <Text style={styles.sectionCount}>
                {normalizedQuery ? `${results.length}개` : `${selectedCategories.length}/${MAX_CATEGORY_FOLLOWS}`}
              </Text>
            </View>
          </>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <SymbolView
              name={{ ios: normalizedQuery ? 'magnifyingglass' : 'tag', android: normalizedQuery ? 'search' : 'sell' }}
              size={25}
              tintColor={palette.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {normalizedQuery ? '검색 결과가 없어요' : '팔로우한 카테고리가 없어요'}
            </Text>
            <Text style={styles.emptyDescription}>
              {normalizedQuery ? '다른 이름으로 검색해 보세요.' : '위 검색창에서 관심 있는 게임을 찾아보세요.'}
            </Text>
          </View>
        )}
        ListFooterComponent={data.length ? (
          <Text style={styles.footerNote}>
            방송이 선택한 카테고리로 새로 진입할 때 한 번만 알려드려요.
          </Text>
        ) : <View style={styles.footerSpace} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 14, paddingBottom: 112 },
  intro: { marginBottom: 12, paddingHorizontal: 2 },
  title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.3 },
  description: { marginTop: 5, color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  policy: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  policyText: { flex: 1, color: palette.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  notificationCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  notificationDescription: { marginTop: 2, color: palette.textSecondary, fontSize: 10, lineHeight: 14 },
  notificationAction: { color: palette.accent, fontSize: 12, fontWeight: '900' },
  search: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
  },
  input: { flex: 1, color: palette.text, fontSize: 14 },
  sectionHeading: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  sectionTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  sectionCount: { color: palette.textSecondary, fontSize: 11, fontWeight: '700' },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  poster: { width: 40, height: 48, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  posterFallback: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  rowText: { flex: 1, minWidth: 0 },
  categoryName: { color: palette.text, fontSize: 15, fontWeight: '800' },
  categoryType: { marginTop: 3, color: palette.textSecondary, fontSize: 11 },
  followButton: { minWidth: 72, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  followButtonSelected: { backgroundColor: palette.surfaceSelected },
  followText: { color: palette.textSecondary, fontSize: 11, fontWeight: '800' },
  followTextSelected: { color: palette.accent },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 42, backgroundColor: palette.surface, borderRadius: radius.card },
  emptyTitle: { marginTop: 10, color: palette.text, fontSize: 14, fontWeight: '800' },
  emptyDescription: { marginTop: 4, color: palette.textSecondary, fontSize: 11 },
  footerNote: { paddingHorizontal: 4, paddingVertical: 18, color: palette.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  footerSpace: { height: 18 },
  pressed: { opacity: 0.72 },
});
