import { Entry, Profile, Streak, Task } from './types';
import { dayKey, daysBetween } from './dates';

// ---------- XP ----------

export const XP = {
  baseLog: 10,
  milestone: 15,
  taskComplete: 50,
  dailyQuest: 15,
  maxAmountBonus: 10,
} as const;

/** Streak multiplier: +10% per full week of streak, capped at +50%. */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.floor(streak / 7) * 0.1, 0.5);
}

/** XP for logging progress. Rewards showing up more than volume. */
export function xpForLog(task: Task, amount: number, streak: number): number {
  let bonus = 0;
  if (task.progressType === 'units' && task.target > 0) {
    // Up to +10 XP for logging a meaningful chunk (10% of the total).
    bonus = Math.min(XP.maxAmountBonus, Math.round((amount / task.target) * 100));
  } else if (task.progressType === 'time') {
    bonus = Math.min(XP.maxAmountBonus, Math.floor(amount / 6)); // 60 min = +10
  } else if (task.progressType === 'sessions') {
    bonus = 5;
  }
  return Math.round((XP.baseLog + bonus) * streakMultiplier(streak));
}

/** Sparks (spendable currency for the future shop): 1 per 10 XP earned. */
export function sparksFor(xp: number): number {
  return Math.floor(xp / 10);
}

// ---------- Levels ----------

/** Cumulative XP needed to reach a level. L1 = 0, L2 = 100, L3 = 300, L4 = 600 ... */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level;
}

export function levelInfo(xp: number): { level: number; into: number; needed: number; ratio: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, into: xp - start, needed: next - start, ratio: (xp - start) / (next - start) };
}

// ---------- Streaks ----------

export interface StreakUpdate {
  streak: Streak;
  freezes: number;
  usedFreeze: boolean;
  earnedFreeze: boolean;
  increased: boolean;
}

export const MAX_FREEZES = 2;

/** Apply an activity on `today` to the streak. Forgiving: a freeze covers one missed day. */
export function applyActivity(streak: Streak, freezes: number, today: string = dayKey()): StreakUpdate {
  const base = { freezes, usedFreeze: false, earnedFreeze: false, increased: false };
  if (streak.lastDay === today) return { ...base, streak };

  let current = 1;
  let usedFreeze = false;
  if (streak.lastDay) {
    const gap = daysBetween(streak.lastDay, today);
    if (gap === 1) current = streak.current + 1;
    else if (gap === 2 && freezes > 0) {
      current = streak.current + 1;
      usedFreeze = true;
      freezes -= 1;
    }
  }
  let earnedFreeze = false;
  if (current > 0 && current % 7 === 0 && freezes < MAX_FREEZES) {
    freezes += 1;
    earnedFreeze = true;
  }
  return {
    streak: { current, best: Math.max(streak.best, current), lastDay: today },
    freezes,
    usedFreeze,
    earnedFreeze,
    increased: true,
  };
}

/** The streak to display right now (it lapses if a day was missed and no freeze can cover it). */
export function visibleStreak(streak: Streak, freezes: number, today: string = dayKey()): number {
  if (!streak.lastDay) return 0;
  const gap = daysBetween(streak.lastDay, today);
  if (gap <= 1) return streak.current;
  if (gap === 2 && freezes > 0) return streak.current; // still savable today
  return 0;
}

export function xpToday(entries: Entry[], today: string = dayKey()): number {
  return entries.filter((e) => dayKey(e.at) === today).reduce((s, e) => s + e.xp, 0);
}

// ---------- Achievements ----------

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-log', title: 'First step', description: 'Log progress for the first time', icon: '👣' },
  { id: 'ten-logs', title: 'Warming up', description: 'Log progress 10 times', icon: '🔥' },
  { id: 'fifty-logs', title: 'Habit forming', description: 'Log progress 50 times', icon: '🧱' },
  { id: 'first-complete', title: 'Finisher', description: 'Complete your first task', icon: '🏁' },
  { id: 'five-complete', title: 'Closer', description: 'Complete 5 tasks', icon: '🏆' },
  { id: 'streak-3', title: 'Three in a row', description: 'Reach a 3-day streak', icon: '✨' },
  { id: 'streak-7', title: 'Full week', description: 'Reach a 7-day streak', icon: '🌙' },
  { id: 'streak-30', title: 'Unstoppable', description: 'Reach a 30-day streak', icon: '☄️' },
  { id: 'three-folders', title: 'Many paths', description: 'Create 3 folders', icon: '🗂️' },
  { id: 'level-5', title: 'Rising', description: 'Reach level 5', icon: '⭐' },
];

export function earnedAchievements(
  profile: Profile,
  tasks: Task[],
  entries: Entry[],
  folderCount: number,
): string[] {
  const logs = entries.length;
  const completed = tasks.filter((t) => t.completedAt).length;
  const best = profile.streak.best;
  const level = levelInfo(profile.xp).level;
  const checks: Record<string, boolean> = {
    'first-log': logs >= 1,
    'ten-logs': logs >= 10,
    'fifty-logs': logs >= 50,
    'first-complete': completed >= 1,
    'five-complete': completed >= 5,
    'streak-3': best >= 3,
    'streak-7': best >= 7,
    'streak-30': best >= 30,
    'three-folders': folderCount >= 3,
    'level-5': level >= 5,
  };
  return Object.keys(checks).filter((id) => checks[id]);
}
