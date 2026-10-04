import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store';
import { ProgressType } from '../src/lib/types';
import { PROGRESS_TYPES, templateById } from '../src/lib/templates';
import { addDays, formatShortDate } from '../src/lib/dates';
import { radius, space, type, useTheme } from '../src/theme';
import { Chip, EmptyState, Field, IconButton, Muted, Screen, TopBar } from '../src/components/ui';
import { BounceButton } from '../src/components/BounceButton';

const DEADLINES = [
  { label: 'None', days: 0 },
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
];

export default function NewTaskScreen() {
  const t = useTheme();
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const folder = useStore((s) => s.folders.find((f) => f.id === folderId));
  const createTask = useStore((s) => s.createTask);
  const tpl = templateById(folder?.templateId ?? 'custom');

  const [title, setTitle] = useState('');
  const [ptype, setPtype] = useState<ProgressType>(folder?.progressType ?? 'units');
  const [target, setTarget] = useState(tpl.defaultTarget ? String(tpl.defaultTarget) : '');
  const [unit, setUnit] = useState(folder?.unit ?? 'units');
  const [deadlineDays, setDeadlineDays] = useState(0);
  const [milestones, setMilestones] = useState<string[]>(['', '', '']);
  const [resources, setResources] = useState<{ title: string; url: string }[]>([]);

  if (!folder) {
    return (
      <Screen edges={['top', 'bottom']}>
        <TopBar />
        <EmptyState icon="🫥" title="Folder not found" body="Open a folder first, then add a task." />
      </Screen>
    );
  }

  const color = folder.color;
  const targetNum = Number(target.replace(/[^0-9.]/g, ''));
  const filledMs = milestones.filter((m) => m.trim()).length;
  const valid = title.trim().length > 0 && (ptype === 'milestones' ? filledMs > 0 : targetNum > 0);

  const targetLabel =
    ptype === 'time' ? 'Total minutes' : ptype === 'sessions' ? 'Number of sessions' : ptype === folder.progressType ? tpl.targetLabel : 'Target amount';

  const save = () => {
    const id = createTask({
      folderId: folder.id,
      title,
      progressType: ptype,
      target: ptype === 'milestones' ? 0 : targetNum,
      unit: ptype === 'time' ? 'min' : ptype === 'sessions' ? 'sessions' : ptype === 'milestones' ? 'steps' : unit.trim() || 'units',
      deadline: deadlineDays ? addDays(Date.now(), deadlineDays) : undefined,
      milestones,
      resources,
    });
    router.back();
    setTimeout(() => router.push({ pathname: '/task/[id]', params: { id } }), 50);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <TopBar title={`New in ${folder.name}`} />

      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={{ fontSize: 30 }}>{folder.icon}</Text>
        <Text style={[type.heading, { color: '#fff', flex: 1 }]} numberOfLines={1}>{title.trim() || tpl.taskPlaceholder}</Text>
      </View>

      <Field label="What are you working on?" placeholder={`e.g. ${tpl.taskPlaceholder}`} value={title} onChangeText={setTitle} autoFocus />

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>TRACK BY</Text>
        <View style={styles.wrap}>
          {PROGRESS_TYPES.map((p) => (
            <Chip key={p.id} label={`${p.icon} ${p.label}`} selected={ptype === p.id} color={color} onPress={() => setPtype(p.id)} />
          ))}
        </View>
      </View>

      {ptype === 'milestones' ? (
        <View style={{ gap: space.sm }}>
          <Text style={[type.tiny, { color: t.textMuted }]}>MILESTONES</Text>
          {milestones.map((m, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.num, { backgroundColor: color }]}>
                <Text style={[type.tiny, { color: '#fff' }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  placeholder={i === 0 ? 'e.g. Finish A1 grammar' : 'Next step'}
                  value={m}
                  onChangeText={(v) => setMilestones((arr) => arr.map((x, j) => (j === i ? v : x)))}
                />
              </View>
            </View>
          ))}
          <BounceButton label="Add step" icon="➕" variant="soft" color={color} size="sm" onPress={() => setMilestones((a) => [...a, ''])} />
        </View>
      ) : (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label={targetLabel} keyboardType="numeric" value={target} onChangeText={setTarget} placeholder="0" />
          </View>
          {ptype === 'units' ? (
            <View style={{ width: 130 }}>
              <Field label="Unit" value={unit} onChangeText={setUnit} autoCapitalize="none" />
            </View>
          ) : null}
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>DEADLINE (OPTIONAL)</Text>
        <View style={styles.wrap}>
          {DEADLINES.map((d) => (
            <Chip key={d.label} label={d.label} selected={deadlineDays === d.days} color={color} onPress={() => setDeadlineDays(d.days)} />
          ))}
        </View>
        {deadlineDays ? <Muted>Due {formatShortDate(addDays(Date.now(), deadlineDays))}. We'll show your pace against it.</Muted> : null}
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>RESOURCES (OPTIONAL)</Text>
        {resources.map((r, i) => (
          <View key={i} style={[styles.resCard, { borderColor: t.border }]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  placeholder="Name (app, book, channel)"
                  value={r.title}
                  onChangeText={(v) => setResources((a) => a.map((x, j) => (j === i ? { ...x, title: v } : x)))}
                />
              </View>
              <IconButton name="close" label="Remove" onPress={() => setResources((a) => a.filter((_, j) => j !== i))} />
            </View>
            <Field
              placeholder="Link (optional)"
              autoCapitalize="none"
              keyboardType="url"
              value={r.url}
              onChangeText={(v) => setResources((a) => a.map((x, j) => (j === i ? { ...x, url: v } : x)))}
            />
          </View>
        ))}
        <BounceButton
          label={resources.length ? 'Add another resource' : 'Add a resource'}
          icon="🔗"
          variant="soft"
          color={color}
          size="sm"
          onPress={() => setResources((a) => [...a, { title: '', url: '' }])}
        />
      </View>

      <BounceButton label="Create task" color={color} size="lg" disabled={!valid} onPress={save} />
      {!valid ? (
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={16} color={t.textMuted} />
          <Muted>{!title.trim() ? 'Give it a name.' : ptype === 'milestones' ? 'Add at least one milestone.' : 'Set a target above 0.'}</Muted>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  resCard: { gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
});
