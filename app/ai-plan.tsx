import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../src/store';
import { useAuth } from '../src/sync';
import { usePlus } from '../src/plusState';
import { requestPlan, PlanResult } from '../src/aiPlan';
import { dayChipLabel, timeLabel, parseTime } from '../src/lib/calendar';
import { computeProgress } from '../src/lib/progress';
import { formatShortDate } from '../src/lib/dates';
import { space, type, useTheme } from '../src/theme';
import { Card, Chip, EmptyState, Muted, Screen, SectionTitle, TopBar } from '../src/components/ui';
import { BounceButton } from '../src/components/BounceButton';
import { haptic } from '../src/components/feedback';

const TIMES: { label: string; value?: string }[] = [
  { label: 'Any time' },
  { label: 'Morning', value: '08:00' },
  { label: 'Lunch', value: '12:30' },
  { label: 'Evening', value: '19:00' },
];

export default function AiPlanScreen() {
  const t = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId));
  const folder = useStore((s) => (task ? s.folders.find((f) => f.id === task.folderId) : undefined));
  const entries = useStore((s) => s.entries);
  const plans = useStore((s) => s.plans);
  const addPlan = useStore((s) => s.addPlan);
  const signedIn = useAuth((s) => !!s.userId);
  const plus = usePlus();

  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [horizon, setHorizon] = useState(28);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [added, setAdded] = useState(false);

  if (!task || !folder) {
    return (
      <Screen edges={['top']}>
        <TopBar />
        <EmptyState icon="🫥" title="Task not found" body="It may have been deleted." />
      </Screen>
    );
  }

  if (!plus) {
    return (
      <Screen edges={['top']}>
        <TopBar title="AI planner" />
        <EmptyState icon="✨" title="AI planner is part of Plus" body="Plus turns a goal, a deadline and your real pace into a calendar of sessions.">
          <BounceButton label="See Plus" onPress={() => router.replace('/plus')} />
        </EmptyState>
      </Screen>
    );
  }

  const color = folder.color;
  const progress = computeProgress(task, entries);
  const finished = !!task.completedAt || progress.remaining <= 0;

  const generate = async () => {
    setBusy(true);
    setAdded(false);
    const res = await requestPlan(task, entries, plans, { daysPerWeek, time, horizonDays: horizon }, signedIn);
    setResult(res);
    setBusy(false);
    haptic('success');
  };

  const addAll = () => {
    if (!result) return;
    for (const s of result.suggestions) addPlan({ taskId: task.id, day: s.day, time: s.time, note: s.note });
    haptic('success');
    setAdded(true);
  };

  return (
    <Screen edges={['top']}>
      <TopBar title="Plan with AI" />
      <Card style={{ gap: 4 }}>
        <Text style={[type.heading, { color: t.text }]}>{folder.icon}  {task.title}</Text>
        <Muted>
          {progress.label}
          {task.deadline ? ` · due ${formatShortDate(task.deadline)}` : ''}
        </Muted>
      </Card>

      {finished ? (
        <EmptyState icon="🏁" title="Nothing left to plan" body="This task is finished." />
      ) : (
        <>
          <SectionTitle>How often?</SectionTitle>
          <View style={styles.row}>
            {[2, 3, 4, 5, 7].map((n) => (
              <Chip key={n} label={n === 7 ? 'Daily' : `${n}× a week`} selected={daysPerWeek === n} color={color} onPress={() => setDaysPerWeek(n)} />
            ))}
          </View>
          <SectionTitle>When?</SectionTitle>
          <View style={styles.row}>
            {TIMES.map((x) => (
              <Chip key={x.label} label={x.label} selected={time === x.value} color={color} onPress={() => setTime(x.value)} />
            ))}
          </View>
          <SectionTitle>How far ahead?</SectionTitle>
          <View style={styles.row}>
            {[14, 28, 60].map((n) => (
              <Chip key={n} label={n === 60 ? '2 months' : `${n / 7} weeks`} selected={horizon === n} color={color} onPress={() => setHorizon(n)} />
            ))}
          </View>

          <BounceButton label={busy ? 'Planning…' : result ? 'Plan again' : '✨ Make my plan'} color={color} size="lg" disabled={busy} onPress={generate} />
          {busy ? <ActivityIndicator color={t.accent} /> : null}
        </>
      )}

      {result ? (
        result.suggestions.length === 0 ? (
          <EmptyState icon="🌤️" title="Nothing new to plan" body="You may already have sessions on those days, or the deadline is too close." />
        ) : (
          <>
            <SectionTitle right={<Muted>{result.source === 'ai' ? 'AI plan' : 'Smart plan'}</Muted>}>
              {result.suggestions.length} sessions
            </SectionTitle>
            <Card style={{ padding: space.sm }}>
              {result.suggestions.map((s, i) => {
                const tm = parseTime(s.time);
                return (
                  <View key={s.day} style={[styles.sessionRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                    <View style={{ width: 120 }}>
                      <Text style={[type.small, { color: t.text, fontWeight: '800' }]}>{dayChipLabel(s.day)}</Text>
                      {tm ? <Muted>{timeLabel(tm.hour, tm.minute)}</Muted> : null}
                    </View>
                    <Text style={[type.body, { color: t.text, flex: 1 }]}>{s.note}</Text>
                  </View>
                );
              })}
            </Card>
            {result.fallbackReason ? <Muted>{result.fallbackReason}</Muted> : null}
            {added ? (
              <BounceButton label="Added. Open calendar" variant="soft" color={color} onPress={() => router.replace('/plan')} />
            ) : (
              <BounceButton label={`Add ${result.suggestions.length} sessions to my calendar`} color={color} onPress={addAll} />
            )}
          </>
        )
      ) : null}
      <View style={{ height: space.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
});
