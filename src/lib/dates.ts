const DAY = 24 * 60 * 60 * 1000;

/** Local calendar day key, e.g. "2026-10-05". */
export function dayKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole calendar days from day key a to day key b (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ua = Date.UTC(ay, am - 1, ad);
  const ub = Date.UTC(by, bm - 1, bd);
  return Math.round((ub - ua) / DAY);
}

export function addDays(ms: number, days: number): number {
  return ms + days * DAY;
}

export function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatRelative(ms: number, now: number = Date.now()): string {
  const diff = daysBetween(dayKey(ms), dayKey(now));
  if (diff === 0) {
    return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return formatShortDate(ms);
}

export function greeting(now: number = Date.now()): string {
  const h = new Date(now).getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export const ONE_DAY = DAY;
