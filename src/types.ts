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
  concurrentUserCount?: number;
  catalogSource?: string | null;
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

export type StreamerAlertEvent = {
  id: string;
  eventType: 'live_started' | 'live_ended' | 'title_changed' | 'category_changed';
  previousValue: string | null;
  newValue: string | null;
  occurredAt: number;
  broadcastTitle: string;
  category: string | null;
};

export type CategoryFollowAlertEvent = {
  id: string;
  categoryKey: string;
  categoryValue: string;
  channelId: string;
  channelName: string;
  channelImageUrl: string | null;
  broadcastTitle: string;
  concurrentUserCount: number;
  occurredAt: number;
};

export type ReceivedNotificationLog = {
  id: string;
  title: string;
  body: string;
  receivedAt: number;
  channelId: string | null;
};
