// Builds the list of local notifications the app should have scheduled.
// Pure: no Expo imports, so it can be unit tested. src/notifications.ts applies it.
import { Entry, Folder, Plan, Profile, Task } from './types';
import { addDays, dayKey } from './dates';
import { computeProgress } from './progress';
import { dayKeyToMs, parseTime } from './calendar';
import { visibleStreak } from './gamify';

export type Trigger =
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }
  | { kind: 'date'; at: number };

export interface ScheduledItem {
  id: string;
  title: string;
  body: string;
  data: { kind: 'reminder' | 'plan' | 'nudge'; taskId?: string };
  trigger: Trigger;
}

export interface ScheduleInput {
  tasks: Task[];
  folders: Folder[];
  plans: Plan[];
  entries: Entry[];
  profile: Profile;
}

/** iOS keeps at most 64 pending local notifications. */
export const MAX_SCHEDULED = 60;
const PLAN_HORIZON_DAYS = 30;
const NUDGE_DAYS = 7;
const DEFAULT_PLAN_HOUR = 9;

export function buildSchedule(input: ScheduleInput, now: number = Date.now()): ScheduledItem[] {
  const { tasks, folders, plans, entries, profile } = input;
  const folderOf = (t: Task) => folders.find((f) => f.id === t.folderId);
  const items: ScheduledItem[] = [];

  // 1. Repeating task reminders.
  for (const task of tasks) {
    if (task.completedAt || !task.reminder) continue;
    const folder = folderOf(task);
    if (!folder) continue;
    const p = computeProgress(task, entries);
    for (const weekday of task.reminder.days) {
      items.push({
        id: `rem-${task.id}-${weekday}`,
        title: `${folder.icon} ${task.title}`,
        body: `${p.label} so far. A small step today keeps it moving.`,
        data: { kind: 'reminder', taskId: task.id },
        trigger: { kind: 'weekly', weekday, hour: task.reminder.hour, minute: task.reminder.minute },
      });
    }
  }

  // 2. Planned sessions in the next 30 days.
  const horizon = addDays(now, PLAN_HORIZON_DAYS);
  const dated: ScheduledItem[] = [];
  for (const plan of plans) {
    if (plan.doneAt) continue;
    const task = tasks.find((t) => t.id === plan.taskId);
    const folder = task && folderOf(task);
    if (!task || !folder || task.completedAt) continue;
    const time = parseTime(plan.time);
    const at = dayKeyToMs(plan.day, time?.hour ?? DEFAULT_PLAN_HOUR, time?.minute ?? 0);
    if (at <= now || at > horizon) continue;
    dated.push({
      id: `plan-${plan.id}`,
      title: `${folder.icon} Planned: ${task.title}`,
      body: plan.note?.trim() || (time ? 'Your planned session starts now.' : 'You planned a session for today.'),
      data: { kind: 'plan', taskId: task.id },
      trigger: { kind: 'date', at },
    });
  }

  // 3. Evening streak nudge for the next 7 days (skip today if already logged).
  if (profile.nudge?.enabled) {
    const today = dayKey(now);
    const loggedToday = entries.some((e) => dayKey(e.at) === today);
    const streak = visibleStreak(profile.streak, profile.freezes, today);
    for (let d = 0; d < NUDGE_DAYS; d++) {
      const key = dayKey(addDays(now, d));
      if (d === 0 && loggedToday) continue;
      const at = dayKeyToMs(key, profile.nudge.hour, profile.nudge.minute);
      if (at <= now) continue;
      // The exact streak on future days isn't known yet, so only today's nudge names a number.
      const title = d === 0 && streak > 0 ? `🔥 Keep your ${streak}-day streak` : d === 0 ? '🌱 One small step' : '🔥 Keep your streak going';
      dated.push({
        id: `nudge-${key}`,
        title,
        body: d === 0 && streak === 0 ? 'Log anything today to start a new streak.' : 'Nothing logged yet today? One quick log keeps it alive.',
        data: { kind: 'nudge' },
        trigger: { kind: 'date', at },
      });
    }
  }

  dated.sort((a, b) => (a.trigger as { at: number }).at - (b.trigger as { at: number }).at);
  return [...items, ...dated].slice(0, MAX_SCHEDULED);
}
