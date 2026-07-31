import { Platform } from 'react-native';

import type { LiveCategory, Streamer } from '@/types';

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
  categories: (signal?: AbortSignal) =>
    apiRequest<{ data: LiveCategory[]; syncedAt: number | null }>('/categories', { signal }),
};
