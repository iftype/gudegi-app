export type Streamer = {
  channelId: string;
  channelName: string;
  channelImageUrl: string | null;
  enabled: boolean;
  isLive: boolean;
  activeBroadcastId: string | null;
  collectorState: string;
  lastCheckedAt: number | null;
  currentTitle?: string | null;
  currentCategory?: string | null;
  activeBroadcastStartedAt?: number | null;
};

export type CategoryFilter = {
  allCategories: boolean;
  categoryKeys: string[];
};

export type LiveCategory = {
  categoryKey: string;
  categoryType: string;
  categoryId: string;
  categoryValue: string;
  posterImageUrl: string | null;
  openLiveCount: number;
  concurrentUserCount: number;
  syncedAt: number;
};

export type AlertRules = {
  liveStarted: boolean;
  categoryChanged: boolean;
  titleChanged: boolean;
  keywords: string[];
};

export type AlertPreference = AlertRules & {
  channelId: string;
  enabled: boolean;
  categoryFilter: CategoryFilter;
};
