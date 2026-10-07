// Core data model for Lifepath v0.1 (local-only).

/** How a task measures progress. */
export type ProgressType =
  | 'units' // amount accumulates toward a total (pages, km, chapters)
  | 'time' // minutes accumulate toward a total
  | 'sessions' // each log is one session toward a target count
  | 'milestones'; // checklist of steps

export interface Folder {
  id: string;
  name: string;
  icon: string; // emoji
  color: string; // hex
  templateId: string;
  progressType: ProgressType;
  unit: string; // default unit for new tasks ("pages", "km")
  createdAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  doneAt?: number;
}

export interface Resource {
  id: string;
  title: string;
  url?: string;
}

/** A repeating reminder for a task. */
export interface Reminder {
  hour: number; // 0-23
  minute: number; // 0-59
  days: number[]; // weekdays, 1 = Sunday ... 7 = Saturday
}

export interface Task {
  id: string;
  folderId: string;
  title: string;
  progressType: ProgressType;
  target: number; // ignored for milestones (uses milestone count)
  unit: string;
  deadline?: number; // epoch ms
  milestones: Milestone[];
  resources: Resource[];
  reminder?: Reminder;
  createdAt: number;
  completedAt?: number;
}

/** A session planned for a specific day (and optionally a time). */
export interface Plan {
  id: string;
  taskId: string;
  day: string; // YYYY-MM-DD (local)
  time?: string; // "HH:MM"
  note?: string;
  doneAt?: number;
  createdAt: number;
}

export interface NudgeSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

/** Proof that a log really happened (v0.4). Photos arrive in a later version. */
export interface Evidence {
  summary?: string; // what you did or learned, in your own words
  url?: string; // a link: a workout app, a lesson page, a book page
  photoUri?: string; // photo on this device (it may not exist on your other devices)
  photoPath?: string; // where the uploaded photo lives in cloud storage
  at: number; // when the proof was added
}

/** What the person typed into the proof fields (before it is validated). */
export interface EvidenceInput {
  summary?: string;
  url?: string;
  photoUri?: string;
}

/**
 * quick    = one tap. XP counts, but Sparks stay pending until proof is added (7 days).
 * evidence = proof attached. Bonus XP and the Sparks are released.
 * Entries from before v0.4 have no trust field and keep the Sparks they already earned.
 */
export type Trust = 'quick' | 'evidence';

export interface Entry {
  id: string;
  taskId: string;
  at: number; // epoch ms
  amount: number; // pages / minutes / km; 1 for a session; 0 for milestone ticks
  note?: string;
  xp: number;
  trust?: Trust;
  evidence?: Evidence;
}

export interface Streak {
  current: number;
  best: number;
  lastDay?: string; // YYYY-MM-DD (local)
}

export interface Profile {
  name: string;
  xp: number;
  sparks: number;
  streak: Streak;
  freezes: number;
  dailyGoalXp: number;
  haptics: boolean;
  questDay?: string; // day the daily quest bonus was claimed
  nudge: NudgeSettings; // evening "keep your streak" reminder
  achievements: Record<string, number>; // id -> unlockedAt
}
