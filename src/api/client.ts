import { Platform } from 'react-native';

import type { AlertPreference, FollowedChannel, LiveCategory, Streamer, StreamerAlertEvent } from '@/types';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${fallbackHost}:4000/v1`
).replace(/\/$/, '');

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`api_${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  streamers: (signal?: AbortSignal) => apiRequest<{ data: Streamer[] }>('/streamers', { signal }),
  searchCategories: (query: string, signal?: AbortSignal) => apiRequest<{
    data: LiveCategory[];
    syncedAt: number;
  }>(`/categories/search?query=${encodeURIComponent(query)}`, { signal }),
  streamerAlertEvents: (channelId: string, signal?: AbortSignal) => apiRequest<{
    data: StreamerAlertEvent[];
  }>(`/streamers/${encodeURIComponent(channelId)}/alert-events`, { signal }),
  beginAccountImport: () => apiRequest<{ data: { authorizationUrl: string } }>(
    '/auth/chzzk/start?native=1',
  ),
  completeAccountImport: (code: string, state: string) => apiRequest<{
    data: {
      user: { channelId: string };
      import: { supported: string[]; preferences: AlertPreference[] };
    };
  }>('/auth/chzzk/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  }),
  requestFollowedStreamers: (channels: FollowedChannel[], anonymousId: string) => apiRequest<{
    data: { supported: string[]; requested: string[] };
  }>('/streamer-requests/bulk', {
    method: 'POST',
    body: JSON.stringify({ channels, anonymousId }),
  }),
  feedback: (payload: {
    category: 'idea' | 'bug' | 'usability' | 'streamer_request';
    message?: string;
    streamerName?: string;
    anonymousId: string;
  }) => apiRequest<{ data: { id: number; supported?: boolean } }>('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};
