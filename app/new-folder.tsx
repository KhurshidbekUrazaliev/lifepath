import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store';
import { ProgressType } from '../src/lib/types';
import { FolderTemplate, ICONS, PALETTE, PROGRESS_TYPES, TEMPLATES } from '../src/lib/templates';
import { cardShadow, radius, space, tint, type, useTheme } from '../src/theme';
import { Field, Muted, Screen, TopBar } from '../src/components/ui';
import { BounceButton, Squish } from '../src/components/BounceButton';

export default function NewFolderScreen() {
  const t = useTheme();
  const createFolder = useStore((s) => s.createFolder);
  const [tpl, setTpl] = useState<FolderTemplate | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('');
  const [ptype, setPtype] = useState<ProgressType>('units');
  const [unit, setUnit] = useState('');

  const pick = (x: FolderTemplate) => {
    setTpl(x);
    setName(x.id === 'custom' ? '' : x.name);
    setIcon(x.icon);
    setColor(x.color);
    setPtype(x.progressType);
    setUnit(x.unit);
  };

  // Step 1: choose a starting template
  if (!tpl) {
    return (
      <Screen edges={['top', 'bottom']}>
        <TopBar title="New folder" />
        <View style={{ gap: 4 }}>
          <Text style={[type.title, { color: t.text }]}>What area of life?</Text>
          <Muted>Pick a starting point. You can customize everything next.</Muted>
        </View>
        <View style={styles.grid}>
          {TEMPLATES.map((x) => (
            <Squish
              key={x.id}
              scaleTo={0.94}
              onPress={() => pick(x)}
              containerStyle={styles.cell}
              style={[styles.tpl, { backgroundColor: t.dark ? tint(x.color, -0.62) : tint(x.color, 0.86) }, cardShadow(t)]}
            >
              <Text style={{ fontSize: 32 }}>{x.icon}</Text>
              <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>{x.name}</Text>
              <Text style={[type.tiny, { color: t.textMuted, letterSpacing: 0, fontWeight: '500' }]} numberOfLines={2}>
                {x.tagline}
              </Text>
            </Squish>
          ))}
        </View>
      </Screen>
    );
  }

  // Step 2: customize
  const canSave = name.trim().length > 0;
  const save = () => {
    const id = createFolder({
      name: name.trim(),
      icon,
      color,
      templateId: tpl.id,
      progressType: ptype,
      unit: ptype === 'time' ? 'min' : ptype === 'sessions' ? 'sessions' : ptype === 'milestones' ? 'steps' : unit.trim() || 'units',
    });
    router.back();
    setTimeout(() => router.push({ pathname: '/folder/[id]', params: { id } }), 50);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <TopBar title="Customize" />

      {/* Live preview */}
      <View style={[styles.preview, { backgroundColor: color }]}>
        <View style={styles.orb} />
        <Text style={{ fontSize: 44 }}>{icon}</Text>
        <Text style={[type.title, { color: '#fff' }]} numberOfLines={1}>{name.trim() || 'Folder name'}</Text>
        <Text style={[type.small, { color: 'rgba(255,255,255,0.85)' }]}>
          {PROGRESS_TYPES.find((p) => p.id === ptype)?.label} tracking
        </Text>
      </View>

      <Field label="Name" placeholder="e.g. Reading" value={name} onChangeText={setName} autoFocus={tpl.id === 'custom'} />

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>ICON</Text>
        <View style={styles.wrap}>
          {ICONS.map((i) => (
            <Squish
              key={i}
              hapticKind="select"
              onPress={() => setIcon(i)}
              style={[styles.iconPick, { backgroundColor: icon === i ? tint(color, t.dark ? -0.5 : 0.8) : t.surface, borderColor: icon === i ? color : t.border }]}
            >
              <Text style={{ fontSize: 22 }}>{i}</Text>
            </Squish>
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>COLOR</Text>
        <View style={styles.wrap}>
          {PALETTE.map((c) => (
            <Squish
              key={c}
              hapticKind="select"
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c, borderColor: color === c ? t.text : 'transparent' }]}
              accessibilityLabel={`Color ${c}`}
            >
              <View />
            </Squish>
          ))}
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={[type.tiny, { color: t.textMuted }]}>HOW DO YOU MEASURE PROGRESS?</Text>
        <View style={styles.grid}>
          {PROGRESS_TYPES.map((p) => {
            const sel = ptype === p.id;
            return (
              <Squish
                key={p.id}
                hapticKind="select"
                onPress={() => setPtype(p.id)}
                containerStyle={styles.cell}
                style={[styles.ptype, { backgroundColor: sel ? tint(color, t.dark ? -0.55 : 0.82) : t.surface, borderColor: sel ? color : t.border }]}
              >
                <Text style={{ fontSize: 22 }}>{p.icon}</Text>
                <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>{p.label}</Text>
                <Text style={[type.tiny, { color: t.textMuted, letterSpacing: 0, fontWeight: '500' }]}>{p.hint}</Text>
              </Squish>
            );
          })}
        </View>
      </View>

      {ptype === 'units' ? (
        <Field label="Unit" placeholder="pages, km, chapters…" value={unit} onChangeText={setUnit} autoCapitalize="none" />
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <BounceButton label="Back" variant="soft" color={color} onPress={() => setTpl(null)} style={{ paddingHorizontal: 28 }} />
        <View style={{ flex: 1 }}>
          <BounceButton label="Create folder" color={color} disabled={!canSave} onPress={save} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  cell: { width: '48.5%' },
  tpl: { borderRadius: radius.lg, padding: space.lg, gap: 4, minHeight: 130 },
  preview: { borderRadius: radius.lg, padding: space.xl, gap: 4, overflow: 'hidden' },
  orb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -50, top: -60, backgroundColor: 'rgba(255,255,255,0.15)' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  iconPick: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
  ptype: { borderRadius: radius.md, padding: space.md, gap: 2, borderWidth: 1.5, minHeight: 100 },
});
