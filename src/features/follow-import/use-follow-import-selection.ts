import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { api } from '@/api/client';
import { useAlertStore } from '@/features/alerts/alert-store';
import { getInstallationId } from '@/notifications/native-push';
import type { FollowedChannel } from '@/types';
import { MAX_FOLLOW_SELECTION } from './model';

export function useFollowImportSelection(channels: FollowedChannel[]) {
  const store = useAlertStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(new Set<string>());
  const [requested, setRequested] = useState(new Set<string>());
  const [submitting, setSubmitting] = useState(false);

  const trackedIds = useMemo(
    () => new Set(store.streamers.filter((streamer) => streamer.enabled).map((streamer) => streamer.channelId)),
    [store.streamers],
  );
  const alertIds = useMemo(
    () => new Set(store.preferences.map((preference) => preference.channelId)),
    [store.preferences],
  );
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    return channels.filter((channel) => channel.channelName.toLocaleLowerCase('ko-KR').includes(normalized));
  }, [channels, query]);
  const selectableVisible = useMemo(
    () => visible.filter((channel) => !alertIds.has(channel.channelId) && !requested.has(channel.channelId)),
    [alertIds, requested, visible],
  );
  const allVisibleSelected = selectableVisible.length > 0
    && selectableVisible.every((channel) => selected.has(channel.channelId));

  function toggle(channelId: string) {
    if (alertIds.has(channelId) || requested.has(channelId)) return;
    if (!selected.has(channelId) && selected.size >= MAX_FOLLOW_SELECTION) {
      Alert.alert('선택 한도', `한 번에 최대 ${MAX_FOLLOW_SELECTION}명까지 신청할 수 있습니다.`);
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  }

  function toggleVisible() {
    if (!allVisibleSelected) {
      const remaining = MAX_FOLLOW_SELECTION - selected.size;
      const unselected = selectableVisible.filter((channel) => !selected.has(channel.channelId));
      if (unselected.length > remaining) {
        setSelected((current) => new Set([
          ...current,
          ...unselected.slice(0, remaining).map((channel) => channel.channelId),
        ]));
        Alert.alert('선택 한도', `한 번에 최대 ${MAX_FOLLOW_SELECTION}명까지 선택했습니다.`);
        return;
      }
    }
    setSelected((current) => {
      const next = new Set(current);
      for (const channel of selectableVisible) {
        if (allVisibleSelected) next.delete(channel.channelId);
        else next.add(channel.channelId);
      }
      return next;
    });
  }

  async function applySelection() {
    if (!selected.size || submitting) return;
    setSubmitting(true);
    try {
      const picked = channels.filter((channel) => selected.has(channel.channelId));
      const supportedIds = picked
        .filter((channel) => trackedIds.has(channel.channelId))
        .map((channel) => channel.channelId);
      const unsupported = picked.filter((channel) => !trackedIds.has(channel.channelId));
      const accepted = new Set(supportedIds);
      const requestedIds = new Set<string>();

      if (unsupported.length) {
        const anonymousId = await getInstallationId();
        const result = await api.requestFollowedStreamers(unsupported, anonymousId);
        result.data.supported.forEach((channelId) => accepted.add(channelId));
        result.data.requested.forEach((channelId) => requestedIds.add(channelId));
      }

      store.setChannelsSelected([...accepted], true);
      setRequested((current) => new Set([...current, ...requestedIds]));
      setSelected(new Set());
      Alert.alert(
        '적용 완료',
        [
          accepted.size ? `${accepted.size}명은 알림 목록에 추가했습니다.` : '',
          requestedIds.size ? `${requestedIds.size}명은 추적 신청을 보냈습니다.` : '',
        ].filter(Boolean).join('\n'),
      );
    } catch {
      Alert.alert('적용 실패', '선택한 스트리머를 적용하지 못했습니다. 서버 연결을 확인해 주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return {
    alertIds,
    allVisibleSelected,
    applySelection,
    query,
    requested,
    selected,
    selectableVisible,
    setQuery,
    submitting,
    toggle,
    toggleVisible,
    trackedIds,
    visible,
  };
}
