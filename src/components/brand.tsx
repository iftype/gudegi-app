import { StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/constants/theme';

export function Brand() {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <Text style={styles.markText}>구</Text>
        <View style={styles.dot} />
      </View>
      <View>
        <Text style={styles.name}>구데기</Text>
        <Text style={styles.tagline}>원하는 방송만 골라보기</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.black,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radius.control,
  },
  markText: { color: palette.text, fontSize: 17, fontWeight: '900' },
  dot: {
    position: 'absolute',
    top: 6,
    right: 5,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.accent,
  },
  name: { color: palette.text, fontSize: 17, fontWeight: '900', letterSpacing: -0.7 },
  tagline: { color: palette.textMuted, fontSize: 10, fontWeight: '600' },
});
