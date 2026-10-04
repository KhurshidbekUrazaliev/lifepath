import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../src/store';
import { computeProgress, forecast, formatAmount, taskEntries } from '../../src/lib/progress';
import { formatRelative, formatShortDate } from '../../src/lib/dates';
import { cardShadow, radius, space, tint, type, useTheme } from '../../src/theme';
import { Card, EmptyState, Field, IconButton, Muted, Screen, SectionTitle, TopBar } from '../../src/components/ui';
import { ProgressRing } from '../../src/components/Progress';
import { LogSheet } from '../../src/components/LogSheet';
import { BounceButton, Squish } from '../../src/components/BounceButton';
import { confirmAction, haptic } from '../../src/components/feedback';

export default function TaskScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useStore((s) => s.tasks.find((x) => x.id === id));
  const folder = useStore((s) => (task ? s.folders.find((f) => f.id === task.folderId) : undefined));
  const entries = useStore((s) => s.entries);
  const { deleteTask, completeTask, reopenTask, toggleMilestone, addMilestone, removeMilestone, addResource, removeResource, deleteEntry } =
    useStore.getState();
  const [logOpen, setLogOpen] = useState(false);
  const [newMs, setNewMs] = useState('');
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [showAll, setShowAll] = useState(false);

  if (!task || !folder) {
    return (
      <Screen>
        <TopBar />
        <EmptyState icon="🫥" title="Task not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const color = folder.color;
  const soft = t.dark ? tint(color, -0.62) : tint(color, 0.86);
  const p = computeProgress(task, entries);
  const fc = forecast(task, entries);
  const history = taskEntries(entries, task.id).sort((a, b) => b.at - a.at);
  const visibleHistory = showAll ? history : history.slice(0, 6);
  const isMs = task.progressType === 'milestones';
  const done = !!task.completedAt;

  return (
    <Screen edges={[]}>
      <View style={[styles.header, { backgroundColor: color, paddingTop: insets.top + space.sm }]}>
        <View style={[styles.orb, { width: 240, height: 240, right: -80, top: -70 }]} />
        <TopBar
          color="#fff"
          title={folder.name}
          right={
            <IconButton
              name="trash-outline"
              color="#fff"
              bg="rgba(255,255,255,0.22)"
              label="Delete task"
              onPress={() =>
                confirmAction(`Delete ${task.title}?`, 'Its progress history will be removed too.', 'Delete', () => {
                  router.back();
                  deleteTask(task.id);
                })
              }
            />
          }
        />
        <View style={styles.heroCenter}>
          <ProgressRing ratio={p.ratio} color="#fff" size={170} stroke={16}>
            <Text style={styles.percent}>{Math.round(p.ratio * 100)}%</Text>
            <Text style={[type.small, { color: 'rgba(255,255,255,0.85)' }]}>{done ? 'completed' : 'complete'}</Text>
          </ProgressRing>
          <Text style={[type.title, { color: '#fff', textAlign: 'center' }]}>{task.title}</Text>
          <Text style={[type.body, { color: 'rgba(255,255,255,0.9)' }]}>{p.label}</Text>
        </View>
      </View>

      {!done ? (
        <BounceButton
          label={isMs ? 'Check off a step' : task.progressType === 'sessions' ? 'Log a session' : 'Log progress'}
          icon={isMs ? '✅' : '⚡'}
          color={color}
          size="lg"
          onPress={() => setLogOpen(true)}
        />
      ) : (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 36 }}>🏁</Text>
          <Text style={[type.heading, { color: t.text }]}>Finished on {formatShortDate(task.completedAt!)}</Text>
          <BounceButton label="Reopen" variant="soft" color={color} size="sm" onPress={() => reopenTask(task.id)} />
        </Card>
      )}

      {/* Pace & deadline insights */}
      {(fc || task.deadline) && !done ? (
        <View style={styles.insights}>
          {fc && fc.perDay > 0 ? (
            <View style={[styles.insight, { backgroundColor: t.surface }, cardShadow(t)]}>
              <Text style={{ fontSize: 20 }}>📈</Text>
              <Text style={[type.heading, { color: t.text }]}>{formatAmount(Math.round(fc.perDay * 10) / 10, task.unit, task.progressType)}</Text>
              <Muted>per day lately</Muted>
            </View>
          ) : null}
          {fc?.finishAt ? (
            <View style={[styles.insight, { backgroundColor: t.surface }, cardShadow(t)]}>
              <Text style={{ fontSize: 20 }}>🔮</Text>
              <Text style={[type.heading, { color: t.text }]}>{formatShortDate(fc.finishAt)}</Text>
              <Muted>at this pace</Muted>
            </View>
          ) : null}
          {task.deadline ? (
            <View style={[styles.insight, { backgroundColor: t.surface }, cardShadow(t)]}>
              <Text style={{ fontSize: 20 }}>{fc?.onTrack === false ? '⏰' : '🎯'}</Text>
              <Text style={[type.heading, { color: t.text }]}>{formatShortDate(task.deadline)}</Text>
              <Muted>
                {fc?.onTrack === true
                  ? 'on track'
                  : fc?.neededPerDay
                    ? `need ${formatAmount(Math.ceil(fc.neededPerDay), task.unit, task.progressType)}/day`
                    : 'deadline'}
              </Muted>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Milestones */}
      {isMs ? (
        <>
          <SectionTitle right={<Muted>{p.done} / {p.total}</Muted>}>Milestones</SectionTitle>
          <Card style={{ gap: space.sm, padding: space.md }}>
            {task.milestones.map((m, i) => (
              <View key={m.id} style={styles.msRow}>
                <Squish
                  hapticKind="none"
                  onPress={() => {
                    haptic(m.done ? 'light' : 'success');
                    toggleMilestone(task.id, m.id);
                  }}
                  style={[styles.msCheck, { backgroundColor: m.done ? color : soft, borderColor: color }]}
                  accessibilityLabel={`Toggle ${m.title}`}
                >
                  {m.done ? <Ionicons name="checkmark" size={18} color="#fff" /> : <Text style={[type.tiny, { color }]}>{i + 1}</Text>}
                </Squish>
                <Text style={[type.body, { flex: 1, color: m.done ? t.textMuted : t.text, textDecorationLine: m.done ? 'line-through' : 'none' }]}>
                  {m.title}
                </Text>
                <Squish hapticKind="none" onPress={() => removeMilestone(task.id, m.id)} accessibilityLabel="Remove milestone">
                  <Ionicons name="close" size={18} color={t.textMuted} />
                </Squish>
              </View>
            ))}
            <View style={styles.addRow}>
              <View style={{ flex: 1 }}>
                <Field placeholder="Add a milestone" value={newMs} onChangeText={setNewMs} onSubmitEditing={() => {
                  if (newMs.trim()) { addMilestone(task.id, newMs); setNewMs(''); }
                }} />
              </View>
              <IconButton name="add" bg={color} color="#fff" label="Add milestone" onPress={() => {
                if (newMs.trim()) { addMilestone(task.id, newMs); setNewMs(''); }
              }} />
            </View>
          </Card>
        </>
      ) : null}

      {/* Resources */}
      <SectionTitle>Resources</SectionTitle>
      <Card style={{ gap: space.sm, padding: space.md }}>
        {task.resources.length === 0 ? <Muted>Books, apps, links, or channels you use for this.</Muted> : null}
        {task.resources.map((r) => (
          <View key={r.id} style={[styles.resRow, { backgroundColor: soft }]}>
            <Text style={{ fontSize: 18 }}>{r.url ? '🔗' : '📘'}</Text>
            <Squish
              containerStyle={{ flex: 1 }}
              hapticKind="select"
              onPress={() => (r.url ? Linking.openURL(r.url.startsWith('http') ? r.url : `https://${r.url}`) : undefined)}
            >
              <Text style={[type.body, { color: t.text, fontWeight: '700' }]} numberOfLines={1}>{r.title}</Text>
              {r.url ? <Text style={[type.small, { color: t.textMuted }]} numberOfLines={1}>{r.url}</Text> : null}
            </Squish>
            <Squish hapticKind="none" onPress={() => removeResource(task.id, r.id)} accessibilityLabel="Remove resource">
              <Ionicons name="close" size={18} color={t.textMuted} />
            </Squish>
          </View>
        ))}
        <Field placeholder="Resource name (e.g. Duolingo, a textbook)" value={resTitle} onChangeText={setResTitle} />
        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <Field placeholder="Link (optional)" value={resUrl} onChangeText={setResUrl} autoCapitalize="none" keyboardType="url" />
          </View>
          <IconButton name="add" bg={color} color="#fff" label="Add resource" onPress={() => {
            if (resTitle.trim()) { addResource(task.id, resTitle, resUrl); setResTitle(''); setResUrl(''); haptic('light'); }
          }} />
        </View>
      </Card>

      {/* History */}
      <SectionTitle right={<Muted>{history.length} logs</Muted>}>History</SectionTitle>
      {history.length === 0 ? (
        <Muted>No logs yet. Your first one earns a bonus.</Muted>
      ) : (
        <Card style={{ padding: space.sm }}>
          {visibleHistory.map((e, i) => (
            <View key={e.id} style={[styles.histRow, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: t.text, fontWeight: '700' }]}>
                  {e.amount > 0 ? `+${formatAmount(e.amount, task.unit, task.progressType)}` : e.note}
                </Text>
                {e.amount > 0 && e.note ? <Text style={[type.small, { color: t.textMuted }]}>{e.note}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[type.small, { color: t.accent, fontWeight: '800' }]}>+{e.xp} XP</Text>
                <Muted>{formatRelative(e.at)}</Muted>
              </View>
              <Squish
                hapticKind="none"
                onPress={() => confirmAction('Remove this log?', 'Its XP will be removed too.', 'Remove', () => deleteEntry(e.id))}
                accessibilityLabel="Remove log"
              >
                <Ionicons name="ellipsis-vertical" size={16} color={t.textMuted} />
              </Squish>
            </View>
          ))}
          {history.length > 6 ? (
            <BounceButton label={showAll ? 'Show less' : `Show all ${history.length}`} variant="ghost" size="sm" onPress={() => setShowAll((v) => !v)} />
          ) : null}
        </Card>
      )}

      {!done && !isMs ? (
        <BounceButton label="Mark as finished" variant="soft" color={color} onPress={() => completeTask(task.id)} />
      ) : null}

      <LogSheet task={logOpen ? task : null} onClose={() => setLogOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: -space.lg, paddingHorizontal: space.lg, paddingBottom: space.xl,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', gap: space.md,
  },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.13)' },
  heroCenter: { alignItems: 'center', gap: space.sm },
  percent: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  insights: { flexDirection: 'row', gap: space.sm },
  insight: { flex: 1, borderRadius: radius.md, padding: space.md, gap: 2 },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 4 },
  msCheck: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
