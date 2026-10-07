// Plus status on this device. The truth is the server's `entitlements` row (written by a payment
// webhook, never by the app). In development builds a local switch lets you test Plus screens.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from './supabase';
import { useAuth } from './sync';
import { isPlusActive } from './lib/plus';

interface PlanState {
  serverPlus: boolean;
  devPlus: boolean; // only honored in development builds
  setDevPlus: (v: boolean) => void;
}

export const usePlan = create<PlanState>()(
  persist(
    (set) => ({ serverPlus: false, devPlus: false, setDevPlus: (v) => set({ devPlus: v }) }),
    { name: 'lifepath-plan-v1', storage: createJSONStorage(() => AsyncStorage), partialize: (s) => ({ devPlus: s.devPlus }) },
  ),
);

export function usePlus(): boolean {
  return usePlan((s) => s.serverPlus || (__DEV__ && s.devPlus));
}

/** Mount once at the root: reads the entitlement after sign-in and when the app comes back to the foreground. */
export function useEntitlementSync() {
  const userId = useAuth((s) => s.userId);
  useEffect(() => {
    if (!userId) {
      usePlan.setState({ serverPlus: false });
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const { data } = await supabase.from('entitlements').select('plan,expires_at').eq('user_id', userId).maybeSingle();
        if (alive) usePlan.setState({ serverPlus: isPlusActive(data) });
      } catch {
        // offline: keep what we knew
      }
    };
    load();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && load());
    return () => {
      alive = false;
      sub.remove();
    };
  }, [userId]);
}
