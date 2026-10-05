import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/sync';
import { type, useTheme } from '../src/theme';

/**
 * Google sends the browser back to /auth-callback. The Supabase client finishes the sign-in
 * (on the web from the URL; on phones in signInWithGoogle), then we return to the You tab.
 */
export default function AuthCallback() {
  const t = useTheme();
  const userId = useAuth((s) => s.userId);

  useEffect(() => {
    const done = () => router.replace('/me');
    if (userId) {
      done();
      return;
    }
    const fallback = setTimeout(done, 6000); // don't strand the user if something went wrong
    return () => clearTimeout(fallback);
  }, [userId]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: t.bg }}>
      <ActivityIndicator color={t.accent} />
      <Text style={[type.body, { color: t.textMuted }]}>Signing you in…</Text>
    </View>
  );
}
