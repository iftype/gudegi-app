import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/components/brand';
import { palette, radius } from '@/constants/theme';

export function ScreenHeader({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <View style={styles.header}>
      <Brand />
      <View style={styles.actions}>
        {onRefresh && (
          <Pressable accessibilityLabel="새로고침" onPress={onRefresh} style={styles.iconButton}>
            <SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh' }} size={15} tintColor={palette.textSecondary} />
          </Pressable>
        )}
        <Pressable accessibilityLabel="사용방법" style={styles.guideButton}>
          <SymbolView name={{ ios: 'questionmark.circle', android: 'help' }} size={13} tintColor={palette.textSecondary} />
          <Text style={styles.guideText}>사용방법</Text>
        </Pressable>
      </View>
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
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderRadius: radius.control,
  },
  guideButton: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: palette.surface,
    borderRadius: radius.control,
  },
  guideText: { color: palette.textSecondary, fontSize: 10, fontWeight: '700' },
});
