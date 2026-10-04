import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../../src/store';
import { Task } from '../../src/lib/types';
import { folderProgress } from '../../src/lib/progress';
import { PROGRESS_TYPES } from '../../src/lib/templates';
import { space, type } from '../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, IconButton, Muted, Screen, SectionTitle, TopBar } from '../../src/components/ui';
import { ProgressRing } from '../../src/components/Progress';
import { TaskRow } from '../../src/components/TaskRow';
import { LogSheet } from '../../src/components/LogSheet';
import { BounceButton, Squish } from '../../src/components/BounceButton';
import { confirmAction } from '../../src/components/feedback';

export default function FolderScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const folder = useStore((s) => s.folders.find((f) => f.id === id));
  const allTasks = useStore((s) => s.tasks);
  const entries = useStore((s) => s.entries);
  const deleteFolder = useStore((s) => s.deleteFolder);
  const [logTask, setLogTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);

  if (!folder) {
    return (
      <Screen>
        <TopBar />
        <EmptyState icon="🫥" title="Folder not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const tasks = allTasks.filter((x) => x.folderId === folder.id);
  const open = tasks.filter((x) => !x.completedAt);
  const done = tasks.filter((x) => x.completedAt);
  const ratio = folderProgress(open.length ? open : tasks, entries);
  const typeLabel = PROGRESS_TYPES.find((p) => p.id === folder.progressType)?.label ?? '';

  return (
    <Screen edges={[]}>
      <View style={[styles.header, { backgroundColor: folder.color, paddingTop: insets.top + space.sm }]}>
        <View style={[styles.orb, { width: 220, height: 220, right: -70, top: -60 }]} />
        <View style={[styles.orb, { width: 120, height: 120, left: -40, bottom: -50 }]} />
        <View style={styles.headerInner}>
          <TopBar
            color="#fff"
            right={
              <IconButton
                name="trash-outline"
                color="#fff"
                bg="rgba(255,255,255,0.22)"
                label="Delete folder"
                onPress={() =>
                  confirmAction(`Delete ${folder.name}?`, 'This removes the folder, its tasks and their history.', 'Delete', () => {
                    deleteFolder(folder.id);
                    router.back();
                  })
                }
              />
            }
          />
          <View style={styles.heroRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 46 }}>{folder.icon}</Text>
              <Text style={[type.hero, { color: '#fff' }]} numberOfLines={2}>{folder.name}</Text>
              <Text style={[type.small, { color: 'rgba(255,255,255,0.85)' }]}>
                {open.length} active · {done.length} finished · {typeLabel}
              </Text>
            </View>
            <ProgressRing ratio={ratio} color="#fff" size={92} stroke={10}>
              <Text style={[type.title, { color: '#fff' }]}>{Math.round(ratio * 100)}%</Text>
            </ProgressRing>
          </View>
        </View>
      </View>

      <BounceButton
        label="Add a task"
        icon="➕"
        color={folder.color}
        onPress={() => router.push({ pathname: '/new-task', params: { folderId: folder.id } })}
      />

      {open.length === 0 ? (
        <EmptyState icon={folder.icon} title="Nothing in progress" body="Add the first thing you're working on in this folder." />
      ) : (
        <>
          <SectionTitle>In progress</SectionTitle>
          {open.map((task) => (
            <TaskRow key={task.id} task={task} folder={folder} entries={entries} onLog={setLogTask} />
          ))}
        </>
      )}

      {done.length > 0 ? (
        <>
          <Squish onPress={() => setShowDone((v) => !v)} hapticKind="select">
            <SectionTitle right={<Muted>{showDone ? 'Hide' : 'Show'}</Muted>}>Finished · {done.length}</SectionTitle>
          </Squish>
          {showDone ? done.map((task) => <TaskRow key={task.id} task={task} folder={folder} entries={entries} onLog={setLogTask} />) : null}
        </>
      ) : null}

      <LogSheet task={logTask} onClose={() => setLogTask(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: -space.lg, paddingHorizontal: space.lg, paddingBottom: space.xl,
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden',
  },
  headerInner: { gap: space.lg },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.lg },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.13)' },
});

