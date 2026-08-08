import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor={palette.background}
      iconColor={{ default: palette.textMuted, selected: palette.accent }}
      indicatorColor={palette.surfaceRaised}
      labelStyle={{
        default: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
        selected: { color: palette.accent, fontSize: 11, fontWeight: '800' },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>알림 관리</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bell', selected: 'bell.fill' }}
          md={{ default: 'notifications_none', selected: 'notifications' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="categories">
        <NativeTabs.Trigger.Label>카테고리</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'tag', selected: 'tag.fill' }}
          md={{ default: 'sell', selected: 'sell' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="streamers">
        <NativeTabs.Trigger.Label>스트리머</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.2', selected: 'person.2.fill' }}
          md={{ default: 'group', selected: 'group' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>설정</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md={{ default: 'settings', selected: 'settings' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
