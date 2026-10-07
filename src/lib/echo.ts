// Echo Lite: the companion's growth rules. Pure functions, no storage, so they can be unit tested.
//
// Echo grows from real effort. Every log adds "effort points" to the attribute that matches its folder.
// Proven logs (and logs from before v0.4) count in full; one-tap logs count 40%, so proof matters.
// Nothing here ever goes down: no punishment, Echo just rests when you do.
import { Entry, Folder, Task } from './types';

export type AttrId = 'wisdom' | 'strength' | 'voice' | 'craft' | 'fortune' | 'spirit';

export interface AttrInfo {
  id: AttrId;
  name: string;
  icon: string;
  color: string;
  archetype: string;
  blurb: string;
}

export const ATTRIBUTES: AttrInfo[] = [
  { id: 'wisdom', name: 'Wisdom', icon: '📖', color: '#6C63FF', archetype: 'Scholar', blurb: 'Reading and studying' },
  { id: 'strength', name: 'Strength', icon: '💪', color: '#FF6B5B', archetype: 'Warrior', blurb: 'Gym and running' },
  { id: 'voice', name: 'Voice', icon: '🗣️', color: '#14B8A6', archetype: 'Bard', blurb: 'Languages and speaking' },
  { id: 'craft', name: 'Craft', icon: '🎨', color: '#EC4899', archetype: 'Artisan', blurb: 'Creative practice' },
  { id: 'fortune', name: 'Fortune', icon: '🍀', color: '#F59E0B', archetype: 'Merchant', blurb: 'Money and career' },
  { id: 'spirit', name: 'Spirit', icon: '🌙', color: '#A855F7', archetype: 'Mystic', blurb: 'Wellness and calm' },
];

/** Which attribute each folder template feeds. Templates not listed (custom) feed all six equally. */
const TEMPLATE_ATTR: Record<string, AttrId> = {
  reading: 'wisdom',
  study: 'wisdom',
  gym: 'strength',
  running: 'strength',
  languages: 'voice',
  creative: 'craft',
  money: 'fortune',
  wellness: 'spirit',
};

export const QUICK_WEIGHT = 0.4;

/** Effort points one log is worth. */
export function effortPoints(e: Entry): number {
  return e.trust === 'quick' ? e.xp * QUICK_WEIGHT : e.xp;
}

export type AttrPoints = Record<AttrId, number>;

const emptyPoints = (): AttrPoints => ({ wisdom: 0, strength: 0, voice: 0, craft: 0, fortune: 0, spirit: 0 });

export function computeAttributes(entries: Entry[], tasks: Task[], folders: Folder[]): AttrPoints {
  const folderOfTask = new Map<string, Folder>();
  const folderById = new Map(folders.map((f) => [f.id, f]));
  for (const t of tasks) {
    const f = folderById.get(t.folderId);
    if (f) folderOfTask.set(t.id, f);
  }
  const pts = emptyPoints();
  for (const e of entries) {
    const folder = folderOfTask.get(e.taskId);
    if (!folder) continue;
    const value = effortPoints(e);
    const attr = TEMPLATE_ATTR[folder.templateId];
    if (attr) pts[attr] += value;
    else for (const a of ATTRIBUTES) pts[a.id] += value / ATTRIBUTES.length;
  }
  for (const a of ATTRIBUTES) pts[a.id] = Math.floor(pts[a.id]);
  return pts;
}

export function totalPoints(p: AttrPoints): number {
  return ATTRIBUTES.reduce((s, a) => s + p[a.id], 0);
}

// ---------- Attribute levels ----------

/** Points needed to reach an attribute level: L1 = 0, L2 = 25, L3 = 100, L4 = 225 ... */
export function pointsForAttrLevel(level: number): number {
  return 25 * (level - 1) * (level - 1);
}

export function attrLevel(points: number): { level: number; into: number; needed: number; ratio: number } {
  let level = 1;
  while (points >= pointsForAttrLevel(level + 1)) level++;
  const start = pointsForAttrLevel(level);
  const next = pointsForAttrLevel(level + 1);
  return { level, into: points - start, needed: next - start, ratio: (points - start) / (next - start) };
}

// ---------- Stages ----------

export const STAGES = [
  { name: 'Spark', from: 0 },
  { name: 'Sprout', from: 150 },
  { name: 'Wanderer', from: 600 },
  { name: 'Adept', from: 1800 },
  { name: 'Luminary', from: 4500 },
  { name: 'Legend', from: 10000 },
] as const;

export interface StageInfo {
  index: number;
  name: string;
  next?: string;
  ratio: number; // progress to the next stage (1 at the last stage)
  toNext: number; // points left (0 at the last stage)
}

export function stageFor(total: number): StageInfo {
  let index = 0;
  while (index + 1 < STAGES.length && total >= STAGES[index + 1].from) index++;
  const last = index === STAGES.length - 1;
  const start = STAGES[index].from;
  const end = last ? start : STAGES[index + 1].from;
  return {
    index,
    name: STAGES[index].name,
    next: last ? undefined : STAGES[index + 1].name,
    ratio: last ? 1 : (total - start) / (end - start),
    toNext: last ? 0 : end - total,
  };
}

/** The attribute Echo leans toward, or undefined while nothing has been logged. */
export function dominantAttr(p: AttrPoints): AttrInfo | undefined {
  let best: AttrInfo | undefined;
  for (const a of ATTRIBUTES) if (p[a.id] > 0 && (!best || p[a.id] > p[best.id])) best = a;
  return best;
}

export function archetypeFor(p: AttrPoints): string {
  const top = dominantAttr(p);
  if (!top) return 'Newcomer';
  const total = totalPoints(p);
  // No single path stands out: a generalist.
  if (total >= 150 && p[top.id] < total * 0.3) return 'Wayfarer';
  return top.archetype;
}

// ---------- Mood ----------

export type Mood = 'radiant' | 'content' | 'resting';

export function echoMood(loggedToday: boolean, streak: number): Mood {
  if (loggedToday) return 'radiant';
  return streak > 0 ? 'content' : 'resting';
}

const LINES: Record<Mood, string[]> = {
  radiant: ['That felt good. Thank you.', 'I can feel us growing.', 'Look at us go!', 'Today counts. I am glad you came.'],
  content: ['Whenever you are ready, I am here.', 'A small step today keeps the glow.', 'Ready when you are.', 'No rush. I am here.'],
  resting: ['I have been resting. Want to wake me up?', 'It is quiet here. One small log would be lovely.', 'Fresh start? I am with you.', 'No pressure. I am just glad you are back.'],
};

/** A line that stays the same for the whole day (so it does not flicker on every screen visit). */
export function echoLine(mood: Mood, dayKeyValue: string): string {
  const lines = LINES[mood];
  let h = 0;
  for (const ch of dayKeyValue) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return lines[h % lines.length];
}

// ---------- Looks ----------

export const SKIN_TONES = ['#FBE0CC', '#F2C9A6', '#D9A47A', '#B67B54', '#8C5A3C', '#6B422C'];
export const HAIR_COLORS = ['#2B2437', '#5A3A28', '#C48A3A', '#D95F76', '#4F7BE0', '#8E5CE0'];

export function ageInDays(bornAt: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - bornAt) / 86400000));
}
