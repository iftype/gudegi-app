import * as WebBrowser from 'expo-web-browser';

import { palette } from '@/constants/theme';

export function openChzzkLive(channelId: string) {
  if (!/^[a-f0-9]{32}$/.test(channelId)) return Promise.resolve();
  return WebBrowser.openBrowserAsync(
    `https://chzzk.naver.com/live/${encodeURIComponent(channelId)}`,
    {
      controlsColor: palette.accent,
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    },
  ).then(() => undefined);
}
