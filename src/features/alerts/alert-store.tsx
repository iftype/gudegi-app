import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { api, apiBaseUrl } from '@/api/client';
import { mergeCategoryCatalog } from '@/data/category-catalog';
import {
  connectNativePush,
  hasNativePushSubscription,
  loadAppPreferences,
  sendNativePushTest,
  syncAppPreferences,
  syncNativePushCategoryFollows,
  syncNativePushPreferences,
} from '@/notifications/native-push';
import { registerForNotifications } from '@/notifications/register';
import {
  clearReceivedNotificationLogs,
  loadReceivedNotificationLogs,
  mergeReceivedNotificationLogs,
  notificationToLog,
  saveReceivedNotificationLogs,
} from '@/notifications/received-notification-log';
import type { AlertPreference, AlertRules, CategoryFilter, LiveCategory, ReceivedNotificationLog, Streamer } from '@/types';

const STORAGE_KEY = 'gudegi-native-alert-preferences-v1';
const CATEGORY_CACHE_KEY = 'gudegi-native-category-catalog-v1';
const CATEGORY_FOLLOWS_KEY = 'gudegi-native-category-follows-v1';
const GLOBAL_DEFAULTS_KEY = 'gudegi-native-global-alert-defaults-v1';
const PUSH_TEST_COMPLETED_KEY = `gudegi-native-push-test-completed-v2:${apiBaseUrl}`;

export type PermissionState = 'idle' | 'working' | 'connected' | 'permission_only' | 'denied' | 'device_required' | 'failed';
export type ServerState = 'connecting' | 'connected' | 'unavailable';

type AlertStore = {
  streamers: Streamer[];
  categories: LiveCategory[];
  followedCategoryKeys: string[];
  preferences: AlertPreference[];
  loading: boolean;
  serverState: ServerState;
  receivedNotificationLogs: ReceivedNotificationLog[];
  refresh: () => Promise<void>;
  searchCategories: (query: string) => Promise<void>;
  toggleCategoryFollow: (categoryKey: string) => void;
  clearCategoryFollows: () => void;
  toggleEnabled: (channelId: string) => void;
  updateRules: (channelId: string, value: AlertRules) => void;
  updateCategoryFilter: (channelId: string, value: CategoryFilter) => void;
  addChannel: (channelId: string) => void;
  rememberStreamers: (streamers: Streamer[]) => void;
  removeChannel: (channelId: string) => void;
  setAllEnabled: (enabled: boolean) => void;
  setChannelsSelected: (channelIds: string[], selected: boolean) => void;
  clearChannels: () => void;
  importAccountData: (channelIds: string[], preferences: AlertPreference[]) => void;
  updateAllRules: (value: AlertRules) => void;
  updateAllCategoryFilter: (value: CategoryFilter) => void;
  notificationState: PermissionState;
  showNotificationTestPrompt: boolean;
  connectNotifications: () => Promise<void>;
  testNotifications: () => Promise<void>;
  clearReceivedNotificationLogs: () => Promise<void>;
};

const AlertStoreContext = createContext<AlertStore | null>(null);

type GlobalAlertDefaults = AlertRules & { categoryFilter: CategoryFilter };

function defaultPreference(channelId: string): AlertPreference {
  return {
    channelId,
    enabled: true,
    liveStarted: false,
    categoryChanged: true,
    titleChanged: true,
    keywords: [],
    categoryFilter: { allCategories: true, categoryKeys: [] },
  };
}

function defaultGlobalAlertDefaults(): GlobalAlertDefaults {
  const preference = defaultPreference('__global__');
  return {
    liveStarted: preference.liveStarted,
    categoryChanged: preference.categoryChanged,
    titleChanged: preference.titleChanged,
    keywords: preference.keywords,
    categoryFilter: preference.categoryFilter,
  };
}

function normalizeGlobalAlertDefaults(value: unknown): GlobalAlertDefaults | null {
  if (!value || typeof value !== 'object') return null;
  const stored = value as Partial<GlobalAlertDefaults>;
  const fallback = defaultGlobalAlertDefaults();
  const categoryKeys = Array.isArray(stored.categoryFilter?.categoryKeys)
    ? stored.categoryFilter.categoryKeys.filter((key): key is string => typeof key === 'string')
    : [];
  return {
    liveStarted: false,
    categoryChanged: typeof stored.categoryChanged === 'boolean' ? stored.categoryChanged : fallback.categoryChanged,
    titleChanged: typeof stored.titleChanged === 'boolean' ? stored.titleChanged : fallback.titleChanged,
    keywords: Array.isArray(stored.keywords)
      ? stored.keywords.filter((keyword): keyword is string => typeof keyword === 'string')
      : [],
    categoryFilter: {
      allCategories: typeof stored.categoryFilter?.allCategories === 'boolean'
        ? stored.categoryFilter.allCategories
        : categoryKeys.length === 0,
      categoryKeys,
    },
  };
}

function preferenceWithDefaults(channelId: string, defaults: GlobalAlertDefaults | null): AlertPreference {
  if (!defaults) return defaultPreference(channelId);
  return {
    channelId,
    ...defaults,
    keywords: [...defaults.keywords],
    categoryFilter: {
      allCategories: defaults.categoryFilter.allCategories,
      categoryKeys: [...defaults.categoryFilter.categoryKeys],
    },
    enabled: defaults.categoryChanged
      || defaults.titleChanged
      || defaults.keywords.length > 0,
  };
}

function inferGlobalAlertDefaults(preferences: AlertPreference[]): GlobalAlertDefaults | null {
  const candidates = preferences;
  if (candidates.length < 2) return null;
  const groups = new Map<string, { count: number; preference: AlertPreference }>();
  for (const preference of candidates) {
    const key = JSON.stringify({
      categoryChanged: preference.categoryChanged,
      titleChanged: preference.titleChanged,
      keywords: preference.keywords,
      categoryFilter: preference.categoryFilter,
    });
    const group = groups.get(key);
    groups.set(key, group
      ? { ...group, count: group.count + 1 }
      : { count: 1, preference });
  }
  const largest = [...groups.values()].sort((a, b) => b.count - a.count)[0];
  if (!largest || largest.count < 2 || largest.count <= candidates.length / 2) return null;
  const first = largest.preference;
  return {
    liveStarted: false,
    categoryChanged: first.categoryChanged,
    titleChanged: first.titleChanged,
    keywords: [...first.keywords],
    categoryFilter: {
      allCategories: first.categoryFilter.allCategories,
      categoryKeys: [...first.categoryFilter.categoryKeys],
    },
  };
}

function normalizePreferences(value: unknown): AlertPreference[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof (item as AlertPreference).channelId !== 'string') return [];
    const stored = item as Partial<AlertPreference> & { channelId: string };
    const fallback = defaultPreference(stored.channelId);
    return [{
      ...fallback,
      ...stored,
      liveStarted: false,
      enabled: Boolean(
        (stored.enabled ?? fallback.enabled)
        && ((stored.categoryChanged ?? fallback.categoryChanged)
          || (stored.titleChanged ?? fallback.titleChanged)
          || (Array.isArray(stored.keywords) && stored.keywords.length > 0))
      ),
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

function trackedPreferences(preferences: AlertPreference[]) {
  return preferences;
}

export function AlertStoreProvider({ children }: { children: React.ReactNode }) {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [categories, setCategories] = useState<LiveCategory[]>(() => mergeCategoryCatalog());
  const [followedCategoryKeys, setFollowedCategoryKeys] = useState<string[]>([]);
  const [categoryFollowsHydrated, setCategoryFollowsHydrated] = useState(false);
  const [preferences, setPreferences] = useState<AlertPreference[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [globalDefaults, setGlobalDefaults] = useState<GlobalAlertDefaults | null>(null);
  const [globalDefaultsHydrated, setGlobalDefaultsHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverState, setServerState] = useState<ServerState>('connecting');
  const [receivedNotificationLogs, setReceivedNotificationLogs] = useState<ReceivedNotificationLog[]>([]);
  const [notificationState, setNotificationState] = useState<PermissionState>('idle');
  const [showNotificationTestPrompt, setShowNotificationTestPrompt] = useState(false);
  const searchedCategoryQueries = useRef(new Set<string>());
  const globalDefaultsRef = useRef<GlobalAlertDefaults | null>(null);
  const attemptedLegacyDefaultsMigration = useRef(false);

  useEffect(() => {
    void hasNativePushSubscription()
      .then((connected) => {
        if (connected) setNotificationState('connected');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void AsyncStorage.getItem(PUSH_TEST_COMPLETED_KEY)
      .then((completed) => setShowNotificationTestPrompt(completed !== 'true'))
      .catch(() => setShowNotificationTestPrompt(true));
  }, []);

  useEffect(() => {
    void loadReceivedNotificationLogs().then(setReceivedNotificationLogs);
    const remember = (notification: Notifications.Notification) => {
      setReceivedNotificationLogs((current) => {
        const next = mergeReceivedNotificationLogs(current, [notificationToLog(notification)]);
        void saveReceivedNotificationLogs(next);
        return next;
      });
    };
    const received = Notifications.addNotificationReceivedListener(remember);
    const responded = Notifications.addNotificationResponseReceivedListener((response) => remember(response.notification));
    return () => {
      received.remove();
      responded.remove();
    };
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
    AsyncStorage.getItem(GLOBAL_DEFAULTS_KEY)
      .then((stored) => {
        if (!stored) return;
        const normalized = normalizeGlobalAlertDefaults(JSON.parse(stored));
        globalDefaultsRef.current = normalized;
        setGlobalDefaults(normalized);
      })
      .catch(() => undefined)
      .finally(() => setGlobalDefaultsHydrated(true));
  }, []);

  useEffect(() => {
    if (!globalDefaultsHydrated) return;
    globalDefaultsRef.current = globalDefaults;
    if (globalDefaults) {
      void AsyncStorage.setItem(GLOBAL_DEFAULTS_KEY, JSON.stringify(globalDefaults));
    } else {
      void AsyncStorage.removeItem(GLOBAL_DEFAULTS_KEY);
    }
  }, [globalDefaults, globalDefaultsHydrated]);

  useEffect(() => {
    if (!hydrated || !globalDefaultsHydrated || attemptedLegacyDefaultsMigration.current) return;
    attemptedLegacyDefaultsMigration.current = true;
    if (globalDefaultsRef.current) return;
    const inferred = inferGlobalAlertDefaults(preferences);
    if (!inferred) return;
    globalDefaultsRef.current = inferred;
    void AsyncStorage.setItem(GLOBAL_DEFAULTS_KEY, JSON.stringify(inferred));
  }, [globalDefaultsHydrated, hydrated, preferences]);

  useEffect(() => {
    AsyncStorage.getItem(CATEGORY_CACHE_KEY)
      .then((stored) => {
        if (stored) setCategories(mergeCategoryCatalog(JSON.parse(stored) as LiveCategory[]));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CATEGORY_FOLLOWS_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) return;
        setFollowedCategoryKeys([...new Set(
          parsed.filter((key): key is string => typeof key === 'string'),
        )].slice(0, 30));
      })
      .catch(() => undefined)
      .finally(() => setCategoryFollowsHydrated(true));
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
    if (serverState !== 'connected') return;
    const syncedPreferences = trackedPreferences(preferences);
    const timer = setTimeout(() => {
      void syncNativePushPreferences(syncedPreferences).catch(() => undefined);
      void syncAppPreferences(syncedPreferences).catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [hydrated, preferences, serverState, streamers]);

  useEffect(() => {
    if (!categoryFollowsHydrated) return;
    void AsyncStorage.setItem(CATEGORY_FOLLOWS_KEY, JSON.stringify(followedCategoryKeys));
    if (serverState !== 'connected') return;
    const timer = setTimeout(() => {
      void syncNativePushCategoryFollows(followedCategoryKeys).catch(() => undefined);
    }, 400);
    return () => clearTimeout(timer);
  }, [categoryFollowsHydrated, followedCategoryKeys, serverState]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    try {
      const streamerResult = await api.streamersByIds(
        preferences.map((preference) => preference.channelId),
        controller.signal,
      );
      setStreamers(streamerResult.data);
      setServerState('connected');
    } catch {
      setServerState('unavailable');
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  useEffect(() => {
    if (!hydrated || !globalDefaultsHydrated) return;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [globalDefaultsHydrated, hydrated, refresh]);

  const update = useCallback((channelId: string, transform: (item: AlertPreference) => AlertPreference) => {
    setPreferences((current) => current.map((item) => item.channelId === channelId
      ? transform(item)
      : item));
  }, []);

  const rememberStreamers = useCallback((nextStreamers: Streamer[]) => {
    setStreamers((current) => {
      const byChannel = new Map(current.map((streamer) => [streamer.channelId, streamer]));
      for (const streamer of nextStreamers) byChannel.set(streamer.channelId, streamer);
      return [...byChannel.values()];
    });
  }, []);

  const connectNotifications = useCallback(async () => {
    setNotificationState('working');
    try {
      const result = await registerForNotifications();
      if (result.status !== 'granted') {
        setNotificationState(result.status);
        if (result.status === 'denied' && !result.canAskAgain) {
          await Linking.openSettings();
        }
        return;
      }
      if (!result.token) {
        setNotificationState('permission_only');
        return;
      }
      await connectNativePush(
        result.token,
        Platform.OS === 'android' ? 'android' : 'ios',
        trackedPreferences(preferences),
        followedCategoryKeys,
      );
      setNotificationState('connected');
    } catch {
      setNotificationState('failed');
    }
  }, [followedCategoryKeys, preferences]);

  const testNotifications = useCallback(async () => {
    setNotificationState('working');
    try {
      const result = await registerForNotifications();
      if (result.status !== 'granted') {
        setNotificationState(result.status);
        if (result.status === 'denied' && !result.canAskAgain) {
          await Linking.openSettings();
        }
        return;
      }
      if (!result.token) {
        setNotificationState('permission_only');
        return;
      }
      await connectNativePush(
        result.token,
        Platform.OS === 'android' ? 'android' : 'ios',
        trackedPreferences(preferences),
        followedCategoryKeys,
      );
      await sendNativePushTest();
      setShowNotificationTestPrompt(false);
      await AsyncStorage.setItem(PUSH_TEST_COMPLETED_KEY, 'true');
      setNotificationState('connected');
    } catch {
      setNotificationState('failed');
    }
  }, [followedCategoryKeys, preferences]);

  const value = useMemo<AlertStore>(() => ({
    streamers,
    categories,
    followedCategoryKeys,
    preferences,
    loading,
    serverState,
    receivedNotificationLogs,
    refresh,
    searchCategories,
    toggleCategoryFollow(categoryKey) {
      setFollowedCategoryKeys((current) => current.includes(categoryKey)
        ? current.filter((key) => key !== categoryKey)
        : [...current, categoryKey].slice(0, 30));
    },
    clearCategoryFollows() {
      setFollowedCategoryKeys([]);
    },
    toggleEnabled(channelId) {
      update(channelId, (item) => ({ ...item, enabled: !item.enabled }));
    },
    updateRules(channelId, rules) {
      update(channelId, (item) => ({
        ...item,
        ...rules,
        liveStarted: false,
        enabled: rules.categoryChanged || rules.titleChanged || rules.keywords.length > 0,
      }));
    },
    updateCategoryFilter(channelId, categoryFilter) {
      update(channelId, (item) => ({ ...item, categoryFilter }));
    },
    addChannel(channelId) {
      setPreferences((current) => current.some((item) => item.channelId === channelId)
        ? current
        : [...current, preferenceWithDefaults(channelId, globalDefaultsRef.current)]);
    },
    rememberStreamers,
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
            if (!byChannel.has(channelId)) {
              byChannel.set(channelId, preferenceWithDefaults(channelId, globalDefaultsRef.current));
            }
          }
        } else {
          for (const channelId of target) byChannel.delete(channelId);
        }
        return [...byChannel.values()];
      });
    },
    clearChannels() {
      setPreferences([]);
      globalDefaultsRef.current = null;
      setGlobalDefaults(null);
    },
    importAccountData(channelIds, importedPreferences) {
      const normalizedImported = normalizePreferences(importedPreferences);
      setPreferences((current) => {
        const merged = new Map(current.map((item) => [item.channelId, item]));
        for (const channelId of channelIds) {
          if (!merged.has(channelId)) {
            merged.set(channelId, preferenceWithDefaults(channelId, globalDefaultsRef.current));
          }
        }
        for (const preference of normalizedImported) merged.set(preference.channelId, preference);
        return [...merged.values()];
      });
    },
    updateAllRules(rules) {
      const nextDefaults = {
        ...(globalDefaultsRef.current ?? defaultGlobalAlertDefaults()),
        ...rules,
        liveStarted: false,
        keywords: [...rules.keywords],
      };
      globalDefaultsRef.current = nextDefaults;
      setGlobalDefaults(nextDefaults);
      setPreferences((current) => current.map((item) => ({
        ...item,
        ...rules,
        liveStarted: false,
        enabled: rules.categoryChanged || rules.titleChanged || rules.keywords.length > 0,
      })));
    },
    updateAllCategoryFilter(categoryFilter) {
      const nextDefaults = {
        ...(globalDefaultsRef.current ?? defaultGlobalAlertDefaults()),
        categoryFilter: {
          allCategories: categoryFilter.allCategories,
          categoryKeys: [...categoryFilter.categoryKeys],
        },
      };
      globalDefaultsRef.current = nextDefaults;
      setGlobalDefaults(nextDefaults);
      setPreferences((current) => current.map((item) => ({
        ...item,
        categoryFilter: {
          allCategories: categoryFilter.allCategories,
          categoryKeys: [...categoryFilter.categoryKeys],
        },
      })));
    },
    notificationState,
    showNotificationTestPrompt,
    connectNotifications,
    testNotifications,
    async clearReceivedNotificationLogs() {
      setReceivedNotificationLogs([]);
      await clearReceivedNotificationLogs();
    },
  }), [categories, connectNotifications, followedCategoryKeys, loading, notificationState, preferences, receivedNotificationLogs, refresh, rememberStreamers, searchCategories, serverState, showNotificationTestPrompt, streamers, testNotifications, update]);

  return <AlertStoreContext.Provider value={value}>{children}</AlertStoreContext.Provider>;
}

export function useAlertStore() {
  const value = useContext(AlertStoreContext);
  if (!value) throw new Error('useAlertStore must be used inside AlertStoreProvider');
  return value;
}
