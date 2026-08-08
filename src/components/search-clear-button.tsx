import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { palette } from '@/constants/theme';

type SearchClearButtonProps = {
  visible: boolean;
  onClear: () => void;
};

export function SearchClearButton({ visible, onClear }: SearchClearButtonProps) {
  if (!visible) return null;
  return (
    <Pressable
      accessibilityLabel="검색어 지우기"
      accessibilityRole="button"
      hitSlop={4}
      onPress={onClear}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView
        name={{ ios: 'xmark.circle.fill', android: 'cancel' }}
        size={17}
        tintColor={palette.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
