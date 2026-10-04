// Applies the schedule from lib/schedule.ts to the device's local notifications.
// Strategy: whenever relevant data changes, cancel everything and reschedule.
// That keeps the device in sync without tracking individual notification ids.
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useStore } from './store';
import { buildSchedule, ScheduledItem } from './lib/schedule';

const CHANNEL_ID = 'reminders';
const supported = Platform.OS !== 'web';

let configured = false;
function configure() {
  if (configured || !supported) return;
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
  if (!supported) return false;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/** Asks for permission if it hasn't been decided yet. Returns whether we may notify. */
export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
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

function toTrigger(item: ScheduledItem): Notifications.NotificationTriggerInput {
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
  if (!supported) return 0;
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
          trigger: toTrigger(item),
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
  if (!(await ensurePermission())) return false;
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

function openFromNotification(response: Notifications.NotificationResponse | null) {
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
    if (!supported) return;
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
