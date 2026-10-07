import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { FREE_FOLDER_LIMIT } from '../src/lib/plus';
import { usePlan, usePlus } from '../src/plusState';
import { useStore } from '../src/store';
import { radius, space, type, useTheme } from '../src/theme';
import { Card, Muted, Screen, TopBar } from '../src/components/ui';

const PERKS = [
  { icon: '🗂️', title: 'Unlimited folders', body: `Free includes ${FREE_FOLDER_LIMIT} folders. Plus has no limit.` },
  { icon: '✨', title: 'AI planner', body: 'Turns a goal, a deadline and your real pace into a calendar of sessions.' },
  { icon: '🛡️', title: 'Your rankings stay fair', body: 'Plus never changes rankings. Proof and effort do.' },
];

export default function PlusScreen() {
  const t = useTheme();
  const plus = usePlus();
  const devPlus = usePlan((s) => s.devPlus);
  const setDevPlus = usePlan((s) => s.setDevPlus);
  const folders = useStore((s) => s.folders.length);

  return (
    <Screen edges={['top']}>
      <TopBar title="Lifepath Plus" />
      <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
        <Text style={{ fontSize: 48 }}>{plus ? '🌟' : '✨'}</Text>
        <Text style={[type.title, { color: t.text }]}>{plus ? 'You have Plus' : 'Lifepath Plus'}</Text>
        <Muted style={{ textAlign: 'center' }}>
          {plus ? 'Everything below is unlocked on your account.' : `You are using ${folders} of ${FREE_FOLDER_LIMIT} free folders.`}
        </Muted>
      </Card>

      <Card style={{ gap: space.lg }}>
        {PERKS.map((p) => (
          <View key={p.title} style={styles.perk}>
            <Text style={{ fontSize: 28 }}>{p.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>{p.title}</Text>
              <Muted>{p.body}</Muted>
            </View>
          </View>
        ))}
      </Card>

      {!plus ? (
        <Card>
          <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>Plus is not for sale yet</Text>
          <Muted>
            Purchases open once the app is in the stores. Until then Plus is switched on by hand for testers.
          </Muted>
        </Card>
      ) : null}

      {__DEV__ ? (
        <Card style={{ gap: space.sm }}>
          <View style={styles.between}>
            <View style={{ flex: 1, paddingRight: space.md }}>
              <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>Developer: pretend I have Plus</Text>
              <Muted>Only in development builds. Real Plus comes from the server.</Muted>
            </View>
            <Switch value={devPlus} onValueChange={setDevPlus} trackColor={{ true: t.accent }} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.md },
});
