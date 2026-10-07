import { supabase } from './supabase';
import { Entry, Plan, Task } from './lib/types';
import { dayKey } from './lib/dates';
import { computeProgress, taskEntries } from './lib/progress';
import { PlanPrefs, Suggestion, sanitizePlan, suggestPlan } from './lib/planner';

export interface PlanResult {
  source: 'ai' | 'smart';
  suggestions: Suggestion[];
  /** Why the AI was not used, when it was not (shown quietly under the plan). */
  fallbackReason?: string;
}

const REASONS: Record<string, string> = {
  plus_required: 'AI planning is part of Plus.',
  daily_limit: 'You have used today\'s AI plans. This one was made on your phone.',
  not_configured: 'The AI planner is not switched on yet. This plan was made on your phone.',
  unauthorized: 'Sign in to use the AI planner. This plan was made on your phone.',
};

/** Asks the AI planner for a schedule; falls back to the on-device smart planner when it cannot. */
export async function requestPlan(
  task: Task,
  entries: Entry[],
  plans: Plan[],
  prefs: PlanPrefs,
  signedIn: boolean,
  now: number = Date.now(),
): Promise<PlanResult> {
  const taken = new Set(plans.filter((p) => p.taskId === task.id).map((p) => p.day));
  const withoutTaken = (list: Suggestion[]) => list.filter((s) => !taken.has(s.day));
  const local = () => withoutTaken(suggestPlan(task, entries, prefs, now));

  if (!signedIn) return { source: 'smart', suggestions: local(), fallbackReason: REASONS.unauthorized };

  const progress = computeProgress(task, entries);
  const recent = taskEntries(entries, task.id)
    .sort((a, b) => b.at - a.at)
    .slice(0, 8)
    .map((e) => ({ day: dayKey(e.at), amount: e.amount, note: e.note?.slice(0, 80) }));

  try {
    const { data, error } = await supabase.functions.invoke('plan', {
      body: {
        today: dayKey(now),
        task: {
          title: task.title,
          type: task.progressType,
          unit: task.unit,
          target: task.target,
          done: progress.done,
          remaining: progress.remaining,
          deadline: task.deadline ? dayKey(task.deadline) : null,
          pendingMilestones: task.milestones.filter((m) => !m.done).map((m) => m.title).slice(0, 20),
        },
        prefs: { daysPerWeek: prefs.daysPerWeek, time: prefs.time ?? null, windowDays: prefs.horizonDays },
        recent,
        alreadyPlannedDays: [...taken],
      },
    });
    if (error) throw error;
    const clean = withoutTaken(sanitizePlan(data?.sessions, now, prefs.horizonDays));
    if (clean.length > 0) return { source: 'ai', suggestions: clean };
    return { source: 'smart', suggestions: local(), fallbackReason: 'The AI did not return a usable plan. This one was made on your phone.' };
  } catch (e: any) {
    // Edge function errors carry a JSON body such as {"error":"plus_required"}.
    let code = '';
    try {
      const body = await e?.context?.json?.();
      code = String(body?.error ?? '');
    } catch {
      // not JSON
    }
    return {
      source: 'smart',
      suggestions: local(),
      fallbackReason: REASONS[code] ?? "Couldn't reach the AI planner. This plan was made on your phone.",
    };
  }
}
