import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AlertStoreProvider } from '@/features/alerts/alert-store';
import { palette } from '@/constants/theme';
import { NotificationResponseListener } from '@/notifications/notification-response-listener';

const gudegiTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.accent,
    background: palette.background,
    card: palette.surface,
    border: palette.border,
    text: palette.text,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={gudegiTheme}>
        <AlertStoreProvider>
          <NotificationResponseListener />
          <StatusBar style="light" />
          <Stack screenOptions={{ contentStyle: { backgroundColor: palette.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="alert-rules"
              options={{
                headerShown: false,
                presentation: 'formSheet',
                sheetAllowedDetents: [0.72, 1],
                sheetInitialDetentIndex: 0,
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                contentStyle: { backgroundColor: palette.surface },
              }}
            />
            <Stack.Screen
              name="category-filter"
              options={{
                headerShown: false,
                presentation: 'formSheet',
                sheetAllowedDetents: [0.62, 0.92],
                sheetInitialDetentIndex: 1,
                sheetGrabberVisible: true,
                sheetCornerRadius: 24,
                contentStyle: { backgroundColor: palette.surface },
              }}
            />
          </Stack>
        </AlertStoreProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
