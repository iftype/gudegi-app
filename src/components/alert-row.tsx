import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { SymbolButton } from '@/components/symbol-button';
import { palette, radius } from '@/constants/theme';
import { openChzzkLive } from '@/navigation/open-chzzk-live';
import type { AlertPreference, Streamer } from '@/types';

function elapsedLabel(startedAt?: number | null) {
  if (!startedAt) return '';
  const minutes = Math.max(1, Math.floor((Date.now() - startedAt) / 60_000));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

let sheetNavigationLocked = false;

function openSheet(channelId: string) {
  if (sheetNavigationLocked) return;
  sheetNavigationLocked = true;
  router.navigate({ pathname: '/alert-rules', params: { channelId } });
  setTimeout(() => {
    sheetNavigationLocked = false;
  }, 700);
}

export function AlertRow({
  streamer,
  preference,
  onToggle,
  onRemove,
}: {
  streamer: Streamer;
  preference: AlertPreference;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.row, streamer.isLive ? styles.rowLive : styles.rowOffline]}>
      <Pressable
        accessibilityLabel={streamer.isLive ? `${streamer.channelName} 방송 열기` : `${streamer.channelName} 프로필`}
        disabled={!streamer.isLive}
        onPress={() => void openChzzkLive(streamer.channelId)}
        style={({ pressed }) => [styles.avatarWrap, pressed && styles.avatarPressed]}>
        {streamer.channelImageUrl ? (
          <Image
            source={streamer.channelImageUrl}
            contentFit="cover"
            style={[styles.avatar, !streamer.isLive && styles.avatarOffline]}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{streamer.channelName.slice(0, 1)}</Text>
          </View>
        )}
        {streamer.isLive && <Text style={styles.liveBadge}>LIVE</Text>}
      </Pressable>

      <View style={styles.main}>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={[styles.name, !streamer.isLive && styles.nameOffline]}>{streamer.channelName}</Text>
          {streamer.isLive && (
            <View style={styles.elapsed}>
              <SymbolView name={{ ios: 'clock', android: 'schedule' }} size={11} tintColor={palette.textSecondary} />
              <Text style={styles.elapsedText}>{elapsedLabel(streamer.activeBroadcastStartedAt)}</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={1} style={[styles.category, !streamer.isLive && styles.categoryOffline]}>
          {streamer.currentCategory ?? (streamer.isLive ? '카테고리 정보 없음' : '오프라인')}
        </Text>
      </View>
      <View style={styles.actions}>
        <SymbolButton
          name={{ ios: preference.enabled ? 'bell.fill' : 'bell', android: preference.enabled ? 'notifications' : 'notifications_none' }}
          label={`${streamer.channelName} 알림 받기`}
          active={preference.enabled}
          muted={!streamer.isLive}
          onPress={onToggle}
        />
        <SymbolButton
          name={{ ios: 'checklist', android: 'checklist' }}
          label={`${streamer.channelName} 알림 조건`}
          muted={!streamer.isLive}
          onPress={() => openSheet(streamer.channelId)}
        />
        <Pressable
          accessibilityLabel={`${streamer.channelName} 알림 목록에서 삭제`}
          hitSlop={6}
          onPress={() => Alert.alert(
            streamer.channelName,
            '이 스트리머를 알림 목록에서 삭제할까요?',
            [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: onRemove },
            ],
          )}
          style={styles.moreButton}>
          <SymbolView name={{ ios: 'trash', android: 'delete' }} size={16} tintColor={palette.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: palette.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  rowLive: { backgroundColor: '#232527' },
  rowOffline: { backgroundColor: palette.surface },
  avatarWrap: { width: 40, height: 44, alignItems: 'center', justifyContent: 'flex-start' },
  avatarPressed: { opacity: 0.65 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.surfaceRaised },
  avatarOffline: { opacity: 0.55, filter: [{ grayscale: 1 }] },
  avatarFallback: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: palette.surfaceRaised,
  },
  avatarText: { color: palette.text, fontSize: 16, fontWeight: '900' },
  liveBadge: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    color: '#FFF',
    backgroundColor: palette.live,
    borderRadius: radius.pill,
    fontSize: 8,
    fontWeight: '900',
  },
  main: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 0 },
  identity: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, color: palette.text, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  nameOffline: { color: palette.textSecondary },
  elapsed: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  elapsedText: { color: palette.textSecondary, fontSize: 11, fontWeight: '700' },
  category: { color: palette.textSecondary, fontSize: 11, lineHeight: 14, fontWeight: '600' },
  categoryOffline: { color: palette.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  moreButton: { width: 26, height: 34, alignItems: 'center', justifyContent: 'center' },
});
