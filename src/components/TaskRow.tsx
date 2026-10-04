import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Entry, Folder, Task } from '../lib/types';
import { computeProgress, loggedToday } from '../lib/progress';
import { cardShadow, radius, space, tint, type, useTheme } from '../theme';
import { ProgressBar } from './Progress';
import { Squish } from './BounceButton';

export function TaskRow({
  task,
  folder,
  entries,
  onLog,
  showFolder,
}: {
  task: Task;
  folder: Folder;
  entries: Entry[];
  onLog: (task: Task) => void;
  showFolder?: boolean;
}) {
  const t = useTheme();
  const p = computeProgress(task, entries);
  const done = !!task.completedAt;
  const today = loggedToday(task.id, entries);

  return (
    <Squish
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
      style={[styles.row, { backgroundColor: t.surface }, cardShadow(t)]}
    >
      <View style={[styles.icon, { backgroundColor: t.dark ? tint(folder.color, -0.6) : tint(folder.color, 0.85) }]}>
        <Text style={{ fontSize: 22 }}>{folder.icon}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[type.body, { color: t.text, fontWeight: '700', flex: 1 }]}>
            {task.title}
          </Text>
          {today && !done ? <Ionicons name="checkmark-circle" size={16} color={t.success} /> : null}
        </View>
        <ProgressBar ratio={p.ratio} color={folder.color} height={9} />
        <Text style={[type.small, { color: t.textMuted }]}>
          {showFolder ? `${folder.name} · ` : ''}
          {done ? 'Completed 🏁' : `${p.label} · ${Math.round(p.ratio * 100)}%`}
        </Text>
      </View>
      {!done ? (
        <Squish
          onPress={() => onLog(task)}
          hapticKind="medium"
          accessibilityLabel={`Log progress for ${task.title}`}
          style={[styles.plus, { backgroundColor: folder.color, shadowColor: folder.color }]}
        >
          <Ionicons name={task.progressType === 'milestones' ? 'checkmark' : 'add'} size={24} color="#fff" />
        </Squish>
      ) : null}
    </Squish>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  plus: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
  },
});
