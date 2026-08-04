import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { palette, radius } from '@/constants/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export function SymbolButton({
  name,
  label,
  active = false,
  muted = false,
  onPress,
}: {
  name: SymbolName;
  label: string;
  active?: boolean;
  muted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.button, active && !muted && styles.active, muted && styles.muted, pressed && styles.pressed]}>
      <SymbolView name={name} size={17} tintColor={active && !muted ? palette.accent : palette.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceRaised,
    borderRadius: radius.control,
  },
  active: { backgroundColor: palette.surfaceSelected },
  muted: { backgroundColor: palette.surfaceRaised },
  pressed: { opacity: 0.72 },
});
