import { SymbolView } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';
import { useLocalRefresh } from '@/hooks/use-local-refresh';

function notificationDayLabel(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(timestamp));
}

function notificationTimeLabel(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export default function SettingsScreen() {
  const store = useAlertStore();
  const tabRefresh = useLocalRefresh(store.refresh);
  const permission = store.notificationState;

  function clearNotificationLogs() {
    if (!store.receivedNotificationLogs.length) return;
    Alert.alert('받은 알림 비우기', '이 기기에 저장된 알림 기록을 모두 지울까요?', [
      { text: '취소', style: 'cancel' },
      { text: '비우기', style: 'destructive', onPress: () => void store.clearReceivedNotificationLogs() },
    ]);
  }

  function resetAlertList() {
    if (!store.preferences.length) return;
    Alert.alert('알림 목록 초기화', '저장한 스트리머와 개인 알림 설정을 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '초기화', style: 'destructive', onPress: store.clearChannels },
    ]);
  }

  const permissionLabel = permission === 'connected'
    ? '테스트 알림 보내기'
    : permission === 'permission_only'
      ? '권한 승인됨 · 개발 빌드 연결 필요'
    : permission === 'denied'
      ? '알림 권한이 거부되었습니다'
      : permission === 'device_required'
        ? '실제 기기에서 연결할 수 있습니다'
      : permission === 'working'
          ? '처리 중…'
          : permission === 'failed'
            ? '연결 실패 · 다시 시도'
          : '알림 권한 연결';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader serverUnavailable={store.serverState === 'unavailable'} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={tabRefresh.refreshing} onRefresh={tabRefresh.onRefresh} tintColor={palette.accent} />}>
        <View style={styles.intro}>
          <Text style={styles.title}>설정</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <SymbolView name={{ ios: 'bell.badge', android: 'notifications_active' }} size={18} tintColor={palette.accent} />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>기기 알림</Text>
              <Text style={styles.cardDescription}>방송 시작과 변경 알림을 받아보세요.</Text>
            </View>
          </View>
          <Pressable
            disabled={permission === 'working'}
            onPress={() => void (permission === 'connected'
              ? store.testNotifications()
              : store.connectNotifications())}
            style={[styles.primaryButton, permission === 'connected' && styles.connectedButton]}>
            <Text style={[
              styles.primaryButtonText,
              permission === 'connected' && styles.connectedButtonText,
            ]}>{permissionLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={styles.logTitleWrap}>
              <SymbolView name={{ ios: 'message', android: 'chat_bubble_outline' }} size={17} tintColor={palette.text} />
              <Text style={styles.cardTitle}>받은 알림 로그</Text>
            </View>
            <Pressable accessibilityLabel="받은 알림 비우기" onPress={clearNotificationLogs} style={styles.clearButton}>
              <SymbolView name={{ ios: 'trash', android: 'delete' }} size={13} tintColor={palette.textMuted} />
              <Text style={styles.clearButtonText}>비우기</Text>
            </Pressable>
          </View>
          <View style={styles.logList}>
            {store.receivedNotificationLogs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logDate}>
                  <Text style={styles.logDay}>{notificationDayLabel(log.receivedAt)}</Text>
                  <Text style={styles.logTime}>{notificationTimeLabel(log.receivedAt)}</Text>
                </View>
                <View style={styles.logBody}>
                  <Text numberOfLines={2} style={styles.logTitle}>{log.title}</Text>
                  {!!log.body && <Text numberOfLines={2} style={styles.logMessage}>{log.body}</Text>}
                </View>
              </View>
            ))}
            {!store.receivedNotificationLogs.length && (
              <Text style={styles.emptyLog}>이 기기에서 받은 알림이 아직 없습니다.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>데이터 서버</Text>
            <Text style={[styles.statusValue, styles.statusOk]}>연결됨</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <SymbolView name={{ ios: 'arrow.counterclockwise', android: 'restart_alt' }} size={18} tintColor={palette.textSecondary} />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>알림 목록 초기화</Text>
              <Text style={styles.cardDescription}>저장한 스트리머와 개인 알림 설정을 삭제합니다.</Text>
            </View>
          </View>
          <Pressable
            disabled={!store.preferences.length}
            onPress={resetAlertList}
            style={({ pressed }) => [
              styles.resetButton,
              !store.preferences.length && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.resetButtonText}>초기화</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>앱 정보</Text>
          <Text style={styles.cardDescription}>구데기 1.0.0 · Expo SDK 57</Text>
          <Text style={styles.legalText}>계정 가입 없이 설치 식별자·푸시 토큰·알림 설정을 저장합니다.</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync('https://gudegi.vercel.app/privacy')}
            style={({ pressed }) => [styles.policyRow, pressed && styles.pressed]}>
            <Text style={styles.policyText}>개인정보 처리방침</Text>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right' }} size={12} tintColor={palette.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { gap: 12, padding: 14, paddingBottom: 112 },
  intro: { marginBottom: 2, paddingHorizontal: 2 },
  title: { color: palette.text, fontSize: 30, fontWeight: '900', letterSpacing: -1.3 },
  card: { gap: 13, padding: 14, backgroundColor: palette.surface, borderRadius: radius.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  cardTitleWrap: { flex: 1, gap: 3 },
  cardTitle: { color: palette.text, fontSize: 16, fontWeight: '800' },
  cardDescription: { color: palette.textSecondary, fontSize: 13, lineHeight: 18 },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: radius.control },
  connectedButton: { backgroundColor: palette.surfaceRaised },
  primaryButtonText: { color: palette.accentText, fontSize: 14, fontWeight: '900' },
  connectedButtonText: { color: palette.accent },
  resetButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  resetButtonText: { color: palette.danger, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.42 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: palette.text, fontSize: 14, fontWeight: '700' },
  statusValue: { color: palette.textSecondary, fontSize: 13 },
  statusOk: { color: palette.accent },
  legalText: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  logCard: { overflow: 'hidden', backgroundColor: palette.surface, borderRadius: radius.card },
  logHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  logTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7 },
  clearButtonText: { color: palette.textMuted, fontSize: 12, fontWeight: '700' },
  logList: {},
  logRow: { minHeight: 72, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  logDate: { width: 64, alignItems: 'flex-start', gap: 2 },
  logDay: { color: palette.textSecondary, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  logTime: { color: palette.textMuted, fontSize: 10, lineHeight: 14 },
  logBody: { flex: 1, minWidth: 0, gap: 4 },
  logTitle: { color: palette.text, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  logMessage: { color: palette.textSecondary, fontSize: 12, lineHeight: 17 },
  emptyLog: { padding: 24, color: palette.textMuted, textAlign: 'center', fontSize: 12 },
  policyRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, paddingHorizontal: 11, backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  policyText: { color: palette.text, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
