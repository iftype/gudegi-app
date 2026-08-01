import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { palette, radius } from '@/constants/theme';
import { useAlertStore } from '@/features/alerts/alert-store';

export default function SettingsScreen() {
  const store = useAlertStore();
  const permission = store.notificationState;

  const permissionLabel = permission === 'connected'
    ? '기기 알림 연결됨'
    : permission === 'permission_only'
      ? '권한 승인됨 · 개발 빌드 연결 필요'
    : permission === 'denied'
      ? '알림 권한이 거부되었습니다'
      : permission === 'device_required'
        ? '실제 기기에서 연결할 수 있습니다'
      : permission === 'working'
          ? '연결 중…'
          : permission === 'failed'
            ? '연결 실패 · 다시 시도'
          : '알림 권한 연결';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>SETTINGS</Text>
          <Text style={styles.title}>설정</Text>
          <Text style={styles.description}>기기 알림과 개인화 저장 상태를 관리합니다.</Text>
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
            onPress={() => void store.connectNotifications()}
            style={[styles.primaryButton, permission === 'connected' && styles.connectedButton]}>
            <Text style={styles.primaryButtonText}>{permissionLabel}</Text>
          </Pressable>
          {permission === 'connected' && (
            <Pressable onPress={() => void store.testNotifications()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>테스트 알림 보내기</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>데이터 서버</Text>
            <Text style={[styles.statusValue, !store.usingDemoData && styles.statusOk]}>
              {store.usingDemoData ? '미리보기 모드' : '연결됨'}
            </Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>저장된 스트리머</Text>
            <Text style={styles.statusValue}>{store.preferences.length}명</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>앱 정보</Text>
          <Text style={styles.cardDescription}>구데기 1.0.0 · Expo SDK 57</Text>
          <Text style={styles.legalText}>로그인 없이 기기 식별자로 알림 조건을 저장합니다. 개인정보처리방침은 스토어 제출 전에 연결합니다.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  content: { gap: 12, padding: 14, paddingBottom: 112 },
  intro: { marginBottom: 2, paddingHorizontal: 2 },
  eyebrow: { color: palette.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { marginTop: 5, color: palette.text, fontSize: 25, fontWeight: '900', letterSpacing: -1.2 },
  description: { marginTop: 3, color: palette.textSecondary, fontSize: 12 },
  card: { gap: 13, padding: 14, backgroundColor: palette.surface, borderRadius: radius.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised, borderRadius: radius.control },
  cardTitleWrap: { flex: 1, gap: 3 },
  cardTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  cardDescription: { color: palette.textSecondary, fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent, borderRadius: radius.control },
  connectedButton: { backgroundColor: palette.surfaceSelected },
  primaryButtonText: { color: palette.accentText, fontSize: 12, fontWeight: '900' },
  secondaryButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: radius.control },
  secondaryButtonText: { color: palette.text, fontSize: 11, fontWeight: '800' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: palette.text, fontSize: 12, fontWeight: '700' },
  statusValue: { color: palette.textSecondary, fontSize: 11 },
  statusOk: { color: palette.accent },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
  legalText: { color: palette.textMuted, fontSize: 10, lineHeight: 15 },
});
