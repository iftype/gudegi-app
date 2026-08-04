import type { FollowedChannel } from '@/types';

export const CHZZK_HOME = 'https://chzzk.naver.com/';
export const FOLLOWINGS_URL = 'https://api.chzzk.naver.com/service/v1/channels/followings?size=505&sortType=FOLLOW';
export const MAX_FOLLOW_SELECTION = 30;
export const READ_FOLLOWINGS_RESPONSE_SCRIPT = `
  (function () {
    if (location.hostname === 'api.chzzk.naver.com') {
      window.ReactNativeWebView.postMessage(document.body.innerText || '');
    }
  })();
  true;
`;

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

export function parseFollowedChannels(value: unknown): FollowedChannel[] | null {
  const root = objectValue(value);
  const content = objectValue(root?.content);
  const raw = content?.followingList ?? root?.followingList;
  if (!Array.isArray(raw)) return null;

  const channels = raw.flatMap((entry): FollowedChannel[] => {
    const item = objectValue(entry);
    const channel = objectValue(item?.channel);
    const channelId = item?.channelId ?? channel?.channelId;
    const channelName = channel?.channelName ?? item?.channelName;
    const image = channel?.channelImageUrl ?? item?.channelImageUrl;
    if (typeof channelId !== 'string' || !/^[a-f0-9]{32}$/.test(channelId)) return [];
    if (typeof channelName !== 'string' || !channelName.trim()) return [];
    return [{
      channelId,
      channelName: channelName.trim(),
      channelImageUrl: typeof image === 'string' && image ? image : null,
    }];
  });

  return [...new Map(channels.map((channel) => [channel.channelId, channel])).values()];
}
