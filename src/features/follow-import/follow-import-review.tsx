import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import type { FollowedChannel } from '@/types';
import { FollowedChannelRow } from './followed-channel-row';
import { FollowImportHeader } from './follow-import-header';
import { followImportStyles as styles } from './styles';
import { useFollowImportSelection } from './use-follow-import-selection';

export function FollowImportReview({
  channels,
  onClose,
}: {
  channels: FollowedChannel[];
  onClose: () => void;
}) {
  const selection = useFollowImportSelection(channels);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <FollowImportHeader
        title="신청할 스트리머"
        subtitle={`팔로우 ${channels.length}명 · 필요한 스트리머만 선택하세요.`}
        onClose={onClose}
      />

      <View style={styles.tools}>
        <View style={styles.search}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search' }} size={15} tintColor={palette.textMuted} />
          <TextInput
            value={selection.query}
            onChangeText={selection.setQuery}
            placeholder="팔로우 스트리머 검색"
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
          />
        </View>
        <Pressable
          disabled={!selection.selectableVisible.length}
          onPress={selection.toggleVisible}
          style={({ pressed }) => [styles.selectAll, selection.allVisibleSelected && styles.selectedSurface, pressed && styles.pressed]}>
          <Text style={[styles.selectAllText, selection.allVisibleSelected && styles.accentText]}>
            {selection.allVisibleSelected ? '전체 해제' : '전체 선택'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={selection.visible}
        keyExtractor={(item) => item.channelId}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <FollowedChannelRow
            channel={item}
            alreadyAdded={selection.alertIds.has(item.channelId)}
            alreadyRequested={selection.requested.has(item.channelId)}
            isSelected={selection.selected.has(item.channelId)}
            isTracked={selection.trackedIds.has(item.channelId)}
            onToggle={() => selection.toggle(item.channelId)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>검색 결과가 없습니다.</Text>}
      />

      <View style={styles.footer}>
        <Text style={styles.selectionSummary}>
          {selection.selected.size ? `${selection.selected.size}명 선택됨` : '신청할 스트리머를 선택하세요'}
        </Text>
        <Pressable
          disabled={!selection.selected.size || selection.submitting}
          onPress={() => void selection.applySelection()}
          style={({ pressed }) => [
            styles.primaryButton,
            (!selection.selected.size || selection.submitting) && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.primaryButtonText}>{selection.submitting ? '적용 중…' : '선택한 스트리머 적용'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
