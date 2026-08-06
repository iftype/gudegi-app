import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { palette, radius } from '@/constants/theme';

export function Brand() {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <Image
          accessibilityLabel="구데기 캐릭터"
          contentFit="cover"
          source={require('../../assets/images/gudegi-mascot-face-icon.png')}
          style={styles.markImage}
        />
      </View>
      <Image
        accessibilityLabel="구데기"
        contentFit="contain"
        source={require('../../assets/images/gudegi-wordmark.png')}
        style={styles.wordmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    backgroundColor: palette.black,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radius.control,
  },
  markImage: { width: '100%', height: '100%' },
  wordmark: { width: 74, height: 32 },
});
