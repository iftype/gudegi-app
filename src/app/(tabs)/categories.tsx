import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import { useLocalRefresh } from '@/hooks/use-local-refresh';
import type { LiveCategory } from '@/types';

const MAX_CATEGORY_FOLLOWS = 30;

function categoryTypeLabel(type: string) {
  if (type === 'GAME') return '게임';
  if (type === 'SPORTS') return '스포츠';
  return '기타';
}

function fallbackCategory(categoryKey: string): LiveCategory {
  const separator = categoryKey.indexOf(':');
  return {
    categoryKey,
    categoryType: separator > 0 ? categoryKey.slice(0, separator) : 'ETC',
    categoryId: separator > 0 ? categoryKey.slice(separator + 1) : categoryKey,
    categoryValue: categoryKey,
    posterImageUrl: null,
    openLiveCount: 0,
    concurrentUserCount: 0,
    syncedAt: 0,
  };
}

export default function CategoriesScreen() {
  const store = useAlertStore();
  const tabRefresh = useLocalRefresh(store.refresh);
  const categoryByKey = useMemo(
    () => new Map(store.categories.map((category) => [category.categoryKey, category])),
    [store.categories],
  );
  const selectedCategories = useMemo(
    () => store.followedCategoryKeys.map(
      (key) => categoryByKey.get(key) ?? fallbackCategory(key),
    ),
    [categoryByKey, store.followedCategoryKeys],
  );

  function remove(category: LiveCategory) {
    Alert.alert(
      '카테고리 팔로우 해제',
      `${category.categoryValue} 알림을 그만 받을까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: () => store.toggleCategoryFollow(category.categoryKey),
        },
      ],
    );
  }

  function renderCategory({ item }: { item: LiveCategory }) {
    return (
      <View style={styles.row}>
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
        <Pressable
          accessibilityLabel={`${item.categoryValue} 알림 기록`}
          onPress={() => router.navigate({
            pathname: '/category-log',
            params: { categoryKey: item.categoryKey, categoryName: item.categoryValue },
          })}
          style={({ pressed }) => [styles.rowText, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={styles.categoryName}>{item.categoryValue}</Text>
          <Text style={styles.categoryType}>{categoryTypeLabel(item.categoryType)}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${item.categoryValue} 알림 기록`}
          onPress={() => router.navigate({
            pathname: '/category-log',
            params: { categoryKey: item.categoryKey, categoryName: item.categoryValue },
          })}
          style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'clock.arrow.circlepath', android: 'history' }}
            size={14}
            tintColor={palette.textSecondary}
          />
          <Text style={styles.logText}>LOG</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${item.categoryValue} 팔로우 해제`}
          onPress={() => remove(item)}
          style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close' }}
            size={13}
            tintColor={palette.textMuted}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader serverUnavailable={store.serverState === 'unavailable'} />
      <FlatList
        data={selectedCategories}
        keyExtractor={(category) => category.categoryKey}
        renderItem={renderCategory}
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={tabRefresh.refreshing}
            onRefresh={tabRefresh.onRefresh}
            tintColor={palette.accent}
          />
        )}
        ListHeaderComponent={(
          <>
            <View style={styles.intro}>
              <View style={styles.introText}>
                <Text style={styles.title}>카테고리 팔로우</Text>
                <Text style={styles.description}>관심 카테고리를 시작한 방송을 알려드려요.</Text>
              </View>
              <Pressable
                accessibilityLabel="카테고리 팔로우 추가"
                onPress={() => router.navigate('/category-picker')}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <SymbolView name={{ ios: 'plus', android: 'add' }} size={16} tintColor={palette.accentText} />
                <Text style={styles.addButtonText}>추가</Text>
              </Pressable>
            </View>
            <View style={styles.policy}>
              <SymbolView
                name={{ ios: 'person.2', android: 'group' }}
                size={16}
                tintColor={palette.accent}
              />
              <Text style={styles.policyText}>시청자 100명 이상 방송 대상</Text>
              <Text style={styles.count}>{selectedCategories.length}/{MAX_CATEGORY_FOLLOWS}</Text>
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
            {!!selectedCategories.length && (
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>팔로우 중</Text>
                <Text style={styles.sectionHint}>LOG에서 시작한 스트리머를 확인할 수 있어요</Text>
              </View>
            )}
          </>
        )}
        ListEmptyComponent={(
          <Pressable
            accessibilityLabel="첫 카테고리 팔로우 추가"
            onPress={() => router.navigate('/category-picker')}
            style={({ pressed }) => [styles.empty, pressed && styles.pressed]}>
            <View style={styles.emptyIcon}>
              <SymbolView name={{ ios: 'tag', android: 'sell' }} size={23} tintColor={palette.accent} />
            </View>
            <Text style={styles.emptyTitle}>팔로우한 카테고리가 없어요</Text>
            <Text style={styles.emptyDescription}>눌러서 관심 있는 게임이나 카테고리를 추가해 보세요.</Text>
          </Pressable>
        )}
        ListFooterComponent={selectedCategories.length ? (
          <Text style={styles.footerNote}>방송이 선택한 카테고리로 새로 진입할 때 한 번만 알려드려요.</Text>
        ) : <View style={styles.footerSpace} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { padding: 14, paddingBottom: 112 },
  intro: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, paddingHorizontal: 2 },
  introText: { flex: 1, minWidth: 0 },
  title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.3 },
  description: { marginTop: 4, color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
  addButton: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 13, backgroundColor: palette.accent, borderRadius: radius.control },
  addButtonText: { color: palette.accentText, fontSize: 13, fontWeight: '900' },
  policy: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8, paddingHorizontal: 12, backgroundColor: palette.surface, borderRadius: radius.card },
  policyText: { flex: 1, color: palette.textSecondary, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  count: { color: palette.textSecondary, fontSize: 11, fontWeight: '800' },
  notificationCard: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: palette.surface, borderRadius: radius.card },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  notificationDescription: { marginTop: 2, color: palette.textSecondary, fontSize: 10, lineHeight: 14 },
  notificationAction: { color: palette.accent, fontSize: 12, fontWeight: '900' },
  sectionHeading: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 3 },
  sectionTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  sectionHint: { flex: 1, color: palette.textMuted, fontSize: 10, textAlign: 'right' },
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: palette.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  poster: { width: 38, height: 46, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  posterFallback: { width: 38, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  rowText: { flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' },
  categoryName: { color: palette.text, fontSize: 15, fontWeight: '800' },
  categoryType: { marginTop: 2, color: palette.textSecondary, fontSize: 11 },
  logButton: { height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 9, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  logText: { color: palette.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  removeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 42, backgroundColor: palette.surface, borderRadius: radius.card },
  emptyIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.card },
  emptyTitle: { marginTop: 12, color: palette.text, fontSize: 14, fontWeight: '800' },
  emptyDescription: { marginTop: 5, color: palette.textSecondary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  footerNote: { paddingHorizontal: 4, paddingVertical: 18, color: palette.textMuted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  footerSpace: { height: 18 },
  pressed: { opacity: 0.72 },
});
