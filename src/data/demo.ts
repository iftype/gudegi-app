import type { AlertPreference, LiveCategory, Streamer } from '@/types';

export const demoStreamers: Streamer[] = [
  {
    channelId: 'demo-han',
    channelName: '한동숙',
    channelImageUrl: null,
    enabled: true,
    isLive: true,
    activeBroadcastId: 'demo-live',
    collectorState: 'live',
    lastCheckedAt: Date.now(),
    currentTitle: '오늘도 재밌게 시작합니다',
    currentCategory: '리그 오브 레전드',
    activeBroadcastStartedAt: Date.now() - 15 * 60 * 1000,
  },
  {
    channelId: 'demo-chim',
    channelName: '침착맨',
    channelImageUrl: null,
    enabled: true,
    isLive: false,
    activeBroadcastId: null,
    collectorState: 'offline',
    lastCheckedAt: Date.now(),
    currentTitle: null,
    currentCategory: '토크',
  },
  {
    channelId: 'demo-ok',
    channelName: '옥냥이',
    channelImageUrl: null,
    enabled: true,
    isLive: true,
    activeBroadcastId: 'demo-live-2',
    collectorState: 'live',
    lastCheckedAt: Date.now(),
    currentTitle: '신작 게임 첫 플레이',
    currentCategory: '종합 게임',
    activeBroadcastStartedAt: Date.now() - 42 * 60 * 1000,
  },
];

export const demoCategories: LiveCategory[] = [
  ['talk:TALK', 'talk', '저챗', 132],
  ['game:league-of-legends', 'league-of-legends', '리그 오브 레전드', 89],
  ['game:lost-ark', 'lost-ark', '로스트아크', 56],
  ['game:valorant', 'valorant', '발로란트', 41],
  ['game:minecraft', 'minecraft', '마인크래프트', 35],
  ['sports:baseball', 'baseball', '야구', 18],
].map(([categoryKey, categoryId, categoryValue, openLiveCount]) => ({
  categoryKey: String(categoryKey),
  categoryType: String(categoryKey).startsWith('sports') ? 'SPORTS' : 'GAME',
  categoryId: String(categoryId),
  categoryValue: String(categoryValue),
  posterImageUrl: null,
  openLiveCount: Number(openLiveCount),
  concurrentUserCount: 0,
  syncedAt: Date.now(),
}));

export const demoPreferences: AlertPreference[] = demoStreamers.slice(0, 2).map((streamer) => ({
  channelId: streamer.channelId,
  enabled: true,
  liveStarted: true,
  categoryChanged: true,
  titleChanged: true,
  keywords: [],
  categoryFilter: { allCategories: true, categoryKeys: [] },
}));
