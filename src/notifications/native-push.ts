import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { apiBaseUrl, apiRequest } from '@/api/client';
import type { AlertPreference } from '@/types';

const INSTALLATION_ID_KEY = 'gudegi-native-installation-id-v1';
const SUBSCRIPTION_ID_KEY = `gudegi-native-push-subscription-id-v2:${apiBaseUrl}`;
const REAL_CHANNEL_ID = /^[a-f0-9]{32}$/;

export type NativePlatform = 'ios' | 'android';

export async function hasNativePushSubscription() {
  return Boolean(await AsyncStorage.getItem(SUBSCRIPTION_ID_KEY));
}

export async function getInstallationId() {
  const stored = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (stored) return stored;
  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

function serverPreferences(preferences: AlertPreference[]) {
  return preferences
    .filter((preference) => REAL_CHANNEL_ID.test(preference.channelId))
    .map((preference) => ({
      channelId: preference.channelId,
      liveStarted: false,
      categoryChanged: preference.enabled && preference.categoryChanged,
      titleChanged: preference.enabled && preference.titleChanged,
      keywords: preference.enabled ? preference.keywords : [],
      categoryFilter: preference.categoryFilter,
    }));
}

export async function connectNativePush(
  expoPushToken: string,
  platform: NativePlatform,
  preferences: AlertPreference[],
  categoryKeys: string[] = [],
) {
  const result = await apiRequest<{ data: { id: string } }>('/push/native-subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      installationId: await getInstallationId(),
      expoPushToken,
      platform,
    }),
  });
  await AsyncStorage.setItem(SUBSCRIPTION_ID_KEY, result.data.id);
  await saveNativePushPreferences(result.data.id, preferences);
  await saveNativePushCategoryFollows(result.data.id, categoryKeys);
  return result.data.id;
}

export async function syncNativePushPreferences(preferences: AlertPreference[]) {
  const subscriptionId = await AsyncStorage.getItem(SUBSCRIPTION_ID_KEY);
  if (!subscriptionId) return false;
  try {
    await saveNativePushPreferences(subscriptionId, preferences);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === 'api_404') {
      await AsyncStorage.removeItem(SUBSCRIPTION_ID_KEY);
    }
    throw error;
  }
}

export async function syncNativePushCategoryFollows(categoryKeys: string[]) {
  const subscriptionId = await AsyncStorage.getItem(SUBSCRIPTION_ID_KEY);
  if (!subscriptionId) return false;
  try {
    await saveNativePushCategoryFollows(subscriptionId, categoryKeys);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message === 'api_404') {
      await AsyncStorage.removeItem(SUBSCRIPTION_ID_KEY);
    }
    throw error;
  }
}

export async function syncAppPreferences(preferences: AlertPreference[]) {
  const id = await getInstallationId();
  await apiRequest(`/app/installations/${id}/preferences`, {
    method: 'PUT',
    body: JSON.stringify({
      channels: preferences
        .filter((item) => REAL_CHANNEL_ID.test(item.channelId))
        .map((item) => ({ ...item, liveStarted: false })),
    }),
  });
}

export async function loadAppPreferences() {
  const id = await getInstallationId();
  const result = await apiRequest<{
    data: { preferences: AlertPreference[]; updatedAt: number };
  }>(`/app/installations/${id}/preferences`);
  return result.data.preferences;
}

export async function sendNativePushTest() {
  const subscriptionId = await AsyncStorage.getItem(SUBSCRIPTION_ID_KEY);
  if (!subscriptionId) throw new Error('native_push_not_connected');
  return apiRequest<{ data: { attempted: number; sent: number; failed: number } }>(
    `/push/native-subscriptions/${subscriptionId}/test`,
    { method: 'POST' },
  );
}

async function saveNativePushPreferences(
  subscriptionId: string,
  preferences: AlertPreference[],
) {
  await apiRequest(`/push/native-subscriptions/${subscriptionId}/preferences`, {
    method: 'PUT',
    body: JSON.stringify({ channels: serverPreferences(preferences) }),
  });
}

async function saveNativePushCategoryFollows(
  subscriptionId: string,
  categoryKeys: string[],
) {
  await apiRequest(`/push/native-subscriptions/${subscriptionId}/category-follows`, {
    method: 'PUT',
    body: JSON.stringify({ categoryKeys: [...new Set(categoryKeys)] }),
  });
}
