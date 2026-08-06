import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/components/brand';
import { palette, radius } from '@/constants/theme';

export function ScreenHeader({ serverUnavailable = false }: { serverUnavailable?: boolean }) {
  return (
    <View>
      <View style={styles.header}>
        <Brand />
        <View style={styles.actions}>
          <Pressable accessibilityLabel="제안하기" onPress={() => router.navigate('/suggestion')} style={styles.guideButton}>
            <SymbolView name={{ ios: 'lightbulb', android: 'lightbulb' }} size={13} tintColor={palette.textSecondary} />
            <Text style={styles.guideText}>제안</Text>
          </Pressable>
        </View>
      </View>
      {serverUnavailable && (
        <View accessibilityRole="alert" style={styles.serverBanner}>
          <SymbolView name={{ ios: 'exclamationmark.icloud', android: 'cloud_off' }} size={14} tintColor="#F1CD85" />
          <Text style={styles.serverBannerText}>서버에 연결할 수 없어 알림 상태가 최신이 아닐 수 있어요.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  guideButton: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: palette.surface,
    borderRadius: radius.control,
  },
  guideText: { color: palette.textSecondary, fontSize: 11, fontWeight: '700' },
  serverBanner: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, backgroundColor: '#30291A', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#5A4727' },
  serverBannerText: { flexShrink: 1, color: '#F1CD85', fontSize: 11, fontWeight: '700', lineHeight: 15 },
});
