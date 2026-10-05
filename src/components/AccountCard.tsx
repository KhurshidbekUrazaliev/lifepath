import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle, signOut, syncNow, useAuth } from '../sync';
import { formatRelative } from '../lib/dates';
import { radius, space, type, useTheme } from '../theme';
import { BounceButton, Squish } from './BounceButton';
import { Card, Muted } from './ui';
import { confirmAction, haptic } from './feedback';

/** Google sign-in when signed out; account, sync status and sign-out when signed in. */
export function AccountCard() {
  const t = useTheme();
  const { ready, email, userId, sync, lastSyncedAt, error } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (!ready) {
    return (
      <Card style={styles.center}>
        <ActivityIndicator color={t.accent} />
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card style={{ gap: space.md }}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="cloud-upload-outline" size={22} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>Back up & sync</Text>
            <Muted>Keep your progress safe and use Lifepath on the web too. Your current data comes with you.</Muted>
          </View>
        </View>
        <Squish
          disabled={busy}
          hapticKind="medium"
          onPress={async () => {
            setBusy(true);
            setMessage('');
            const err = await signInWithGoogle();
            setBusy(false);
            if (err) setMessage(err);
            else haptic('success');
          }}
          style={[styles.google, { backgroundColor: t.dark ? '#FFFFFF' : '#16151A' }]}
          accessibilityLabel="Continue with Google"
        >
          {busy ? (
            <ActivityIndicator color={t.dark ? '#16151A' : '#FFFFFF'} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={t.dark ? '#16151A' : '#FFFFFF'} />
              <Text style={[type.body, { fontWeight: '800', color: t.dark ? '#16151A' : '#FFFFFF' }]}>Continue with Google</Text>
            </>
          )}
        </Squish>
        {message ? <Muted style={{ color: t.danger }}>{message}</Muted> : null}
      </Card>
    );
  }

  const status =
    sync === 'syncing'
      ? { icon: 'sync' as const, text: 'Syncing…', color: t.accent }
      : sync === 'offline'
        ? { icon: 'cloud-offline-outline' as const, text: "Offline. Changes will sync when you're back online.", color: t.textMuted }
        : sync === 'error'
          ? { icon: 'alert-circle-outline' as const, text: `Sync problem: ${error ?? 'unknown error'}`, color: t.danger }
          : { icon: 'checkmark-circle' as const, text: lastSyncedAt ? `Synced ${formatRelative(lastSyncedAt)}` : 'Up to date', color: t.success };

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: t.accentSoft }]}>
          <Ionicons name="person" size={20} color={t.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.body, { color: t.text, fontWeight: '800' }]} numberOfLines={1}>{email ?? 'Signed in'}</Text>
          <View style={styles.statusRow}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[type.small, { color: status.color, flex: 1 }]}>{status.text}</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <BounceButton label="Sync now" variant="soft" size="sm" disabled={sync === 'syncing'} onPress={() => syncNow()} />
        </View>
        <View style={{ flex: 1 }}>
          <BounceButton
            label="Sign out"
            variant="soft"
            size="sm"
            color={t.danger}
            onPress={() =>
              confirmAction(
                'Sign out?',
                'Your data stays safe in your account. This device will be cleared until you sign in again.',
                'Sign out',
                () => signOut(),
              )
            }
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: radius.pill },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
