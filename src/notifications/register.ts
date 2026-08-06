import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationRegistration =
  | { status: 'granted'; token: string | null }
  | { status: 'denied'; token: null; canAskAgain: boolean }
  | { status: 'device_required'; token: null };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForNotifications(): Promise<NotificationRegistration> {
  if (!Device.isDevice && Platform.OS !== 'ios') {
    return { status: 'device_required', token: null };
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'denied' && !current.canAskAgain) {
    return { status: 'denied', token: null, canAskAgain: false };
  }
  const permission = current.status === 'granted'
    ? current
    : await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
  if (permission.status !== 'granted') {
    return { status: 'denied', token: null, canAskAgain: permission.canAskAgain };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: '방송 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
    });
  }

  const projectId = Constants.easConfig?.projectId
    ?? (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
  if (!projectId) return { status: 'granted', token: null };
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return { status: 'granted', token: token.data };
}
