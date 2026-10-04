import React, { useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useStore } from '../store';
import { Task } from '../lib/types';
import { daysLabel, timeLabel } from '../lib/calendar';
import { ensurePermission } from '../notifications';
import { space, type, useTheme } from '../theme';
import { DayPicker, TimePicker } from './TimePicker';
import { Card, Muted } from './ui';
import { haptic } from './feedback';

const DEFAULT = { hour: 21, minute: 30, days: [1, 2, 3, 4, 5, 6, 7] };

export function ReminderCard({ task, color }: { task: Task; color: string }) {
  const t = useTheme();
  const setReminder = useStore((s) => s.setReminder);
  const [denied, setDenied] = useState(false);
  const [editing, setEditing] = useState(false);
  const r = task.reminder;

  const toggle = async (on: boolean) => {
    if (!on) {
      setReminder(task.id, undefined);
      setEditing(false);
      return;
    }
    const ok = await ensurePermission();
    setDenied(!ok);
    setReminder(task.id, r ?? DEFAULT);
    setEditing(true);
    haptic('success');
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>⏰ Reminder</Text>
          <Muted>{r ? `${daysLabel(r.days)} at ${timeLabel(r.hour, r.minute)}` : 'Get a gentle nudge to work on this.'}</Muted>
        </View>
        <Switch value={!!r} onValueChange={toggle} trackColor={{ true: color, false: t.track }} />
      </View>

      {r && !editing ? (
        <Text onPress={() => setEditing(true)} style={[type.small, { color, fontWeight: '800' }]}>
          Change time or days
        </Text>
      ) : null}

      {r && editing ? (
        <View style={{ gap: space.md }}>
          <TimePicker color={color} hour={r.hour} minute={r.minute} onChange={(hour, minute) => setReminder(task.id, { ...r, hour, minute })} />
          <DayPicker
            color={color}
            days={r.days}
            onChange={(days) => setReminder(task.id, days.length ? { ...r, days } : undefined)}
          />
          <Text onPress={() => setEditing(false)} style={[type.small, { color, fontWeight: '800', textAlign: 'center' }]}>
            Done
          </Text>
        </View>
      ) : null}

      {Platform.OS === 'web' && r ? <Muted>Reminders fire on the phone app, not in the browser.</Muted> : null}
      {denied ? (
        <Muted style={{ color: t.danger }}>Notifications are off for Lifepath. Turn them on in your phone's Settings to get this reminder.</Muted>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
