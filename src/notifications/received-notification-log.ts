import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import type { ReceivedNotificationLog } from '@/types';

const STORAGE_KEY = 'gudegi-received-notification-log-v1';
const MAX_LOGS = 100;

function normalizeLogs(value: unknown): ReceivedNotificationLog[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const log = item as Partial<ReceivedNotificationLog>;
    if (typeof log.id !== 'string' || typeof log.title !== 'string' || typeof log.receivedAt !== 'number') return [];
    return [{
      id: log.id,
      title: log.title,
      body: typeof log.body === 'string' ? log.body : '',
      receivedAt: log.receivedAt,
      channelId: typeof log.channelId === 'string' ? log.channelId : null,
    }];
  });
}

export function notificationToLog(notification: Notifications.Notification): ReceivedNotificationLog {
  const content = notification.request.content;
  const channelId = content.data?.channelId;
  return {
    id: notification.request.identifier,
    title: content.title?.trim() || '구데기 알림',
    body: content.body?.trim() || '',
    receivedAt: notification.date || Date.now(),
    channelId: typeof channelId === 'string' ? channelId : null,
  };
}

export function mergeReceivedNotificationLogs(
  current: ReceivedNotificationLog[],
  incoming: ReceivedNotificationLog[],
) {
  const merged = new Map<string, ReceivedNotificationLog>();
  for (const log of [...incoming, ...current]) merged.set(log.id, log);
  return [...merged.values()].sort((a, b) => b.receivedAt - a.receivedAt).slice(0, MAX_LOGS);
}

export async function loadReceivedNotificationLogs() {
  const stored = await AsyncStorage.getItem(STORAGE_KEY)
    .then((value) => value ? normalizeLogs(JSON.parse(value)) : [])
    .catch(() => []);
  const presented = await Notifications.getPresentedNotificationsAsync()
    .then((notifications) => notifications.map(notificationToLog))
    .catch(() => []);
  return mergeReceivedNotificationLogs(stored, presented);
}

export async function saveReceivedNotificationLogs(logs: ReceivedNotificationLog[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
}

export async function clearReceivedNotificationLogs() {
  await AsyncStorage.removeItem(STORAGE_KEY);
  await Notifications.dismissAllNotificationsAsync().catch(() => undefined);
}
