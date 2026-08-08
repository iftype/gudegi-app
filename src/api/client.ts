import { Platform } from 'react-native';

import type { CategoryFollowAlertEvent, LiveCategory, Streamer, StreamerAlertEvent } from '@/types';

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
  streamers: (input: {
    page?: number;
    pageSize?: number;
    query?: string;
    signal?: AbortSignal;
  } = {}) => {
    const params = new URLSearchParams({
      page: String(input.page ?? 1),
      pageSize: String(input.pageSize ?? 40),
    });
    if (input.query?.trim()) params.set('query', input.query.trim());
    return apiRequest<{
      data: Streamer[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
      };
    }>(`/streamers?${params}`, { signal: input.signal });
  },
  streamersByIds: async (channelIds: string[], signal?: AbortSignal) => {
    if (!channelIds.length) return { data: [] as Streamer[] };
    const chunks = Array.from(
      { length: Math.ceil(channelIds.length / 100) },
      (_, index) => channelIds.slice(index * 100, (index + 1) * 100),
    );
    const pages = await Promise.all(chunks.map((chunk) => apiRequest<{ data: Streamer[] }>(
      `/streamers?page=1&pageSize=100&channelIds=${encodeURIComponent(chunk.join(','))}`,
      { signal },
    )));
    return { data: pages.flatMap((page) => page.data) };
  },
  searchCategories: (query: string, signal?: AbortSignal) => apiRequest<{
    data: LiveCategory[];
    syncedAt: number;
  }>(`/categories/search?query=${encodeURIComponent(query)}`, { signal }),
  categoryAlertEvents: (categoryKey: string, signal?: AbortSignal) => apiRequest<{
    data: CategoryFollowAlertEvent[];
  }>(`/categories/${encodeURIComponent(categoryKey)}/alert-events`, { signal }),
  streamerAlertEvents: (channelId: string, signal?: AbortSignal) => apiRequest<{
    data: StreamerAlertEvent[];
  }>(`/streamers/${encodeURIComponent(channelId)}/alert-events`, { signal }),
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
