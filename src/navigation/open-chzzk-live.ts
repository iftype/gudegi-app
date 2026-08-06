import { Linking } from 'react-native';

export function openChzzkLive(channelId: string) {
  if (!/^[a-f0-9]{32}$/.test(channelId)) return Promise.resolve();
  return Linking.openURL(`https://m.chzzk.naver.com/live/${encodeURIComponent(channelId)}`);
}
