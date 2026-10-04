import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { timeLabel, WEEKDAY_SHORT } from '../lib/calendar';
import { radius, space, tint, type, useTheme } from '../theme';
import { Squish } from './BounceButton';
import { Chip } from './ui';

const PRESETS = [
  { label: '🌅 Morning', hour: 7, minute: 30 },
  { label: '☀️ Noon', hour: 12, minute: 0 },
  { label: '🌇 Evening', hour: 18, minute: 30 },
  { label: '🌙 Night', hour: 21, minute: 30 },
];

/** Dependency-free time picker: presets plus hour / 15-minute steppers. */
export function TimePicker({
  hour,
  minute,
  onChange,
  color,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  color?: string;
}) {
  const t = useTheme();
  const c = color ?? t.accent;
  const shift = (mins: number) => {
    const total = (((hour * 60 + minute + mins) % 1440) + 1440) % 1440;
    onChange(Math.floor(total / 60), total % 60);
  };
  const stepper = (label: string, mins: number, icon: 'remove' | 'add') => (
    <Squish onPress={() => shift(mins)} hapticKind="select" style={[styles.step, { backgroundColor: t.surfaceAlt }]} accessibilityLabel={label}>
      <Ionicons name={icon} size={18} color={t.text} />
    </Squish>
  );

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.row}>
        <View style={styles.col}>
          {stepper('Hour earlier', -60, 'remove')}
          <Text style={[type.tiny, { color: t.textMuted }]}>HOUR</Text>
          {stepper('Hour later', 60, 'add')}
        </View>
        <Text style={[styles.time, { color: c }]}>{timeLabel(hour, minute)}</Text>
        <View style={styles.col}>
          {stepper('15 minutes earlier', -15, 'remove')}
          <Text style={[type.tiny, { color: t.textMuted }]}>MIN</Text>
          {stepper('15 minutes later', 15, 'add')}
        </View>
      </View>
      <View style={styles.wrap}>
        {PRESETS.map((p) => (
          <Chip key={p.label} label={p.label} color={c} selected={p.hour === hour && p.minute === minute} onPress={() => onChange(p.hour, p.minute)} />
        ))}
      </View>
    </View>
  );
}

/** S M T W T F S toggles. Days use 1 = Sunday ... 7 = Saturday. */
export function DayPicker({ days, onChange, color }: { days: number[]; onChange: (days: number[]) => void; color?: string }) {
  const t = useTheme();
  const c = color ?? t.accent;
  return (
    <View style={styles.days}>
      {WEEKDAY_SHORT.map((label, i) => {
        const d = i + 1;
        const on = days.includes(d);
        return (
          <Squish
            key={d}
            hapticKind="select"
            containerStyle={{ flex: 1 }}
            onPress={() => onChange(on ? days.filter((x) => x !== d) : [...days, d].sort())}
            style={[styles.day, { backgroundColor: on ? c : t.dark ? tint(c, -0.75) : tint(c, 0.9) }]}
            accessibilityLabel={`Toggle day ${d}`}
          >
            <Text style={[type.body, { fontWeight: '800', color: on ? '#fff' : t.textMuted }]}>{label}</Text>
          </Squish>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 4 },
  step: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  days: { flexDirection: 'row', gap: 6 },
  day: { height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
