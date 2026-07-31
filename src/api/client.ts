import { Platform } from 'react-native';

import type { LiveCategory, Streamer } from '@/types';

const fallbackHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${fallbackHost}:4000/v1`
).replace(/\/$/, '');

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    signal,
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`api_${response.status}`);
  return response.json() as Promise<T>;
}

export const api = {
  streamers: (signal?: AbortSignal) => request<{ data: Streamer[] }>('/streamers', signal),
  categories: (signal?: AbortSignal) =>
    request<{ data: LiveCategory[]; syncedAt: number | null }>('/categories', signal),
};
