import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api } from '@/api/client';
import { demoCategories, demoPreferences, demoStreamers } from '@/data/demo';
import type { AlertPreference, AlertRules, CategoryFilter, LiveCategory, Streamer } from '@/types';

const STORAGE_KEY = 'gudegi-native-alert-preferences-v1';

type AlertStore = {
  streamers: Streamer[];
  categories: LiveCategory[];
  preferences: AlertPreference[];
  loading: boolean;
  usingDemoData: boolean;
  refresh: () => Promise<void>;
  toggleEnabled: (channelId: string) => void;
  updateRules: (channelId: string, value: AlertRules) => void;
  updateCategoryFilter: (channelId: string, value: CategoryFilter) => void;
  addChannel: (channelId: string) => void;
  removeChannel: (channelId: string) => void;
  setAllEnabled: (enabled: boolean) => void;
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
  return value.filter((item): item is AlertPreference => Boolean(
    item && typeof item === 'object' && typeof (item as AlertPreference).channelId === 'string'
  ));
}

export function AlertStoreProvider({ children }: { children: React.ReactNode }) {
  const [streamers, setStreamers] = useState(demoStreamers);
  const [categories, setCategories] = useState(demoCategories);
  const [preferences, setPreferences] = useState<AlertPreference[]>(demoPreferences);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setPreferences(normalizePreferences(JSON.parse(stored)));
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [hydrated, preferences]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const controller = new AbortController();
    try {
      const [streamerResult, categoryResult] = await Promise.all([
        api.streamers(controller.signal),
        api.categories(controller.signal),
      ]);
      setStreamers(streamerResult.data);
      setCategories(categoryResult.data);
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

  const value = useMemo<AlertStore>(() => ({
    streamers,
    categories,
    preferences,
    loading,
    usingDemoData,
    refresh,
    toggleEnabled(channelId) {
      update(channelId, (item) => {
        const enabled = !item.enabled;
        return {
          ...item,
          enabled,
          liveStarted: enabled,
          categoryChanged: enabled,
          titleChanged: enabled,
          ...(enabled ? {} : { keywords: [] }),
        };
      });
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
      setPreferences((current) => current.map((item) => ({
        ...item,
        enabled,
        liveStarted: enabled,
        categoryChanged: enabled,
        titleChanged: enabled,
        ...(enabled ? {} : { keywords: [] }),
      })));
    },
  }), [categories, loading, preferences, refresh, streamers, update, usingDemoData]);

  return <AlertStoreContext.Provider value={value}>{children}</AlertStoreContext.Provider>;
}

export function useAlertStore() {
  const value = useContext(AlertStoreContext);
  if (!value) throw new Error('useAlertStore must be used inside AlertStoreProvider');
  return value;
}
