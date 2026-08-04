import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/theme';
import type { FollowedChannel } from '@/types';
import { followImportStyles as styles } from './styles';

export function FollowedChannelRow({
  channel,
  alreadyAdded,
  alreadyRequested,
  isSelected,
  isTracked,
  onToggle,
}: {
  channel: FollowedChannel;
  alreadyAdded: boolean;
  alreadyRequested: boolean;
  isSelected: boolean;
  isTracked: boolean;
  onToggle: () => void;
}) {
  const disabled = alreadyAdded || alreadyRequested;
  const checked = isSelected || alreadyAdded || alreadyRequested;
  const status = alreadyAdded
    ? '알림 중'
    : alreadyRequested
      ? '신청 완료'
      : isTracked
        ? '바로 추가'
        : '추적 신청';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected || alreadyAdded, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [styles.row, isSelected && styles.selectedSurface, pressed && styles.pressed]}>
      {channel.channelImageUrl ? (
        <Image source={channel.channelImageUrl} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}><Text style={styles.avatarText}>{channel.channelName.slice(0, 1)}</Text></View>
      )}
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={styles.name}>{channel.channelName}</Text>
        <Text style={[styles.status, isTracked && !alreadyAdded && styles.statusReady]}>{status}</Text>
      </View>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        {checked && <SymbolView name={{ ios: 'checkmark', android: 'check' }} size={14} tintColor={palette.accent} />}
      </View>
    </Pressable>
  );
}
