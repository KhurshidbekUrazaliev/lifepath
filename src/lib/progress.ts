import { Entry, Task } from './types';
import { addDays, dayKey, ONE_DAY } from './dates';

export interface TaskProgress {
  done: number;
  total: number;
  ratio: number; // 0..1
  label: string; // "142 / 307 pages"
  remaining: number;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatAmount(amount: number, unit: string, type: Task['progressType']): string {
  if (type === 'time') {
    if (amount >= 60) {
      const h = Math.floor(amount / 60);
      const m = Math.round(amount % 60);
      return m ? `${h}h ${m}m` : `${h}h`;
    }
    return `${fmt(amount)} min`;
  }
  if (type === 'sessions') return `${fmt(amount)} ${amount === 1 ? 'session' : 'sessions'}`;
  return `${fmt(amount)} ${unit}`;
}

export function taskEntries(entries: Entry[], taskId: string): Entry[] {
  return entries.filter((e) => e.taskId === taskId);
}

export function computeProgress(task: Task, entries: Entry[]): TaskProgress {
  if (task.progressType === 'milestones') {
    const total = task.milestones.length;
    const done = task.milestones.filter((m) => m.done).length;
    const ratio = total === 0 ? 0 : done / total;
    return { done, total, ratio, label: `${done} / ${total} steps`, remaining: total - done };
  }
  const mine = taskEntries(entries, task.id);
  const done = mine.reduce((sum, e) => sum + e.amount, 0);
  const total = Math.max(task.target, 1);
  const ratio = Math.min(done / total, 1);
  const unitLabel =
    task.progressType === 'time' ? 'min' : task.progressType === 'sessions' ? 'sessions' : task.unit;
  return {
    done,
    total,
    ratio,
    label: `${fmt(done)} / ${fmt(total)} ${unitLabel}`,
    remaining: Math.max(total - done, 0),
  };
}

export interface Forecast {
  perDay: number; // average amount per calendar day over the window
  finishAt?: number; // estimated finish date
  onTrack?: boolean; // only when a deadline exists
  neededPerDay?: number; // to hit the deadline
}

/**
 * Pace forecast based on the last `windowDays` days of activity.
 * Not meaningful for milestones.
 */
export function forecast(
  task: Task,
  entries: Entry[],
  now: number = Date.now(),
  windowDays = 14,
): Forecast | null {
  if (task.progressType === 'milestones' || task.completedAt) return null;
  const mine = taskEntries(entries, task.id);
  if (mine.length === 0) return null;
  const { remaining } = computeProgress(task, entries);
  const firstAt = Math.min(...mine.map((e) => e.at));
  // Days of history including today, capped to the window.
  const span = Math.min(windowDays, Math.floor((now - firstAt) / ONE_DAY) + 1);
  const since = now - span * ONE_DAY;
  const recent = mine.filter((e) => e.at >= since).reduce((s, e) => s + e.amount, 0);
  const perDay = recent / span;
  const result: Forecast = { perDay };
  if (perDay > 0) {
    result.finishAt = addDays(now, Math.ceil(remaining / perDay));
  }
  if (task.deadline) {
    const daysLeft = Math.max(1, Math.ceil((task.deadline - now) / ONE_DAY));
    result.neededPerDay = remaining / daysLeft;
    result.onTrack = result.finishAt !== undefined && result.finishAt <= task.deadline;
  }
  return result;
}

/** Average completion ratio of a folder's active (or all) tasks. */
export function folderProgress(tasks: Task[], entries: Entry[]): number {
  if (tasks.length === 0) return 0;
  const sum = tasks.reduce((s, t) => s + computeProgress(t, entries).ratio, 0);
  return sum / tasks.length;
}

export function lastActivity(taskId: string, entries: Entry[]): number | undefined {
  let latest: number | undefined;
  for (const e of entries) {
    if (e.taskId === taskId && (latest === undefined || e.at > latest)) latest = e.at;
  }
  return latest;
}

export function loggedToday(taskId: string, entries: Entry[], now: number = Date.now()): boolean {
  const today = dayKey(now);
  return entries.some((e) => e.taskId === taskId && dayKey(e.at) === today);
}
