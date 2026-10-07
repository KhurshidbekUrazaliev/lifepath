import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store';
import { useTheme } from '../src/theme';
import { Celebrations } from '../src/components/Celebrations';
import { useNotificationSync } from '../src/notifications';
import { useSyncManager } from '../src/sync';
import { useEntitlementSync } from '../src/plusState';

function Background() {
  useNotificationSync();
  useSyncManager();
  useEntitlementSync();
  return null;
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

export default function RootLayout() {
  const t = useTheme();
  const hydrated = useHydrated();

  return (
    <SafeAreaProvider>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      {!hydrated ? (
        <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={t.accent} />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: t.bg }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="folder/[id]" />
            <Stack.Screen name="task/[id]" />
            <Stack.Screen name="new-folder" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="new-task" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="plan-session" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="echo" />
            <Stack.Screen name="wardrobe" />
            <Stack.Screen name="rankings" />
            <Stack.Screen name="plus" />
            <Stack.Screen name="ai-plan" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="auth-callback" options={{ animation: 'fade' }} />
          </Stack>
          <Background />
          <Celebrations />
        </View>
      )}
    </SafeAreaProvider>
  );
}
