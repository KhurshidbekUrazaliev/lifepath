// Ranking helpers (pure). The scores themselves are computed on the server from synced, proven logs.

export interface RankRow {
  rank: number;
  display_name: string;
  country: string | null;
  city: string | null;
  xp: number;
  is_me: boolean;
}

export interface PublicProfile {
  display_name: string;
  country: string | null;
  city: string | null;
  opted_in: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

/** Start of the ranking week: Monday 00:00 UTC, so everyone's week starts at the same moment. */
export function weekStartMs(now: number = Date.now()): number {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = Sunday
  const sinceMonday = (day + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - sinceMonday * DAY;
}

/** When the current ranking week ends (next Monday 00:00 UTC). */
export function weekEndMs(now: number = Date.now()): number {
  return weekStartMs(now) + 7 * DAY;
}

export function daysLeftInWeek(now: number = Date.now()): number {
  return Math.max(0, Math.ceil((weekEndMs(now) - now) / DAY));
}

/** 🇰🇷 from "KR". */
export function flag(code?: string | null): string {
  if (!code || code.length !== 2) return '🌍';
  const base = 0x1f1e6;
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => base + c.charCodeAt(0) - 65));
}

export const COUNTRIES: { code: string; name: string }[] = [
  ['AR', 'Argentina'], ['AU', 'Australia'], ['AT', 'Austria'], ['BD', 'Bangladesh'], ['BE', 'Belgium'], ['BR', 'Brazil'],
  ['CA', 'Canada'], ['CL', 'Chile'], ['CN', 'China'], ['CO', 'Colombia'], ['CZ', 'Czechia'], ['DK', 'Denmark'],
  ['EG', 'Egypt'], ['FI', 'Finland'], ['FR', 'France'], ['DE', 'Germany'], ['GR', 'Greece'], ['HK', 'Hong Kong'],
  ['HU', 'Hungary'], ['IN', 'India'], ['ID', 'Indonesia'], ['IE', 'Ireland'], ['IL', 'Israel'], ['IT', 'Italy'],
  ['JP', 'Japan'], ['KZ', 'Kazakhstan'], ['KE', 'Kenya'], ['KR', 'South Korea'], ['KG', 'Kyrgyzstan'], ['MY', 'Malaysia'],
  ['MX', 'Mexico'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NG', 'Nigeria'], ['NO', 'Norway'], ['PK', 'Pakistan'],
  ['PE', 'Peru'], ['PH', 'Philippines'], ['PL', 'Poland'], ['PT', 'Portugal'], ['RO', 'Romania'], ['SA', 'Saudi Arabia'],
  ['SG', 'Singapore'], ['ZA', 'South Africa'], ['ES', 'Spain'], ['SE', 'Sweden'], ['CH', 'Switzerland'], ['TW', 'Taiwan'],
  ['TH', 'Thailand'], ['TR', 'Türkiye'], ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'],
  ['US', 'United States'], ['UZ', 'Uzbekistan'], ['VN', 'Vietnam'],
].map(([code, name]) => ({ code, name }));

export const countryName = (code?: string | null): string => COUNTRIES.find((c) => c.code === code)?.name ?? '';

/** A display name others will see: trimmed, 1 to 24 characters. */
export function cleanDisplayName(raw: string): string | undefined {
  const v = raw.replace(/\s+/g, ' ').trim().slice(0, 24);
  return v.length >= 1 ? v : undefined;
}

export function rankMedal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
}
