// Applies the schedule from lib/schedule.ts to the device's local notifications.
// Strategy: whenever relevant data changes, cancel everything and reschedule.
// That keeps the device in sync without tracking individual notification ids.
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { router } from 'expo-router';
import { useStore } from './store';
import { buildSchedule, ScheduledItem } from './lib/schedule';

const CHANNEL_ID = 'reminders';

/**
 * Expo Go on Android throws as soon as expo-notifications is loaded (since SDK 53),
 * so the module is only required where it works: iOS Expo Go and real/development builds.
 */
const isAndroidExpoGo =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const notificationsAvailable = Platform.OS !== 'web' && !isAndroidExpoGo;

/** Why reminders can't fire here, for showing in the UI. Empty when they can. */
export const notificationsUnavailableReason =
  Platform.OS === 'web'
    ? "Reminders fire in the phone app. The web version can't send notifications yet."
    : isAndroidExpoGo
      ? 'Expo Go on Android does not support notifications. Your reminders are saved and will fire in the installed app build.'
      : '';

let mod: typeof NotificationsModule | null | undefined;
function getNotifications(): typeof NotificationsModule | null {
  if (mod !== undefined) return mod;
  if (!notificationsAvailable) return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('expo-notifications') as typeof NotificationsModule;
  } catch (e) {
    console.warn('Notifications unavailable', e);
    mod = null;
  }
  return mod;
}

let configured = false;
function configure() {
  const Notifications = getNotifications();
  if (configured || !Notifications) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export async function hasPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/** Asks for permission if it hasn't been decided yet. Returns whether we may notify. */
export async function ensurePermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  configure();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

function toTrigger(Notifications: typeof NotificationsModule, item: ScheduledItem): NotificationsModule.NotificationTriggerInput {
  const channelId = Platform.OS === 'android' ? CHANNEL_ID : undefined;
  if (item.trigger.kind === 'weekly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: item.trigger.weekday,
      hour: item.trigger.hour,
      minute: item.trigger.minute,
      channelId,
    };
  }
  return { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(item.trigger.at), channelId };
}

let syncing: Promise<void> | null = null;
let pending = false;

/** Rebuilds all scheduled notifications from current app state. Safe to call often. */
export async function syncNotifications(): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;
  if (syncing) {
    pending = true; // run once more after the current sync finishes
    await syncing;
    return 0;
  }
  let count = 0;
  syncing = (async () => {
    configure();
    if (!(await hasPermission())) return;
    const s = useStore.getState();
    const items = buildSchedule({ tasks: s.tasks, folders: s.folders, plans: s.plans, entries: s.entries, profile: s.profile });
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const item of items) {
        await Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: { title: item.title, body: item.body, data: item.data, sound: 'default' },
          trigger: toTrigger(Notifications, item),
        });
      }
      count = items.length;
    } catch (e) {
      console.warn('Could not schedule notifications', e);
    }
  })();
  await syncing;
  syncing = null;
  if (pending) {
    pending = false;
    return syncNotifications();
  }
  return count;
}

export async function sendTestNotification(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications || !(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: '🌱 Lifepath', body: 'Reminders are working. See you at your next session!' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
  return true;
}

function openFromNotification(response: NotificationsModule.NotificationResponse | null) {
  const data = response?.notification.request.content.data as { taskId?: string } | undefined;
  if (data?.taskId && useStore.getState().tasks.some((t) => t.id === data.taskId)) {
    router.push({ pathname: '/task/[id]', params: { id: data.taskId } });
  }
}

/**
 * Mount once at the root: keeps notifications in sync with app data,
 * resyncs when the app returns to the foreground, and opens the task when a notification is tapped.
 */
export function useNotificationSync() {
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;
    configure();
    syncNotifications();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubStore = useStore.subscribe((s, prev) => {
      const changed =
        s.tasks !== prev.tasks ||
        s.plans !== prev.plans ||
        s.entries !== prev.entries ||
        s.folders !== prev.folders ||
        s.profile.nudge !== prev.profile.nudge;
      if (!changed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncNotifications(), 800);
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNotifications();
    });

    const tapSub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    Notifications.getLastNotificationResponseAsync().then(openFromNotification).catch(() => {});

    return () => {
      if (timer) clearTimeout(timer);
      unsubStore();
      appState.remove();
      tapSub.remove();
    };
  }, []);
}
