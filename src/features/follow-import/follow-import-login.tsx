import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { palette } from '@/constants/theme';
import type { FollowedChannel } from '@/types';
import { FollowImportHeader } from './follow-import-header';
import {
  CHZZK_HOME,
  FOLLOWINGS_URL,
  parseFollowedChannels,
  READ_FOLLOWINGS_RESPONSE_SCRIPT,
} from './model';
import { followImportStyles as styles } from './styles';

export function FollowImportLogin({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (channels: FollowedChannel[]) => void;
}) {
  const webView = useRef<WebView>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('치지직에 로그인한 뒤 목록 읽기를 눌러주세요.');

  function returnToLogin(messageText: string) {
    setReading(false);
    setMessage(messageText);
    webView.current?.injectJavaScript(`window.location.replace(${JSON.stringify(CHZZK_HOME)}); true;`);
  }

  function readFollowings() {
    if (reading) return;
    setReading(true);
    setMessage('팔로우 목록을 읽고 있습니다…');
    webView.current?.injectJavaScript(`window.location.assign(${JSON.stringify(FOLLOWINGS_URL)}); true;`);
  }

  function handleWebMessage(event: WebViewMessageEvent) {
    try {
      const channels = parseFollowedChannels(JSON.parse(event.nativeEvent.data) as unknown);
      if (!channels) {
        returnToLogin('로그인 상태를 확인하지 못했습니다. 치지직 로그인 후 다시 시도해 주세요.');
        return;
      }
      setReading(false);
      onImported(channels);
    } catch {
      returnToLogin('목록을 읽지 못했습니다. 치지직 로그인 상태를 확인해 주세요.');
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <FollowImportHeader title="팔로우 불러오기" subtitle={message} onClose={onClose} />
      <View style={styles.browserFrame}>
        <WebView
          ref={webView}
          source={{ uri: CHZZK_HOME }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          injectedJavaScript={READ_FOLLOWINGS_RESPONSE_SCRIPT}
          onMessage={handleWebMessage}
          style={styles.webView}
        />
      </View>
      <View style={styles.loginActions}>
        <Text style={styles.privacy}>로그인 정보는 구데기 서버로 전송되지 않으며 팔로우 채널 정보만 읽습니다.</Text>
        <Pressable
          disabled={reading}
          onPress={readFollowings}
          style={({ pressed }) => [styles.primaryButton, reading && styles.disabled, pressed && styles.pressed]}>
          <SymbolView name={{ ios: 'arrow.down.circle', android: 'download' }} size={17} tintColor={palette.accentText} />
          <Text style={styles.primaryButtonText}>{reading ? '읽는 중…' : '팔로우 목록 읽기'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
