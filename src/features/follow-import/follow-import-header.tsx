import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import { followImportStyles as styles } from './styles';

export function FollowImportHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.iconButton}>
        <SymbolView name={{ ios: 'xmark', android: 'close' }} size={16} tintColor={palette.textSecondary} />
      </Pressable>
    </View>
  );
}
