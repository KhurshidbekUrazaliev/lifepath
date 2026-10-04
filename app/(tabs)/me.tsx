import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useStore, useVisibleStreak } from '../../src/store';
import { ACHIEVEMENTS, levelInfo } from '../../src/lib/gamify';
import { radius, space, tint, type, useTheme } from '../../src/theme';
import { Card, Chip, Field, Muted, Screen, SectionTitle } from '../../src/components/ui';
import { ProgressBar } from '../../src/components/Progress';
import { BounceButton } from '../../src/components/BounceButton';
import { confirmAction, haptic } from '../../src/components/feedback';
import { TimePicker } from '../../src/components/TimePicker';
import { ensurePermission, notificationsAvailable, notificationsUnavailableReason, sendTestNotification } from '../../src/notifications';
import { timeLabel } from '../../src/lib/calendar';

export default function MeScreen() {
  const t = useTheme();
  const profile = useStore((s) => s.profile);
  const tasks = useStore((s) => s.tasks);
  const entries = useStore((s) => s.entries);
  const folders = useStore((s) => s.folders);
  const setName = useStore((s) => s.setName);
  const setDailyGoal = useStore((s) => s.setDailyGoal);
  const toggleHaptics = useStore((s) => s.toggleHaptics);
  const resetAll = useStore((s) => s.resetAll);
  const setNudge = useStore((s) => s.setNudge);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [editNudge, setEditNudge] = useState(false);

  const toggleNudge = async (on: boolean) => {
    if (on && notificationsAvailable) {
      const ok = await ensurePermission();
      setNotifyMsg(ok ? '' : "Notifications are off for Lifepath. Turn them on in your phone's Settings.");
      haptic('success');
    }
    setNudge({ enabled: on });
  };
  const streak = useVisibleStreak();
  const lvl = levelInfo(profile.xp);

  const stats = [
    { label: 'Total XP', value: profile.xp.toLocaleString(), icon: '⚡' },
    { label: 'Sparks', value: profile.sparks.toLocaleString(), icon: '✨' },
    { label: 'Streak', value: String(streak), icon: '🔥' },
    { label: 'Best streak', value: String(profile.streak.best), icon: '🏅' },
    { label: 'Logs', value: String(entries.length), icon: '📝' },
    { label: 'Finished', value: String(tasks.filter((x) => x.completedAt).length), icon: '🏁' },
  ];

  return (
    <Screen>
      <View style={{ paddingTop: space.lg }}>
        <Text style={[type.hero, { color: t.text }]}>You</Text>
      </View>

      {/* Echo teaser: placeholder until the companion arrives in a later version */}
      <Card style={styles.echo}>
        <View style={[styles.echoAvatar, { backgroundColor: t.accentSoft, borderColor: t.accent }]}>
          <Text style={{ fontSize: 38 }}>🌱</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[type.tiny, { color: t.accent }]}>COMING SOON</Text>
          <Text style={[type.heading, { color: t.text }]}>Your Echo</Text>
          <Muted>A companion that grows from your real effort. Your XP and Sparks are already counting toward it.</Muted>
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <Field label="Your name" placeholder="What should we call you?" value={profile.name} onChangeText={setName} />
        <View style={{ gap: 6 }}>
          <View style={styles.between}>
            <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>Level {lvl.level}</Text>
            <Muted>{lvl.needed - lvl.into} XP to level {lvl.level + 1}</Muted>
          </View>
          <ProgressBar ratio={lvl.ratio} color={t.accent} />
        </View>
      </Card>

      <View style={styles.statGrid}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.stat, { backgroundColor: t.surface }]}>
            <Text style={{ fontSize: 20 }}>{s.icon}</Text>
            <Text style={[type.title, { color: t.text }]}>{s.value}</Text>
            <Muted>{s.label}</Muted>
          </View>
        ))}
      </View>

      <SectionTitle right={<Muted>{Object.keys(profile.achievements).length} / {ACHIEVEMENTS.length}</Muted>}>Achievements</SectionTitle>
      <View style={styles.statGrid}>
        {ACHIEVEMENTS.map((a) => {
          const got = !!profile.achievements[a.id];
          return (
            <View
              key={a.id}
              style={[
                styles.badge,
                { backgroundColor: got ? (t.dark ? tint(t.accent, -0.6) : t.accentSoft) : t.surfaceAlt, opacity: got ? 1 : 0.55 },
              ]}
            >
              <Text style={{ fontSize: 28 }}>{got ? a.icon : '🔒'}</Text>
              <Text style={[type.small, { color: t.text, fontWeight: '800', textAlign: 'center' }]}>{a.title}</Text>
              <Text style={[type.tiny, { color: t.textMuted, textAlign: 'center', letterSpacing: 0, fontWeight: '500' }]}>
                {a.description}
              </Text>
            </View>
          );
        })}
      </View>

      <SectionTitle>Settings</SectionTitle>
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.sm }}>
          <Text style={[type.body, { color: t.text, fontWeight: '700' }]}>Daily XP goal</Text>
          <View style={styles.chips}>
            {[20, 30, 50, 80].map((g) => (
              <Chip key={g} label={`${g} XP`} selected={profile.dailyGoalXp === g} onPress={() => setDailyGoal(g)} />
            ))}
          </View>
        </View>
        <View style={{ gap: space.md }}>
          <View style={styles.between}>
            <View style={{ flex: 1, paddingRight: space.md }}>
              <Text style={[type.body, { color: t.text, fontWeight: '700' }]}>Evening streak nudge</Text>
              <Muted>
                {profile.nudge.enabled
                  ? `At ${timeLabel(profile.nudge.hour, profile.nudge.minute)}, only on days you haven't logged`
                  : "A reminder on days you haven't logged anything"}
              </Muted>
            </View>
            <Switch value={profile.nudge.enabled} onValueChange={toggleNudge} trackColor={{ true: t.accent, false: t.track }} />
          </View>
          {profile.nudge.enabled ? (
            editNudge ? (
              <>
                <TimePicker hour={profile.nudge.hour} minute={profile.nudge.minute} onChange={(hour, minute) => setNudge({ hour, minute })} />
                <Text onPress={() => setEditNudge(false)} style={[type.small, { color: t.accent, fontWeight: '800', textAlign: 'center' }]}>Done</Text>
              </>
            ) : (
              <Text onPress={() => setEditNudge(true)} style={[type.small, { color: t.accent, fontWeight: '800' }]}>Change time</Text>
            )
          ) : null}
        </View>
        {notificationsAvailable ? (
          <BounceButton
            label="Send a test notification"
            icon="🔔"
            variant="soft"
            size="sm"
            onPress={async () => {
              const ok = await sendTestNotification();
              setNotifyMsg(ok ? 'Sent! It arrives in about 3 seconds.' : "Notifications are off for Lifepath. Turn them on in your phone's Settings.");
            }}
          />
        ) : (
          <Muted>{notificationsUnavailableReason}</Muted>
        )}
        {notifyMsg ? <Muted>{notifyMsg}</Muted> : null}
        <View style={styles.between}>
          <Text style={[type.body, { color: t.text, fontWeight: '700' }]}>Haptic feedback</Text>
          <Switch value={profile.haptics} onValueChange={toggleHaptics} trackColor={{ true: t.accent, false: t.track }} />
        </View>
        <BounceButton
          label="Reset all data"
          variant="soft"
          color={t.danger}
          onPress={() =>
            confirmAction('Reset everything?', `This deletes ${folders.length} folders, ${tasks.length} tasks and all history on this device.`, 'Reset', resetAll)
          }
        />
      </Card>
      <Muted style={{ textAlign: 'center' }}>Lifepath v0.2 · data stays on this device</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  echo: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  echoAvatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  stat: { width: '31.5%', borderRadius: radius.md, padding: space.md, gap: 2 },
  badge: { width: '48.5%', borderRadius: radius.md, padding: space.md, alignItems: 'center', gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
