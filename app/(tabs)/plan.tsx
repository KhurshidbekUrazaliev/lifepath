import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store';
import { Task } from '../../src/lib/types';
import { dayKey } from '../../src/lib/dates';
import { dayChipLabel, daysLabel, monthGrid, monthTitle, timeLabel } from '../../src/lib/calendar';
import { formatAmount } from '../../src/lib/progress';
import { radius, space, tint, type, useTheme } from '../../src/theme';
import { Card, IconButton, Muted, Screen, SectionTitle } from '../../src/components/ui';
import { PlanRow } from '../../src/components/PlanRow';
import { LogSheet } from '../../src/components/LogSheet';
import { BounceButton, Squish } from '../../src/components/BounceButton';

export default function PlanScreen() {
  const t = useTheme();
  const folders = useStore((s) => s.folders);
  const tasks = useStore((s) => s.tasks);
  const entries = useStore((s) => s.entries);
  const plans = useStore((s) => s.plans);
  const today = dayKey();
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(today);
  const [logTask, setLogTask] = useState<Task | null>(null);

  const weeks = useMemo(() => monthGrid(view.year, view.month), [view]);
  const taskById = useMemo(() => new Map(tasks.map((x) => [x.id, x])), [tasks]);
  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  // Per-day lookups: folder colors that had logs, and plan counts.
  const { logColors, planInfo } = useMemo(() => {
    const colors = new Map<string, string[]>();
    for (const e of entries) {
      const task = taskById.get(e.taskId);
      const folder = task && folderById.get(task.folderId);
      if (!folder) continue;
      const k = dayKey(e.at);
      const list = colors.get(k) ?? [];
      if (!list.includes(folder.color)) list.push(folder.color);
      colors.set(k, list);
    }
    const info = new Map<string, { open: number; done: number }>();
    for (const p of plans) {
      if (!taskById.has(p.taskId)) continue;
      const cur = info.get(p.day) ?? { open: 0, done: 0 };
      if (p.doneAt) cur.done++;
      else cur.open++;
      info.set(p.day, cur);
    }
    return { logColors: colors, planInfo: info };
  }, [entries, plans, taskById, folderById]);

  const dayPlans = plans
    .filter((p) => p.day === selected && taskById.has(p.taskId))
    .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
  const dayLogs = entries.filter((e) => dayKey(e.at) === selected && taskById.has(e.taskId)).sort((a, b) => a.at - b.at);
  const dayXp = dayLogs.reduce((s, e) => s + e.xp, 0);
  const upcoming = plans
    .filter((p) => p.day > today && !p.doneAt && taskById.has(p.taskId))
    .sort((a, b) => (a.day + (a.time ?? '')).localeCompare(b.day + (b.time ?? '')))
    .slice(0, 5);
  const withReminders = tasks.filter((x) => x.reminder && !x.completedAt && folderById.has(x.folderId));

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const planFor = (p: (typeof plans)[number]) => {
    const task = taskById.get(p.taskId)!;
    return <PlanRow key={p.id} plan={p} task={task} folder={folderById.get(task.folderId)!} onLog={setLogTask} />;
  };

  return (
    <Screen>
      <View style={{ paddingTop: space.lg, gap: 2 }}>
        <Text style={[type.hero, { color: t.text }]}>Plan</Text>
        <Muted>Your sessions, reminders, and what you've done.</Muted>
      </View>

      <Card style={{ gap: space.md, padding: space.md }}>
        <View style={styles.monthRow}>
          <IconButton name="chevron-back" label="Previous month" bg={t.surfaceAlt} onPress={() => shiftMonth(-1)} />
          <Squish
            hapticKind="select"
            onPress={() => {
              setView({ year: now.getFullYear(), month: now.getMonth() });
              setSelected(today);
            }}
          >
            <Text style={[type.heading, { color: t.text }]}>{monthTitle(view.year, view.month)}</Text>
          </Squish>
          <IconButton name="chevron-forward" label="Next month" bg={t.surfaceAlt} onPress={() => shiftMonth(1)} />
        </View>

        <View style={styles.week}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={[type.tiny, styles.cellText, { color: t.textMuted }]}>{d}</Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.week}>
            {week.map((d) => {
              const isSel = d.key === selected;
              const isToday = d.key === today;
              const colors = logColors.get(d.key) ?? [];
              const pi = planInfo.get(d.key);
              return (
                <Squish
                  key={d.key}
                  hapticKind="select"
                  scaleTo={0.88}
                  containerStyle={{ flex: 1 }}
                  onPress={() => setSelected(d.key)}
                  style={[
                    styles.cell,
                    isSel && { backgroundColor: t.accent },
                    !isSel && isToday && { borderWidth: 2, borderColor: t.accent },
                  ]}
                  accessibilityLabel={d.key}
                >
                  <Text
                    style={[
                      type.body,
                      { fontWeight: isToday || isSel ? '900' : '600', color: isSel ? '#fff' : d.inMonth ? t.text : t.textMuted, opacity: d.inMonth ? 1 : 0.45 },
                    ]}
                  >
                    {d.date}
                  </Text>
                  <View style={styles.dots}>
                    {colors.slice(0, 3).map((c) => (
                      <View key={c} style={[styles.dot, { backgroundColor: isSel ? '#fff' : c }]} />
                    ))}
                    {pi && pi.open > 0 ? <View style={[styles.ring, { borderColor: isSel ? '#fff' : t.textMuted }]} /> : null}
                  </View>
                </Squish>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: t.accent }]} />
          <Muted>logged</Muted>
          <View style={[styles.ring, { borderColor: t.textMuted, marginLeft: space.md }]} />
          <Muted>planned</Muted>
        </View>
      </Card>

      <SectionTitle right={dayLogs.length ? <Muted>{dayLogs.length} logs · {dayXp} XP</Muted> : undefined}>
        {dayChipLabel(selected, today)}
      </SectionTitle>

      {dayPlans.length === 0 && dayLogs.length === 0 ? (
        <Muted>{selected < today ? 'Nothing logged this day.' : 'Nothing planned yet.'}</Muted>
      ) : null}
      {dayPlans.map(planFor)}

      {dayLogs.length > 0 ? (
        <Card style={{ padding: space.sm }}>
          {dayLogs.map((e, i) => {
            const task = taskById.get(e.taskId)!;
            const folder = folderById.get(task.folderId)!;
            return (
              <View key={e.id} style={[styles.logRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
                <Text style={{ fontSize: 18 }}>{folder.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: t.text, fontWeight: '700' }]} numberOfLines={1}>{task.title}</Text>
                  <Muted>{e.amount > 0 ? `+${formatAmount(e.amount, task.unit, task.progressType)}` : e.note}</Muted>
                </View>
                <Text style={[type.small, { color: t.accent, fontWeight: '800' }]}>+{e.xp} XP</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {selected >= today ? (
        <BounceButton
          label={`Plan a session${selected === today ? ' today' : ''}`}
          icon="📅"
          variant="soft"
          onPress={() => router.push({ pathname: '/plan-session', params: { day: selected } })}
        />
      ) : null}

      {upcoming.length > 0 && selected === today ? (
        <>
          <SectionTitle>Coming up</SectionTitle>
          {upcoming.map((p) => (
            <View key={p.id} style={{ gap: 6 }}>
              <Muted style={{ fontWeight: '700' }}>{dayChipLabel(p.day, today)}</Muted>
              {planFor(p)}
            </View>
          ))}
        </>
      ) : null}

      {withReminders.length > 0 ? (
        <>
          <SectionTitle>Reminders</SectionTitle>
          <Card style={{ padding: space.sm }}>
            {withReminders.map((x, i) => {
              const f = folderById.get(x.folderId)!;
              return (
                <Squish
                  key={x.id}
                  scaleTo={0.98}
                  onPress={() => router.push({ pathname: '/task/[id]', params: { id: x.id } })}
                  style={[styles.logRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}
                >
                  <View style={[styles.bell, { backgroundColor: t.dark ? tint(f.color, -0.6) : tint(f.color, 0.85) }]}>
                    <Ionicons name="alarm-outline" size={18} color={f.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.body, { color: t.text, fontWeight: '700' }]} numberOfLines={1}>{x.title}</Text>
                    <Muted>{daysLabel(x.reminder!.days)} at {timeLabel(x.reminder!.hour, x.reminder!.minute)}</Muted>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
                </Squish>
              );
            })}
          </Card>
        </>
      ) : null}

      <LogSheet task={logTask} onClose={() => setLogTask(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row', gap: 4 },
  cell: { height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: 3 },
  cellText: { flex: 1, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  ring: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  bell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
