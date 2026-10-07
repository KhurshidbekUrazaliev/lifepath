// Account + cloud sync engine. The merge rules live in lib/syncPlan.ts (pure, tested);
// this file does the network, storage and timing.
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { initialProfile, useStore } from './store';
import { uploadPendingPhotos } from './photos';
import { fromRecordMap, planSync, PushRow, RemoteRecord, Snapshot, toRecordMap } from './lib/syncPlan';

type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

interface AuthState {
  ready: boolean; // session restored from storage
  userId?: string;
  email?: string;
  sync: SyncState;
  lastSyncedAt?: number;
  error?: string;
}

export const useAuth = create<AuthState>()(() => ({ ready: false, sync: 'idle' }));

// ---------- Sign-in with Google (Supabase OAuth, PKCE) ----------

WebBrowser.maybeCompleteAuthSession();

/**
 * Opens Google sign-in. On phones it uses an in-app browser and returns to the app via the
 * lifepath:// link; on the web the page redirects to Google and back (the session is picked up on return).
 * Returns an error message, or null on success / cancel.
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth-callback` },
      });
      return error ? error.message : null;
    }
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return error?.message ?? 'Could not start Google sign-in.';
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return null; // closed by the user
    const { queryParams } = Linking.parse(result.url);
    if (queryParams?.error_description) return String(queryParams.error_description);
    const code = queryParams?.code;
    if (typeof code !== 'string') return 'Google sign-in did not finish. Please try again.';
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    return exchangeError ? exchangeError.message : null;
  } catch (e: any) {
    return /network|fetch/i.test(String(e?.message)) ? "Can't reach the server. Check your internet connection." : String(e?.message ?? e);
  }
}

/** Final sync, then sign out and clear this device (the data stays in the account). */
export async function signOut(): Promise<void> {
  const userId = useAuth.getState().userId;
  await syncNow().catch(() => {});
  await supabase.auth.signOut().catch(() => {});
  if (userId) await AsyncStorage.removeItem(metaKey(userId)).catch(() => {});
  useStore.getState().resetAll();
  useAuth.setState({ userId: undefined, email: undefined, sync: 'idle', lastSyncedAt: undefined, error: undefined });
}

// ---------- Sync ----------

interface SyncMeta {
  cursor: string | null; // latest server updated_at seen
  snapshot: Snapshot;
}

const metaKey = (userId: string) => `lifepath-sync-v1:${userId}`;
const PAGE = 1000;
const PUSH_CHUNK = 500;
const CURSOR_OVERLAP_MS = 5000; // re-read a few seconds back; re-applying is harmless

async function loadMeta(userId: string): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(metaKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    // corrupted meta: start fresh (a full merge, nothing is lost)
  }
  return { cursor: null, snapshot: {} };
}

async function pull(cursor: string | null): Promise<{ rows: RemoteRecord[]; maxUpdated: string | null }> {
  const rows: RemoteRecord[] = [];
  let maxUpdated = cursor;
  const since = cursor ? new Date(Date.parse(cursor) - CURSOR_OVERLAP_MS).toISOString() : null;
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from('records').select('kind,id,data,deleted,updated_at').order('updated_at', { ascending: true });
    if (since) q = q.gt('updated_at', since);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as RemoteRecord[];
    rows.push(...page);
    for (const r of page) if (!maxUpdated || r.updated_at > maxUpdated) maxUpdated = r.updated_at;
    if (page.length < PAGE) break;
  }
  return { rows, maxUpdated };
}

async function push(userId: string, rows: PushRow[]) {
  for (let i = 0; i < rows.length; i += PUSH_CHUNK) {
    const chunk = rows.slice(i, i + PUSH_CHUNK).map((r) => ({ ...r, user_id: userId }));
    const { error } = await supabase.from('records').upsert(chunk, { onConflict: 'user_id,kind,id' });
    if (error) throw error;
  }
}

let running: Promise<void> | null = null;
let again = false;

/** Pulls remote changes, merges them into the app, and pushes local changes. Safe to call often. */
export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    const userId = useAuth.getState().userId;
    if (!userId) return;
    useAuth.setState({ sync: 'syncing' });
    try {
      const meta = await loadMeta(userId);
      const { rows, maxUpdated } = await pull(meta.cursor);

      // Read, merge and apply synchronously so no edit can slip in between.
      const s = useStore.getState();
      const plan = planSync(
        toRecordMap({ folders: s.folders, tasks: s.tasks, entries: s.entries, plans: s.plans, profile: s.profile }),
        meta.snapshot,
        rows,
      );
      if (plan.localChanged) useStore.getState().replaceData(fromRecordMap(plan.local, initialProfile));

      if (plan.push.length) await push(userId, plan.push);
      await AsyncStorage.setItem(metaKey(userId), JSON.stringify({ cursor: maxUpdated, snapshot: plan.snapshot }));
      useAuth.setState({ sync: 'idle', lastSyncedAt: Date.now(), error: undefined });
      uploadPendingPhotos(userId).catch(() => {}); // photos upload in the background; their paths sync next round
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const offline = /network|fetch|timeout|offline/i.test(msg);
      useAuth.setState({ sync: offline ? 'offline' : 'error', error: offline ? undefined : msg });
    }
  })();
  try {
    await running;
  } finally {
    running = null;
  }
  if (again) {
    again = false;
    return syncNow();
  }
}

/**
 * Mount once at the root. Restores the session, syncs after sign-in, after local changes
 * (debounced), when the app returns to the foreground, and every minute while open.
 */
export function useSyncManager() {
  useEffect(() => {
    const applySession = (session: Session | null) => {
      const prev = useAuth.getState().userId;
      useAuth.setState({ ready: true, userId: session?.user.id, email: session?.user.email ?? undefined });
      if (session && session.user.id !== prev) syncNow();
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useStore.subscribe((s, prev) => {
      if (!useAuth.getState().userId) return;
      if (s.folders === prev.folders && s.tasks === prev.tasks && s.entries === prev.entries && s.plans === prev.plans && s.profile === prev.profile) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncNow(), 2500);
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') syncNow();
    }, 60_000);

    return () => {
      authSub.subscription.unsubscribe();
      unsubStore();
      appState.remove();
      clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, []);
}
