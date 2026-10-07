import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store';
import { useEcho } from '../src/echoState';
import { ATTRIBUTES, HAIR_COLORS, SKIN_TONES, ageInDays, attrLevel } from '../src/lib/echo';
import { radius, space, type, useTheme } from '../src/theme';
import { Card, Field, IconButton, Muted, Screen, SectionTitle, TopBar } from '../src/components/ui';
import { ProgressBar } from '../src/components/Progress';
import { BounceButton, Squish } from '../src/components/BounceButton';
import { EchoAvatar } from '../src/components/EchoAvatar';
import { haptic } from '../src/components/feedback';

function Swatches({ colors, value, onChange }: { colors: string[]; value: number; onChange: (i: number) => void }) {
  const t = useTheme();
  return (
    <View style={styles.swatchRow}>
      {colors.map((c, i) => (
        <Squish
          key={c}
          hapticKind="select"
          onPress={() => onChange(i)}
          style={[styles.swatch, { backgroundColor: c, borderColor: value === i ? t.accent : 'transparent' }]}
          accessibilityLabel={`Option ${i + 1}`}
        >
          {value === i ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
        </Squish>
      ))}
    </View>
  );
}

export default function EchoScreen() {
  const t = useTheme();
  const e = useEcho();
  const saveEcho = useStore((s) => s.saveEcho);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(e.echo?.name ?? '');
  const [skin, setSkin] = useState(e.echo?.skin ?? 1);
  const [hair, setHair] = useState(e.echo?.hair ?? 0);

  // A name that arrives from the cloud after sign-in fills the form.
  useEffect(() => {
    if (e.echo && !editing) {
      setName(e.echo.name);
      setSkin(e.echo.skin);
      setHair(e.echo.hair);
    }
  }, [e.echo, editing]);

  const naming = !e.echo || editing;

  if (naming) {
    return (
      <Screen edges={['top']}>
        <TopBar title={e.echo ? 'Edit your Echo' : 'Meet your Echo'} />
        <Card style={{ alignItems: 'center', gap: space.lg }}>
          <EchoAvatar size={180} skin={skin} hair={hair} stage={e.stage.index} mood="content" outfit={e.outfit} accent={e.accent} />
          {!e.echo ? (
            <Muted style={{ textAlign: 'center' }}>
              Echo is a quiet companion that grows from the real effort you put in. Give it any name you like.
            </Muted>
          ) : null}
        </Card>
        <Card style={{ gap: space.lg }}>
          <Field label="Name" placeholder="Anything you like" value={name} onChangeText={setName} maxLength={20} autoFocus={!e.echo} />
          <View style={{ gap: 6 }}>
            <Text style={[type.tiny, { color: t.textMuted, textTransform: 'uppercase' }]}>Skin</Text>
            <Swatches colors={SKIN_TONES} value={skin} onChange={setSkin} />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={[type.tiny, { color: t.textMuted, textTransform: 'uppercase' }]}>Hair</Text>
            <Swatches colors={HAIR_COLORS} value={hair} onChange={setHair} />
          </View>
        </Card>
        <BounceButton
          label={e.echo ? 'Save' : name.trim() ? `Meet ${name.trim()}` : 'Meet your Echo'}
          size="lg"
          disabled={!name.trim()}
          onPress={() => {
            saveEcho({ name, skin, hair });
            haptic('success');
            setEditing(false);
          }}
        />
        {e.echo ? <BounceButton label="Cancel" variant="ghost" onPress={() => setEditing(false)} /> : null}
      </Screen>
    );
  }

  const echo = e.echo!;
  return (
    <Screen edges={['top']}>
      <TopBar
        title="Your Echo"
        right={<IconButton name="create-outline" label="Edit Echo" onPress={() => setEditing(true)} />}
      />

      <Card style={{ alignItems: 'center', gap: space.md, paddingTop: space.xl }}>
        <EchoAvatar size={220} skin={echo.skin} hair={echo.hair} stage={e.stage.index} mood={e.mood} outfit={e.outfit} accent={e.accent} />
        <Text style={[type.hero, { color: t.text }]}>{echo.name}</Text>
        <Text style={[type.body, { color: t.textMuted, fontWeight: '700' }]}>
          {e.archetype} · {e.stage.name}
        </Text>
        <View style={[styles.bubble, { backgroundColor: t.accentSoft }]}>
          <Text style={[type.body, { color: t.text, textAlign: 'center' }]}>{e.line}</Text>
        </View>
        <View style={{ width: '100%', gap: 6 }}>
          <ProgressBar ratio={e.stage.ratio} color={e.accent} />
          <Muted style={{ textAlign: 'center' }}>
            {e.stage.next ? `${e.stage.toNext} effort points to ${e.stage.next}` : 'Fully grown. Thank you for all of it.'}
          </Muted>
        </View>
        <Muted>Born {ageInDays(echo.bornAt) === 0 ? 'today' : `${ageInDays(echo.bornAt)} days ago`}</Muted>
      </Card>

      <BounceButton label="Wardrobe" variant="soft" icon="👕" onPress={() => router.push('/wardrobe')} />

      <SectionTitle>What shapes {echo.name}</SectionTitle>
      <Card style={{ gap: space.lg }}>
        {ATTRIBUTES.map((a) => {
          const lv = attrLevel(e.points[a.id]);
          return (
            <View key={a.id} style={{ gap: 6 }}>
              <View style={styles.between}>
                <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>
                  {a.icon}  {a.name}
                </Text>
                <Text style={[type.small, { color: t.textMuted }]}>Lv {lv.level} · {e.points[a.id]} pts</Text>
              </View>
              <ProgressBar ratio={lv.ratio} color={a.color} height={10} />
              <Text style={[type.tiny, { color: t.textMuted, letterSpacing: 0, fontWeight: '500' }]}>{a.blurb}</Text>
            </View>
          );
        })}
      </Card>
      <Muted style={{ textAlign: 'center', paddingBottom: space.xl }}>
        Logs with proof count in full. One-tap logs count 40%. Echo never loses progress.
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatchRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  bubble: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, maxWidth: '100%' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
