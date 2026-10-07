// Smart planner (pure). Spreads the work still left on a task over upcoming days.
// It is the offline fallback for the AI planner and also checks whatever the AI server returns.
import { Entry, Task } from './types';
import { addDays, dayKey } from './dates';
import { dayKeyToMs, parseTime } from './calendar';
import { computeProgress, formatAmount, taskEntries } from './progress';

export interface PlanPrefs {
  daysPerWeek: number; // 1..7
  time?: string; // "HH:MM" for every session, or none
  horizonDays: number; // how far ahead to plan (7..60)
}

export interface Suggestion {
  day: string; // YYYY-MM-DD (local)
  time?: string;
  note: string;
}

export const MAX_SUGGESTIONS = 40;

/** Weekdays (0 = Sunday) used for each sessions-per-week choice, spaced out so rest days fall between. */
const PATTERNS: Record<number, number[]> = {
  1: [3],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function suggestPlan(task: Task, entries: Entry[], prefs: PlanPrefs, now: number = Date.now()): Suggestion[] {
  if (task.completedAt) return [];
  const progress = computeProgress(task, entries);
  if (progress.remaining <= 0) return [];

  const horizon = Math.min(60, Math.max(7, Math.round(prefs.horizonDays)));
  const lastMs = task.deadline ? Math.min(task.deadline, addDays(now, horizon)) : addDays(now, horizon);
  const pattern = PATTERNS[Math.min(7, Math.max(1, Math.round(prefs.daysPerWeek)))];
  const time = parseTime(prefs.time) ? prefs.time : undefined;

  // Candidate days: tomorrow onward, on the chosen weekdays, up to the end of the window.
  const days: string[] = [];
  for (let ms = addDays(now, 1); dayKey(ms) <= dayKey(lastMs) && days.length < MAX_SUGGESTIONS; ms = addDays(ms, 1)) {
    if (pattern.includes(new Date(ms).getDay())) days.push(dayKey(ms));
  }
  if (days.length === 0) return [];

  const done = progress.done;

  if (task.progressType === 'milestones') {
    const pending = task.milestones.filter((m) => !m.done);
    const count = Math.min(days.length, pending.length);
    return days.slice(0, count).map((day, i) => {
      // Give each session an even share of the remaining milestones; the last sessions may carry two.
      const from = Math.floor((i * pending.length) / count);
      const to = Math.max(from + 1, Math.floor(((i + 1) * pending.length) / count));
      const titles = pending.slice(from, to).map((m) => m.title).join(' + ');
      return { day, time, note: `Milestone: ${titles}` };
    });
  }

  if (task.progressType === 'sessions') {
    const count = Math.min(days.length, Math.ceil(progress.remaining));
    return days.slice(0, count).map((day, i) => ({ day, time, note: `Session ${Math.floor(done) + i + 1} of ${progress.total}` }));
  }

  // units / time: size each session so the work fits before the deadline, or use your own pace.
  let per: number;
  if (task.deadline) {
    per = Math.ceil(progress.remaining / days.length);
  } else {
    const recent = taskEntries(entries, task.id).filter((e) => e.amount > 0 && now - e.at <= 14 * 86400000);
    const avg = recent.length ? recent.reduce((s, e) => s + e.amount, 0) / recent.length : 0;
    per = Math.max(1, Math.round(avg) || Math.ceil(task.target * 0.05));
  }
  per = Math.max(1, Math.min(per, Math.ceil(progress.remaining)));
  const count = Math.min(days.length, Math.ceil(progress.remaining / per));
  return days.slice(0, count).map((day, i) => {
    const left = progress.remaining - per * i;
    const amount = Math.min(per, Math.ceil(left));
    return { day, time, note: `Aim for ${formatAmount(amount, task.unit, task.progressType)}` };
  });
}

/**
 * Cleans a plan that came from outside (the AI server): valid dates inside the window,
 * valid times, short notes, no duplicates, at most MAX_SUGGESTIONS.
 */
export function sanitizePlan(raw: unknown, now: number = Date.now(), horizonDays = 60): Suggestion[] {
  if (!Array.isArray(raw)) return [];
  const first = dayKey(addDays(now, 1));
  const last = dayKey(addDays(now, horizonDays));
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const day = String((item as any).day ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < first || day > last) continue;
    if (Number.isNaN(dayKeyToMs(day))) continue;
    if (seen.has(day)) continue;
    seen.add(day);
    const t = String((item as any).time ?? '');
    const note = String((item as any).note ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
    out.push({ day, time: parseTime(t) ? t : undefined, note: note || 'Planned session' });
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}
