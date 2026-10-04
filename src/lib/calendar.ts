import { addDays, dayKey } from './dates';

export interface GridDay {
  key: string; // YYYY-MM-DD
  date: number; // day of month
  inMonth: boolean;
}

/** Calendar grid for a month, Sunday-first, always full weeks. */
export function monthGrid(year: number, month: number): GridDay[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const lastDay = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((first.getDay() + lastDay) / 7) * 7;
  const weeks: GridDay[][] = [];
  for (let i = 0; i < cells; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ key: dayKey(d.getTime()), date: d.getDate(), inMonth: d.getMonth() === month });
  }
  return weeks;
}

/** Local Date for a day key, at the given time. */
export function dayKeyToMs(key: string, hour = 0, minute = 0): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute).getTime();
}

export function parseTime(time?: string): { hour: number; minute: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function toTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "7:30 PM" style label in the device locale. */
export function timeLabel(hour: number, minute: number): string {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon, Wed, Fri" / "Every day" / "Weekdays". Days use 1 = Sunday. */
export function daysLabel(days: number[]): string {
  const set = [...new Set(days)].sort();
  if (set.length === 7) return 'Every day';
  if (set.join() === '2,3,4,5,6') return 'Weekdays';
  if (set.join() === '1,7') return 'Weekends';
  return set.map((d) => WEEKDAY_NAMES[d - 1]).join(', ');
}

export function monthTitle(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/** "Today", "Tomorrow", "Yesterday", or "Wed, Oct 7". */
export function dayChipLabel(key: string, today: string = dayKey()): string {
  const base = dayKeyToMs(today, 12); // noon avoids DST edge cases
  if (key === today) return 'Today';
  if (key === dayKey(addDays(base, 1))) return 'Tomorrow';
  if (key === dayKey(addDays(base, -1))) return 'Yesterday';
  return new Date(dayKeyToMs(key)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
