import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, Folder, Milestone, Profile, ProgressType, Resource, Task } from './lib/types';
import { dayKey, addDays } from './lib/dates';
import { computeProgress, loggedToday } from './lib/progress';
import {
  ACHIEVEMENTS, XP, applyActivity, earnedAchievements, levelInfo, sparksFor, streakMultiplier, visibleStreak, xpForLog,
} from './lib/gamify';
import { templateById } from './lib/templates';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface Celebration {
  id: string;
  kind: 'complete' | 'levelup' | 'achievement' | 'xp';
  title: string;
  subtitle?: string;
  icon?: string;
  xp?: number;
}

export interface LogResult {
  xp: number;
  completed: boolean;
  levelUp?: number;
  streakIncreased: boolean;
  questBonus: boolean;
}

export interface NewFolderInput {
  name: string;
  icon: string;
  color: string;
  templateId: string;
  progressType: ProgressType;
  unit: string;
}

export interface NewTaskInput {
  folderId: string;
  title: string;
  progressType: ProgressType;
  target: number;
  unit: string;
  deadline?: number;
  milestones: string[];
  resources: { title: string; url?: string }[];
}

interface State {
  folders: Folder[];
  tasks: Task[];
  entries: Entry[];
  profile: Profile;
  celebrations: Celebration[]; // transient queue, not persisted

  createFolder: (input: NewFolderInput) => string;
  updateFolder: (id: string, patch: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;

  createTask: (input: NewTaskInput) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string) => void;
  reopenTask: (id: string) => void;

  logProgress: (taskId: string, amount: number, note?: string) => LogResult | null;
  deleteEntry: (entryId: string) => void;
  toggleMilestone: (taskId: string, milestoneId: string) => void;
  addMilestone: (taskId: string, title: string) => void;
  removeMilestone: (taskId: string, milestoneId: string) => void;
  addResource: (taskId: string, title: string, url?: string) => void;
  removeResource: (taskId: string, resourceId: string) => void;

  setName: (name: string) => void;
  setDailyGoal: (xp: number) => void;
  toggleHaptics: () => void;
  dismissCelebration: (id: string) => void;
  seedExamples: () => void;
  resetAll: () => void;
}

const initialProfile: Profile = {
  name: '',
  xp: 0,
  sparks: 0,
  streak: { current: 0, best: 0 },
  freezes: 0,
  dailyGoalXp: 30,
  haptics: true,
  achievements: {},
};

/**
 * Applies earned XP to the profile, detects level-ups and new achievements,
 * and returns the pieces of state to merge plus celebrations to queue.
 */
function award(
  s: Pick<State, 'profile' | 'tasks' | 'entries' | 'folders'>,
  xp: number,
  profilePatch: Partial<Profile> = {},
): { profile: Profile; celebrations: Celebration[]; levelUp?: number } {
  const before = levelInfo(s.profile.xp).level;
  const profile: Profile = {
    ...s.profile,
    ...profilePatch,
    xp: s.profile.xp + xp,
    sparks: s.profile.sparks + sparksFor(xp),
  };
  const celebrations: Celebration[] = [];
  const after = levelInfo(profile.xp).level;
  let levelUp: number | undefined;
  if (after > before) {
    levelUp = after;
    celebrations.push({ id: uid(), kind: 'levelup', title: `Level ${after}`, subtitle: 'You leveled up!', icon: '⭐' });
  }
  const earned = earnedAchievements(profile, s.tasks, s.entries, s.folders.length);
  const achievements = { ...profile.achievements };
  for (const id of earned) {
    if (!achievements[id]) {
      achievements[id] = Date.now();
      const a = ACHIEVEMENTS.find((x) => x.id === id)!;
      celebrations.push({ id: uid(), kind: 'achievement', title: a.title, subtitle: a.description, icon: a.icon });
    }
  }
  profile.achievements = achievements;
  return { profile, celebrations, levelUp };
}

function mapTask(tasks: Task[], id: string, fn: (t: Task) => Task): Task[] {
  return tasks.map((t) => (t.id === id ? fn(t) : t));
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      folders: [],
      tasks: [],
      entries: [],
      profile: initialProfile,
      celebrations: [],

      createFolder: (input) => {
        const id = uid();
        set((s) => {
          const folders = [...s.folders, { ...input, id, createdAt: Date.now() }];
          const { profile, celebrations } = award({ ...s, folders }, 0);
          return { folders, profile, celebrations: [...s.celebrations, ...celebrations] };
        });
        return id;
      },

      updateFolder: (id, patch) =>
        set((s) => ({ folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),

      deleteFolder: (id) =>
        set((s) => {
          const taskIds = new Set(s.tasks.filter((t) => t.folderId === id).map((t) => t.id));
          return {
            folders: s.folders.filter((f) => f.id !== id),
            tasks: s.tasks.filter((t) => t.folderId !== id),
            entries: s.entries.filter((e) => !taskIds.has(e.taskId)),
          };
        }),

      createTask: (input) => {
        const id = uid();
        const task: Task = {
          id,
          folderId: input.folderId,
          title: input.title.trim(),
          progressType: input.progressType,
          target: input.target,
          unit: input.unit,
          deadline: input.deadline,
          milestones: input.milestones.filter((m) => m.trim()).map((title) => ({ id: uid(), title: title.trim(), done: false })),
          resources: input.resources.filter((r) => r.title.trim()).map((r) => ({ id: uid(), title: r.title.trim(), url: r.url?.trim() || undefined })),
          createdAt: Date.now(),
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return id;
      },

      updateTask: (id, patch) => set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, ...patch })) })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), entries: s.entries.filter((e) => e.taskId !== id) })),

      completeTask: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task || task.completedAt) return {};
          const tasks = mapTask(s.tasks, id, (t) => ({ ...t, completedAt: Date.now() }));
          const { profile, celebrations } = award({ ...s, tasks }, XP.taskComplete);
          return {
            tasks,
            profile,
            celebrations: [
              ...s.celebrations,
              { id: uid(), kind: 'complete', title: task.title, subtitle: 'Completed!', icon: '🏁', xp: XP.taskComplete },
              ...celebrations,
            ],
          };
        }),

      reopenTask: (id) => set((s) => ({ tasks: mapTask(s.tasks, id, (t) => ({ ...t, completedAt: undefined })) })),

      logProgress: (taskId, amount, note) => {
        const s = get();
        const task = s.tasks.find((t) => t.id === taskId);
        if (!task || amount <= 0) return null;

        const today = dayKey();
        const st = applyActivity(s.profile.streak, s.profile.freezes, today);
        let xp = xpForLog(task, amount, st.streak.current);

        // Daily quest: first log of the day on a task you haven't touched today.
        let questBonus = false;
        if (s.profile.questDay !== today && !loggedToday(taskId, s.entries)) {
          questBonus = true;
          xp += XP.dailyQuest;
        }

        const entry: Entry = { id: uid(), taskId, at: Date.now(), amount, note: note?.trim() || undefined, xp };
        const entries = [...s.entries, entry];

        // Auto-complete when the target is reached.
        let tasks = s.tasks;
        let completed = false;
        if (!task.completedAt && computeProgress(task, entries).ratio >= 1) {
          completed = true;
          xp += XP.taskComplete;
          tasks = mapTask(tasks, taskId, (t) => ({ ...t, completedAt: Date.now() }));
        }

        const { profile, celebrations, levelUp } = award({ ...s, tasks, entries }, xp, {
          streak: st.streak,
          freezes: st.freezes,
          questDay: questBonus ? today : s.profile.questDay,
        });

        const queue: Celebration[] = [{ id: uid(), kind: 'xp', title: `+${xp} XP`, xp }];
        if (completed) {
          queue.push({ id: uid(), kind: 'complete', title: task.title, subtitle: 'Completed!', icon: '🏁', xp: XP.taskComplete });
        }
        set({ entries, tasks, profile, celebrations: [...s.celebrations, ...queue, ...celebrations] });
        return { xp, completed, levelUp, streakIncreased: st.increased, questBonus };
      },

      deleteEntry: (entryId) =>
        set((s) => {
          const entry = s.entries.find((e) => e.id === entryId);
          if (!entry) return {};
          return {
            entries: s.entries.filter((e) => e.id !== entryId),
            profile: {
              ...s.profile,
              xp: Math.max(0, s.profile.xp - entry.xp),
              sparks: Math.max(0, s.profile.sparks - sparksFor(entry.xp)),
            },
          };
        }),

      toggleMilestone: (taskId, milestoneId) => {
        const s = get();
        const task = s.tasks.find((t) => t.id === taskId);
        const ms = task?.milestones.find((m) => m.id === milestoneId);
        if (!task || !ms) return;

        const nowDone = !ms.done;
        const milestones: Milestone[] = task.milestones.map((m) =>
          m.id === milestoneId ? { ...m, done: nowDone, doneAt: nowDone ? Date.now() : undefined } : m,
        );
        let tasks = mapTask(s.tasks, taskId, (t) => ({ ...t, milestones }));
        if (!nowDone) {
          set({ tasks: mapTask(tasks, taskId, (t) => ({ ...t, completedAt: undefined })) });
          return;
        }

        // Ticking a milestone counts as activity and earns XP.
        const today = dayKey();
        const st = applyActivity(s.profile.streak, s.profile.freezes, today);
        let xp = Math.round(XP.milestone * streakMultiplier(st.streak.current));
        const entry: Entry = { id: uid(), taskId, at: Date.now(), amount: 0, note: `✓ ${ms.title}`, xp };
        const entries = [...s.entries, entry];

        let completed = false;
        const updated = tasks.find((t) => t.id === taskId)!;
        if (!updated.completedAt && milestones.length > 0 && milestones.every((m) => m.done)) {
          completed = true;
          xp += XP.taskComplete;
          tasks = mapTask(tasks, taskId, (t) => ({ ...t, completedAt: Date.now() }));
        }
        const { profile, celebrations } = award({ ...s, tasks, entries }, xp, { streak: st.streak, freezes: st.freezes });
        const queue: Celebration[] = [{ id: uid(), kind: 'xp', title: `+${xp} XP`, xp }];
        if (completed) queue.push({ id: uid(), kind: 'complete', title: task.title, subtitle: 'Completed!', icon: '🏁' });
        set({ tasks, entries, profile, celebrations: [...s.celebrations, ...queue, ...celebrations] });
      },

      addMilestone: (taskId, title) =>
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({
            ...t,
            completedAt: undefined,
            milestones: [...t.milestones, { id: uid(), title: title.trim(), done: false }],
          })),
        })),

      removeMilestone: (taskId, milestoneId) =>
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({ ...t, milestones: t.milestones.filter((m) => m.id !== milestoneId) })),
        })),

      addResource: (taskId, title, url) =>
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({
            ...t,
            resources: [...t.resources, { id: uid(), title: title.trim(), url: url?.trim() || undefined } as Resource],
          })),
        })),

      removeResource: (taskId, resourceId) =>
        set((s) => ({
          tasks: mapTask(s.tasks, taskId, (t) => ({ ...t, resources: t.resources.filter((r) => r.id !== resourceId) })),
        })),

      setName: (name) => set((s) => ({ profile: { ...s.profile, name } })),
      setDailyGoal: (xp) => set((s) => ({ profile: { ...s.profile, dailyGoalXp: xp } })),
      toggleHaptics: () => set((s) => ({ profile: { ...s.profile, haptics: !s.profile.haptics } })),
      dismissCelebration: (id) => set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),

      seedExamples: () => {
        const now = Date.now();
        const mk = (templateId: string): Folder => {
          const t = templateById(templateId);
          return {
            id: uid(), name: t.name, icon: t.icon, color: t.color, templateId: t.id,
            progressType: t.progressType, unit: t.unit, createdAt: now,
          };
        };
        const reading = mk('reading');
        const gym = mk('gym');
        const lang = mk('languages');
        const tasks: Task[] = [
          {
            id: uid(), folderId: reading.id, title: 'Sherlock Holmes', progressType: 'units', target: 307, unit: 'pages',
            deadline: addDays(now, 30), milestones: [], resources: [], createdAt: now,
          },
          {
            id: uid(), folderId: reading.id, title: 'Atomic Habits', progressType: 'units', target: 320, unit: 'pages',
            milestones: [], resources: [], createdAt: now,
          },
          {
            id: uid(), folderId: gym.id, title: 'Shoulders', progressType: 'sessions', target: 12, unit: 'sessions',
            milestones: [], resources: [], createdAt: now,
          },
          {
            id: uid(), folderId: gym.id, title: 'Back', progressType: 'sessions', target: 12, unit: 'sessions',
            milestones: [], resources: [], createdAt: now,
          },
          {
            id: uid(), folderId: lang.id, title: 'Spanish B1', progressType: 'milestones', target: 0, unit: 'steps',
            deadline: addDays(now, 150), createdAt: now,
            milestones: ['Finish A1 grammar', 'Learn 500 words', 'Finish A2 textbook', 'Watch a series without subtitles', 'Pass a B1 mock exam']
              .map((title) => ({ id: uid(), title, done: false })),
            resources: [
              { id: uid(), title: 'Language Transfer (audio course)', url: 'https://www.languagetransfer.org' },
              { id: uid(), title: 'Textbook: Aula Internacional 2' },
              { id: uid(), title: 'Dreaming Spanish (YouTube)', url: 'https://www.youtube.com/@DreamingSpanish' },
            ],
          },
        ];
        set((s) => ({ folders: [...s.folders, reading, gym, lang], tasks: [...s.tasks, ...tasks] }));
      },

      resetAll: () => set({ folders: [], tasks: [], entries: [], profile: initialProfile, celebrations: [] }),
    }),
    {
      name: 'lifepath-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ folders: s.folders, tasks: s.tasks, entries: s.entries, profile: s.profile }),
    },
  ),
);

/** Streak value to show right now. */
export function useVisibleStreak(): number {
  const streak = useStore((s) => s.profile.streak);
  const freezes = useStore((s) => s.profile.freezes);
  return visibleStreak(streak, freezes);
}
