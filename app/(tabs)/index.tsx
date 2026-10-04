import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore, useVisibleStreak } from '../../src/store';
import { Task } from '../../src/lib/types';
import { dayKey, greeting } from '../../src/lib/dates';
import { lastActivity, loggedToday } from '../../src/lib/progress';
import { levelInfo, xpToday } from '../../src/lib/gamify';
import { radius, space, tint, type, useTheme } from '../../src/theme';
import { Card, EmptyState, Muted, Screen, SectionTitle } from '../../src/components/ui';
import { ProgressBar, ProgressRing } from '../../src/components/Progress';
import { TaskRow } from '../../src/components/TaskRow';
import { LogSheet } from '../../src/components/LogSheet';
import { BounceButton, Squish } from '../../src/components/BounceButton';

export default function TodayScreen() {
  const t = useTheme();
  const folders = useStore((s) => s.folders);
  const tasks = useStore((s) => s.tasks);
  const entries = useStore((s) => s.entries);
  const profile = useStore((s) => s.profile);
  const seedExamples = useStore((s) => s.seedExamples);
  const streak = useVisibleStreak();
  const [logTask, setLogTask] = useState<Task | null>(null);

  const today = dayKey();
  const todayXp = xpToday(entries, today);
  const goalRatio = Math.min(1, todayXp / profile.dailyGoalXp);
  const lvl = levelInfo(profile.xp);

  const { pending, done, questTask } = useMemo(() => {
    const open = tasks.filter((x) => !x.completedAt && folders.some((f) => f.id === x.folderId));
    const pendingList = open.filter((x) => !loggedToday(x.id, entries));
    const doneList = open.filter((x) => loggedToday(x.id, entries));
    // Quest suggestion: the open task you've neglected the longest.
    const quest = [...pendingList].sort((a, b) => (lastActivity(a.id, entries) ?? 0) - (lastActivity(b.id, entries) ?? 0))[0];
    return { pending: pendingList, done: doneList, questTask: quest };
  }, [tasks, entries, folders]);

  const folderOf = (task: Task) => folders.find((f) => f.id === task.folderId)!;
  const questAvailable = profile.questDay !== today && !!questTask;
  const name = profile.name.trim();

  return (
    <Screen>
      <View style={{ paddingTop: space.lg, gap: 2 }}>
        <Muted>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Muted>
        <Text style={[type.hero, { color: t.text }]}>
          {greeting()}{name ? `, ${name}` : ''}
        </Text>
      </View>

      {/* Momentum card */}
      <Card style={styles.hero}>
        <ProgressRing ratio={goalRatio} color={t.accent} size={108} stroke={12}>
          <Text style={[type.title, { color: t.text }]}>{todayXp}</Text>
          <Text style={[type.tiny, { color: t.textMuted }]}>/ {profile.dailyGoalXp} XP</Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: space.md }}>
          <View style={styles.statRow}>
            <View style={[styles.stat, { backgroundColor: t.dark ? tint(t.flame, -0.7) : tint(t.flame, 0.88) }]}>
              <Text style={{ fontSize: 20 }}>{streak > 0 ? '🔥' : '🌑'}</Text>
              <Text style={[type.heading, { color: t.text }]}>{streak}</Text>
              <Text style={[type.tiny, { color: t.textMuted }]}>DAY{streak === 1 ? '' : 'S'}</Text>
            </View>
            <View style={[styles.stat, { backgroundColor: t.accentSoft }]}>
              <Text style={{ fontSize: 20 }}>🧊</Text>
              <Text style={[type.heading, { color: t.text }]}>{profile.freezes}</Text>
              <Text style={[type.tiny, { color: t.textMuted }]}>FREEZE</Text>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <View style={styles.levelRow}>
              <Text style={[type.small, { color: t.text, fontWeight: '800' }]}>Level {lvl.level}</Text>
              <Muted>{lvl.into} / {lvl.needed} XP</Muted>
            </View>
            <ProgressBar ratio={lvl.ratio} color={t.accent} height={8} />
          </View>
        </View>
      </Card>

      {goalRatio >= 1 ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Text style={{ fontSize: 28 }}>🌟</Text>
          <Text style={[type.body, { color: t.text, flex: 1, fontWeight: '700' }]}>Daily goal reached. Anything more is a bonus.</Text>
        </Card>
      ) : null}

      {/* Daily quest */}
      {questAvailable && questTask ? (
        <Squish
          scaleTo={0.98}
          onPress={() => setLogTask(questTask)}
          style={[styles.quest, { backgroundColor: folderOf(questTask).color }]}
        >
          <Text style={{ fontSize: 30 }}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={[type.tiny, { color: 'rgba(255,255,255,0.8)' }]}>DAILY QUEST · +15 XP</Text>
            <Text style={[type.heading, { color: '#fff' }]} numberOfLines={2}>
              Make progress on {questTask.title}
            </Text>
          </View>
        </Squish>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState icon="🧭" title="Your path starts here" body="Create a folder like Reading or Gym, then add what you're working on.">
          <View style={{ gap: space.sm, alignSelf: 'stretch', marginTop: space.sm }}>
            <BounceButton label="Create a folder" icon="➕" onPress={() => router.push('/new-folder')} />
            <BounceButton label="Load example data" variant="soft" onPress={seedExamples} />
          </View>
        </EmptyState>
      ) : (
        <>
          {pending.length > 0 ? (
            <>
              <SectionTitle right={<Muted>{pending.length} to go</Muted>}>Up next</SectionTitle>
              {pending.map((task) => (
                <TaskRow key={task.id} task={task} folder={folderOf(task)} entries={entries} onLog={setLogTask} showFolder />
              ))}
            </>
          ) : (
            <Card style={{ alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 36 }}>🎉</Text>
              <Text style={[type.heading, { color: t.text }]}>Everything touched today</Text>
              <Muted>Rest, or keep the momentum going.</Muted>
            </Card>
          )}
          {done.length > 0 ? (
            <>
              <SectionTitle>Done today</SectionTitle>
              <View style={{ gap: space.md, opacity: 0.75 }}>
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} folder={folderOf(task)} entries={entries} onLog={setLogTask} showFolder />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}

      <LogSheet task={logTask} onClose={() => setLogTask(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  statRow: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: 8, alignItems: 'center' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quest: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
});
