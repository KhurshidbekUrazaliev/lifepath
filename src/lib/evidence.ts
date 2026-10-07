// Evidence rules (v0.4). Pure functions, no storage, so they can be unit tested.
//
// Idea: XP and levels stay fun and instant, but Sparks (the spendable currency for Echo's
// wardrobe) are only released once a log has proof. A one-tap "quick" log keeps its Sparks
// pending for 7 days; adding proof inside that window releases them and adds a bonus.
import { Entry, Evidence, EvidenceInput, Trust } from './types';
import { sparksFor } from './gamify';

export const EVIDENCE_WINDOW_DAYS = 7;
export const MIN_SUMMARY_CHARS = 15;
const DAY = 24 * 60 * 60 * 1000;

/** Accepts "https://x.com/a", "x.com/a" (adds https://). Returns undefined if it is not a usable link. */
export function normalizeUrl(raw?: string): string | undefined {
  const v = (raw ?? '').trim();
  if (!v || /\s/.test(v)) return undefined;
  const withScheme = /^https?:\/\//i.test(v) ? v : /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v) ? `https://${v}` : undefined;
  if (!withScheme) return undefined;
  return /^https?:\/\/[^/\s]+\.[^/\s]+/i.test(withScheme) ? withScheme : undefined;
}

/** Valid proof = a real summary (15+ characters) or a usable link. Returns the cleaned proof, or undefined. */
export function cleanEvidence(input?: EvidenceInput, at: number = Date.now()): Evidence | undefined {
  if (!input) return undefined;
  const summary = (input.summary ?? '').trim();
  const url = normalizeUrl(input.url);
  const goodSummary = summary.length >= MIN_SUMMARY_CHARS;
  if (!goodSummary && !url) return undefined;
  return { summary: goodSummary ? summary : undefined, url, at };
}

/** Bonus XP for adding proof: +25% of the log's XP, at least 3. */
export function evidenceBonus(entryXp: number): number {
  return Math.max(3, Math.round(entryXp * 0.25));
}

export type EvidenceState = 'verified' | 'pending' | 'expired' | 'legacy';

export function evidenceState(e: Entry, now: number = Date.now()): EvidenceState {
  if (e.trust === 'evidence') return 'verified';
  if (e.trust === 'quick') return now - e.at <= EVIDENCE_WINDOW_DAYS * DAY ? 'pending' : 'expired';
  return 'legacy';
}

/** Whole days left to add proof to a quick log (0 on the last day). */
export function daysLeftForProof(e: Entry, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((e.at + EVIDENCE_WINDOW_DAYS * DAY - now) / DAY) - 1);
}

/** Sparks this entry has actually paid out so far. */
export function sparksGranted(e: Entry): number {
  return e.trust === 'quick' ? 0 : sparksFor(e.xp);
}

/** Sparks waiting for proof across all entries that can still be verified. */
export function pendingSparks(entries: Entry[], now: number = Date.now()): number {
  return entries.reduce((sum, e) => (evidenceState(e, now) === 'pending' ? sum + sparksFor(e.xp) : sum), 0);
}

/**
 * Sparks to pay out right now for a log.
 * `entryXp` is the XP stored on the entry; `totalXp` also includes bonuses such as finishing a task.
 * A quick log withholds the entry's own Sparks but still pays Sparks for the extra bonuses.
 */
export function sparksForAward(trust: Trust, entryXp: number, totalXp: number): number {
  return trust === 'evidence' ? sparksFor(totalXp) : sparksFor(totalXp - entryXp);
}
