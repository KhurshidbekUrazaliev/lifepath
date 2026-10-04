import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useStore } from '../store';
import { Folder, Plan, Task } from '../lib/types';
import { parseTime, timeLabel } from '../lib/calendar';
import { dayKey } from '../lib/dates';
import { cardShadow, radius, space, tint, type, useTheme } from '../theme';
import { Squish } from './BounceButton';
import { confirmAction, haptic } from './feedback';

/** One planned session: tap the circle to mark it done, "Log" to log progress (which also completes it). */
export function PlanRow({
  plan,
  task,
  folder,
  onLog,
}: {
  plan: Plan;
  task: Task;
  folder: Folder;
  onLog?: (task: Task) => void;
}) {
  const t = useTheme();
  const togglePlanDone = useStore((s) => s.togglePlanDone);
  const deletePlan = useStore((s) => s.deletePlan);
  const time = parseTime(plan.time);
  const done = !!plan.doneAt;
  const today = dayKey();
  const missed = !done && plan.day < today;
  const canLog = !done && plan.day === today && !task.completedAt && onLog;

  return (
    <Squish
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
      onLongPress={() => confirmAction('Remove this plan?', `${task.title}${plan.time ? ` at ${plan.time}` : ''}`, 'Remove', () => deletePlan(plan.id))}
      style={[styles.row, { backgroundColor: t.surface, opacity: done || missed ? 0.65 : 1 }, cardShadow(t)]}
    >
      <Squish
        hapticKind="none"
        onPress={() => {
          haptic(done ? 'light' : 'success');
          togglePlanDone(plan.id);
        }}
        style={[styles.check, { borderColor: folder.color, backgroundColor: done ? folder.color : 'transparent' }]}
        accessibilityLabel={done ? 'Mark as not done' : 'Mark as done'}
      >
        {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
      </Squish>
      <View style={[styles.stripe, { backgroundColor: folder.color }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.small, { color: t.textMuted, fontWeight: '700' }]}>
          {time ? timeLabel(time.hour, time.minute) : 'Any time'} · {folder.icon} {folder.name}
          {missed ? ' · missed' : ''}
        </Text>
        <Text
          numberOfLines={1}
          style={[type.body, { color: t.text, fontWeight: '800', textDecorationLine: done ? 'line-through' : 'none' }]}
        >
          {task.title}
        </Text>
        {plan.note ? (
          <Text numberOfLines={2} style={[type.small, { color: t.textMuted }]}>
            {plan.note}
          </Text>
        ) : null}
      </View>
      {canLog ? (
        <Squish
          hapticKind="medium"
          onPress={() => onLog!(task)}
          style={[styles.log, { backgroundColor: t.dark ? tint(folder.color, -0.55) : tint(folder.color, 0.82) }]}
        >
          <Text style={[type.small, { fontWeight: '800', color: t.dark ? tint(folder.color, 0.4) : tint(folder.color, -0.35) }]}>Log</Text>
        </Squish>
      ) : null}
    </Squish>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stripe: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  log: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
});
