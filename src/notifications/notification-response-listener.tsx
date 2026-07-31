import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Linking } from 'react-native';

function openNotification(response: Notifications.NotificationResponse) {
  const channelId = response.notification.request.content.data?.channelId;
  if (typeof channelId !== 'string' || !/^[a-f0-9]{32}$/.test(channelId)) return;
  void Linking.openURL(`https://chzzk.naver.com/live/${encodeURIComponent(channelId)}`);
  Notifications.clearLastNotificationResponse();
}

export function NotificationResponseListener() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response);
    });
    return () => subscription.remove();
  }, []);

  return null;
}
