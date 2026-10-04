import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store';
import { Folder } from '../../src/lib/types';
import { folderProgress } from '../../src/lib/progress';
import { cardShadow, radius, space, tint, type, useTheme } from '../../src/theme';
import { EmptyState, Muted, Screen } from '../../src/components/ui';
import { ProgressRing } from '../../src/components/Progress';
import { BounceButton, Squish } from '../../src/components/BounceButton';
import { confirmAction } from '../../src/components/feedback';

export default function LifeMapScreen() {
  const t = useTheme();
  const folders = useStore((s) => s.folders);
  const tasks = useStore((s) => s.tasks);
  const entries = useStore((s) => s.entries);
  const deleteFolder = useStore((s) => s.deleteFolder);
  const seedExamples = useStore((s) => s.seedExamples);

  const active = tasks.filter((x) => !x.completedAt).length;
  const finished = tasks.filter((x) => x.completedAt).length;

  const tile = (f: Folder) => {
    const mine = tasks.filter((x) => x.folderId === f.id);
    const open = mine.filter((x) => !x.completedAt);
    const ratio = folderProgress(open.length ? open : mine, entries);
    const soft = t.dark ? tint(f.color, -0.62) : tint(f.color, 0.86);
    return (
      <Squish
        key={f.id}
        scaleTo={0.96}
        onPress={() => router.push({ pathname: '/folder/[id]', params: { id: f.id } })}
        onLongPress={() =>
          confirmAction(`Delete ${f.name}?`, 'This removes the folder, its tasks and their history.', 'Delete', () => deleteFolder(f.id))
        }
        containerStyle={styles.cell}
        style={[styles.tile, { backgroundColor: soft }, cardShadow(t)]}
      >
        {/* decorative orbs give each folder its own little "world" */}
        <View style={[styles.orb, { backgroundColor: f.color, opacity: 0.18, width: 120, height: 120, right: -40, top: -40 }]} />
        <View style={[styles.orb, { backgroundColor: f.color, opacity: 0.12, width: 70, height: 70, left: -20, bottom: -24 }]} />
        <View style={styles.tileTop}>
          <Text style={{ fontSize: 34 }}>{f.icon}</Text>
          <ProgressRing ratio={ratio} color={f.color} size={44} stroke={5}>
            <Text style={[type.tiny, { color: t.text, letterSpacing: 0 }]}>{Math.round(ratio * 100)}</Text>
          </ProgressRing>
        </View>
        <View>
          <Text numberOfLines={1} style={[type.heading, { color: t.text }]}>{f.name}</Text>
          <Text style={[type.small, { color: t.textMuted }]}>
            {open.length} active{mine.length - open.length ? ` · ${mine.length - open.length} done` : ''}
          </Text>
        </View>
      </Squish>
    );
  };

  return (
    <Screen>
      <View style={{ paddingTop: space.lg, gap: 2 }}>
        <Text style={[type.hero, { color: t.text }]}>Life Map</Text>
        <Muted>
          {folders.length} folder{folders.length === 1 ? '' : 's'} · {active} active · {finished} finished
        </Muted>
      </View>

      {folders.length === 0 ? (
        <EmptyState icon="🗺️" title="No folders yet" body="Folders are the areas of your life: Reading, Gym, Languages, or anything you invent.">
          <View style={{ gap: space.sm, alignSelf: 'stretch', marginTop: space.sm }}>
            <BounceButton label="Create a folder" icon="➕" onPress={() => router.push('/new-folder')} />
            <BounceButton label="Load example data" variant="soft" onPress={seedExamples} />
          </View>
        </EmptyState>
      ) : (
        <View style={styles.grid}>
          {folders.map(tile)}
          <Squish
            scaleTo={0.96}
            onPress={() => router.push('/new-folder')}
            containerStyle={styles.cell}
            style={[styles.tile, styles.addTile, { borderColor: t.border }]}
            accessibilityLabel="New folder"
          >
            <View style={[styles.addCircle, { backgroundColor: t.accentSoft }]}>
              <Ionicons name="add" size={28} color={t.accent} />
            </View>
            <Text style={[type.body, { color: t.textMuted, fontWeight: '700' }]}>New folder</Text>
          </Squish>
        </View>
      )}
      {folders.length > 0 ? <Muted style={{ textAlign: 'center' }}>Tip: long-press a folder to delete it.</Muted> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  cell: { width: '48.5%' },
  tile: {
    width: '100%', aspectRatio: 1.05, borderRadius: radius.lg,
    padding: space.lg, justifyContent: 'space-between', overflow: 'hidden',
  },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orb: { position: 'absolute', borderRadius: 999 },
  addTile: { borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  addCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
