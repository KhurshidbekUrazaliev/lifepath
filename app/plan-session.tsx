import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../src/store';
import { addDays, dayKey } from '../src/lib/dates';
import { dayChipLabel, timeLabel, toTime } from '../src/lib/calendar';
import { ensurePermission } from '../src/notifications';
import { radius, space, tint, type, useTheme } from '../src/theme';
import { Card, Chip, EmptyState, Field, Muted, Screen, TopBar } from '../src/components/ui';
import { TimePicker } from '../src/components/TimePicker';
import { BounceButton, Squish } from '../src/components/BounceButton';
import { haptic } from '../src/components/feedback';

export default function PlanSessionScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ day?: string; taskId?: string }>();
  const folders = useStore((s) => s.folders);
  const tasks = useStore((s) => s.tasks);
  const addPlan = useStore((s) => s.addPlan);

  const today = dayKey();
  const open = useMemo(() => tasks.filter((x) => !x.completedAt && folders.some((f) => f.id === x.folderId)), [tasks, folders]);
  const [taskId, setTaskId] = useState<string | undefined>(params.taskId ?? (open.length === 1 ? open[0].id : undefined));
  const initialDay = params.day && params.day >= today ? params.day : today;
  const [day, setDay] = useState(initialDay);
  const [withTime, setWithTime] = useState(true);
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(30);
  const [note, setNote] = useState('');

  const dayOptions = useMemo(() => {
    const list = Array.from({ length: 14 }, (_, i) => dayKey(addDays(Date.now(), i)));
    if (!list.includes(initialDay)) list.unshift(initialDay);
    return list;
  }, [initialDay]);

  const task = open.find((x) => x.id === taskId);
  const folder = task ? folders.find((f) => f.id === task.folderId) : undefined;
  const color = folder?.color ?? t.accent;

  if (open.length === 0) {
    return (
      <Screen edges={['top', 'bottom']}>
        <TopBar title="Plan a session" />
        <EmptyState icon="📅" title="Nothing to plan yet" body="Create a task first, then plan when you'll work on it." />
      </Screen>
    );
  }

  const save = async () => {
    if (!taskId) return;
    addPlan({ taskId, day, time: withTime ? toTime(hour, minute) : undefined, note });
    haptic('success');
    router.back();
    ensurePermission(); // reminder fires at the planned time if allowed
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <TopBar title="Plan a session" />

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>WHAT</Text>
        {open.map((x) => {
          const f = folders.find((ff) => ff.id === x.folderId)!;
          const sel = x.id === taskId;
          return (
            <Squish
              key={x.id}
              scaleTo={0.98}
              hapticKind="select"
              onPress={() => setTaskId(x.id)}
              style={[
                styles.taskRow,
                { backgroundColor: sel ? (t.dark ? tint(f.color, -0.6) : tint(f.color, 0.85)) : t.surface, borderColor: sel ? f.color : t.border },
              ]}
            >
              <Text style={{ fontSize: 22 }}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: t.text, fontWeight: '700' }]} numberOfLines={1}>{x.title}</Text>
                <Muted>{f.name}</Muted>
              </View>
              <View style={[styles.radio, { borderColor: sel ? f.color : t.border, backgroundColor: sel ? f.color : 'transparent' }]} />
            </Squish>
          );
        })}
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>WHEN</Text>
        <View style={styles.wrap}>
          {dayOptions.map((k) => (
            <Chip key={k} label={dayChipLabel(k, today)} color={color} selected={day === k} onPress={() => setDay(k)} />
          ))}
        </View>
      </View>

      <Card style={{ gap: space.md }}>
        <View style={styles.between}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>Set a time</Text>
            <Muted>{withTime ? `We'll remind you at ${timeLabel(hour, minute)}` : 'Without a time we remind you at 9:00 AM.'}</Muted>
          </View>
          <Switch value={withTime} onValueChange={setWithTime} trackColor={{ true: color, false: t.track }} />
        </View>
        {withTime ? (
          <TimePicker color={color} hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
        ) : null}
      </Card>

      <Field label="Note (optional)" placeholder="e.g. Chapters 5–6, or 4×8 overhead press" value={note} onChangeText={setNote} multiline />

      <BounceButton label="Add to plan" icon="📅" color={color} size="lg" disabled={!taskId} onPress={save} />
      {!taskId ? <Muted style={{ textAlign: 'center' }}>Pick what you'll work on.</Muted> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  between: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
