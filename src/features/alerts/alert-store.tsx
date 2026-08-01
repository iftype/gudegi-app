import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { api } from '@/api/client';
import { demoPreferences, demoStreamers } from '@/data/demo';
import { mergeCategoryCatalog } from '@/data/category-catalog';
import {
  connectNativePush,
  hasNativePushSubscription,
  loadAppPreferences,
  sendNativePushTest,
  syncAppPreferences,
  syncNativePushPreferences,
} from '@/notifications/native-push';
import { registerForNotifications } from '@/notifications/register';
import type { AlertPreference, AlertRules, CategoryFilter, LiveCategory, Streamer } from '@/types';

const STORAGE_KEY = 'gudegi-native-alert-preferences-v1';
const CATEGORY_CACHE_KEY = 'gudegi-native-category-catalog-v1';

export type PermissionState = 'idle' | 'working' | 'connected' | 'permission_only' | 'denied' | 'device_required' | 'failed';

type AlertStore = {
  streamers: Streamer[];
  categories: LiveCategory[];
  preferences: AlertPreference[];
  loading: boolean;
  usingDemoData: boolean;
  refresh: () => Promise<void>;
  searchCategories: (query: string) => Promise<void>;
  toggleEnabled: (channelId: string) => void;
  updateRules: (channelId: string, value: AlertRules) => void;
  updateCategoryFilter: (channelId: string, value: CategoryFilter) => void;
  addChannel: (channelId: string) => void;
  removeChannel: (channelId: string) => void;
  setAllEnabled: (enabled: boolean) => void;
  setChannelsSelected: (channelIds: string[], selected: boolean) => void;
  clearChannels: () => void;
  importAccountData: (channelIds: string[], preferences: AlertPreference[]) => void;
  updateAllRules: (value: AlertRules) => void;
  updateAllCategoryFilter: (value: CategoryFilter) => void;
  notificationState: PermissionState;
  connectNotifications: () => Promise<void>;
  testNotifications: () => Promise<void>;
};

const AlertStoreContext = createContext<AlertStore | null>(null);

function defaultPreference(channelId: string): AlertPreference {
  return {
    channelId,
    enabled: true,
    liveStarted: true,
    categoryChanged: true,
    titleChanged: true,
    keywords: [],
    categoryFilter: { allCategories: true, categoryKeys: [] },
  };
}

function normalizePreferences(value: unknown): AlertPreference[] {
  if (!Array.isArray(value)) return demoPreferences;
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof (item as AlertPreference).channelId !== 'string') return [];
    const stored = item as Partial<AlertPreference> & { channelId: string };
    const fallback = defaultPreference(stored.channelId);
    return [{
      ...fallback,
      ...stored,
      keywords: Array.isArray(stored.keywords) ? stored.keywords : [],
      categoryFilter: stored.categoryFilter && Array.isArray(stored.categoryFilter.categoryKeys)
        ? {
            allCategories: stored.categoryFilter.categoryKeys.length === 0,
            categoryKeys: stored.categoryFilter.categoryKeys,
          }
        : fallback.categoryFilter,
    }];
  });
}

export function AlertStoreProvider({ children }: { children: React.ReactNode }) {
  const [streamers, setStreamers] = useState(demoStreamers);
  const [categories, setCategories] = useState<LiveCategory[]>(() => mergeCategoryCatalog());
  const [preferences, setPreferences] = useState<AlertPreference[]>(demoPreferences);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [notificationState, setNotificationState] = useState<PermissionState>('idle');
  const searchedCategoryQueries = useRef(new Set<string>());

  useEffect(() => {
    void hasNativePushSubscription()
      .then((connected) => {
        if (connected) setNotificationState('connected');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (stored) => {
        if (stored) {
          setPreferences(normalizePreferences(JSON.parse(stored)));
          return;
        }
        try {
          setPreferences(normalizePreferences(await loadAppPreferences()));
        } catch {
          // 첫 실행이거나 서버에 저장된 값이 없으면 기본값을 사용합니다.
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CATEGORY_CACHE_KEY)
      .then((stored) => {
        if (stored) setCategories(mergeCategoryCatalog(JSON.parse(stored) as LiveCategory[]));
      })
      .catch(() => undefined);
  }, []);

  const searchCategories = useCallback(async (query: string) => {
    const normalized = query.normalize('NFKC').trim().replace(/\s+/g, ' ');
    const cacheKey = normalized.toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
    if (!normalized || searchedCategoryQueries.current.has(cacheKey)) return;
    searchedCategoryQueries.current.add(cacheKey);
    try {
      const result = await api.searchCategories(normalized);
      setCategories((current) => {
        const merged = mergeCategoryCatalog([...current, ...result.data]);
        void AsyncStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(merged));
        return merged;
      });
    } catch {
      searchedCategoryQueries.current.delete(cacheKey);
      // 네트워크 검색이 실패해도 앱에 내장한 검색 결과는 그대로 유지합니다.
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    const timer = setTimeout(() => {
      void syncNativePushPreferences(preferences).catch(() => undefined);
      void syncAppPreferences(preferences).catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [hydrated, preferences]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    try {
      const streamerResult = await api.streamers(controller.signal);
      setStreamers(streamerResult.data);
      setPreferences((current) => current.length > 0 && current.every(
        (preference) => preference.channelId.startsWith('demo-'),
      )
        ? streamerResult.data.slice(0, 2).map((streamer) => defaultPreference(streamer.channelId))
        : current);
      setUsingDemoData(false);
    } catch {
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const update = useCallback((channelId: string, transform: (item: AlertPreference) => AlertPreference) => {
    setPreferences((current) => current.map((item) => item.channelId === channelId
      ? transform(item)
      : item));
  }, []);

  const connectNotifications = useCallback(async () => {
    setNotificationState('working');
    try {
      const result = await registerForNotifications();
      if (result.status !== 'granted') {
        setNotificationState(result.status);
        return;
      }
      if (!result.token) {
        setNotificationState('permission_only');
        return;
      }
      await connectNativePush(
        result.token,
        Platform.OS === 'android' ? 'android' : 'ios',
        preferences,
      );
      setNotificationState('connected');
    } catch {
      setNotificationState('failed');
    }
  }, [preferences]);

  const testNotifications = useCallback(async () => {
    setNotificationState('working');
    try {
      await sendNativePushTest();
      setNotificationState('connected');
    } catch {
      setNotificationState('failed');
    }
  }, []);

  const value = useMemo<AlertStore>(() => ({
    streamers,
    categories,
    preferences,
    loading,
    usingDemoData,
    refresh,
    searchCategories,
    toggleEnabled(channelId) {
      update(channelId, (item) => ({ ...item, enabled: !item.enabled }));
    },
    updateRules(channelId, rules) {
      update(channelId, (item) => ({
        ...item,
        ...rules,
        enabled: rules.liveStarted || rules.categoryChanged || rules.titleChanged || rules.keywords.length > 0,
      }));
    },
    updateCategoryFilter(channelId, categoryFilter) {
      update(channelId, (item) => ({ ...item, categoryFilter }));
    },
    addChannel(channelId) {
      setPreferences((current) => current.some((item) => item.channelId === channelId)
        ? current
        : [...current, defaultPreference(channelId)]);
    },
    removeChannel(channelId) {
      setPreferences((current) => current.filter((item) => item.channelId !== channelId));
    },
    setAllEnabled(enabled) {
      setPreferences((current) => current.map((item) => ({ ...item, enabled })));
    },
    setChannelsSelected(channelIds, selected) {
      const target = new Set(channelIds);
      setPreferences((current) => {
        const byChannel = new Map(current.map((item) => [item.channelId, item]));
        if (selected) {
          for (const channelId of target) {
            if (!byChannel.has(channelId)) byChannel.set(channelId, defaultPreference(channelId));
          }
        } else {
          for (const channelId of target) byChannel.delete(channelId);
        }
        return [...byChannel.values()];
      });
    },
    clearChannels() {
      setPreferences([]);
    },
    importAccountData(channelIds, importedPreferences) {
      const normalizedImported = normalizePreferences(importedPreferences);
      setPreferences((current) => {
        const merged = new Map(current
          .filter((item) => !item.channelId.startsWith('demo-'))
          .map((item) => [item.channelId, item]));
        for (const channelId of channelIds) {
          if (!merged.has(channelId)) merged.set(channelId, defaultPreference(channelId));
        }
        for (const preference of normalizedImported) merged.set(preference.channelId, preference);
        return [...merged.values()];
      });
    },
    updateAllRules(rules) {
      setPreferences((current) => current.map((item) => ({
        ...item,
        ...rules,
        enabled: rules.liveStarted || rules.categoryChanged || rules.titleChanged || rules.keywords.length > 0,
      })));
    },
    updateAllCategoryFilter(categoryFilter) {
      setPreferences((current) => current.map((item) => ({ ...item, categoryFilter })));
    },
    notificationState,
    connectNotifications,
    testNotifications,
  }), [categories, connectNotifications, loading, notificationState, preferences, refresh, searchCategories, streamers, testNotifications, update, usingDemoData]);

  return <AlertStoreContext.Provider value={value}>{children}</AlertStoreContext.Provider>;
}

export function useAlertStore() {
  const value = useContext(AlertStoreContext);
  if (!value) throw new Error('useAlertStore must be used inside AlertStoreProvider');
  return value;
}
