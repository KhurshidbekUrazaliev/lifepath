import { useMemo } from 'react';
import { useStore, useVisibleStreak } from './store';
import { dayKey } from './lib/dates';
import {
  ATTRIBUTES, archetypeFor, computeAttributes, dominantAttr, echoLine, echoMood, stageFor, totalPoints,
} from './lib/echo';

/** Everything the UI needs to know about Echo right now, derived from your logs. */
export function useEcho() {
  const profile = useStore((s) => s.profile);
  const entries = useStore((s) => s.entries);
  const tasks = useStore((s) => s.tasks);
  const folders = useStore((s) => s.folders);
  const streak = useVisibleStreak();
  const today = dayKey();

  return useMemo(() => {
    const points = computeAttributes(entries, tasks, folders);
    const total = totalPoints(points);
    const stage = stageFor(total);
    const mood = echoMood(entries.some((e) => dayKey(e.at) === today), streak);
    const top = dominantAttr(points);
    return {
      echo: profile.echo,
      outfit: profile.outfit,
      points,
      total,
      stage,
      mood,
      line: echoLine(mood, today),
      archetype: archetypeFor(points),
      accent: top?.color ?? ATTRIBUTES[0].color,
    };
  }, [profile.echo, profile.outfit, entries, tasks, folders, streak, today]);
}
