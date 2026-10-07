import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStore } from '../src/store';
import { useEcho } from '../src/echoState';
import { pendingSparks } from '../src/lib/evidence';
import { DEFAULT_OUTFIT, ITEMS, Item, SLOTS, Slot, canBuy, isOwned, sparkBalance } from '../src/lib/wardrobe';
import { STAGES } from '../src/lib/echo';
import { radius, space, tint, type, useTheme } from '../src/theme';
import { Card, Chip, Muted, Screen, TopBar } from '../src/components/ui';
import { BounceButton, Squish } from '../src/components/BounceButton';
import { EchoAvatar } from '../src/components/EchoAvatar';
import { haptic } from '../src/components/feedback';

export default function WardrobeScreen() {
  const t = useTheme();
  const e = useEcho();
  const profile = useStore((s) => s.profile);
  const entries = useStore((s) => s.entries);
  const buyItem = useStore((s) => s.buyItem);
  const wearItem = useStore((s) => s.wearItem);
  const [slot, setSlot] = useState<Slot>('top');
  const [preview, setPreview] = useState<Partial<Record<Slot, string>>>({});
  const [message, setMessage] = useState('');

  const balance = sparkBalance(profile);
  const waiting = pendingSparks(entries);
  const worn = { ...DEFAULT_OUTFIT, ...(profile.outfit ?? {}) };
  const shown = { ...worn, ...preview }; // what the avatar currently displays
  const items = useMemo(() => ITEMS.filter((i) => i.slot === slot), [slot]);
  const selectedId = shown[slot];
  const selected = ITEMS.find((i) => i.id === selectedId)!;
  const owned = isOwned(profile, selected);
  const isWorn = worn[slot] === selected.id;
  const check = canBuy(profile, selected.id, e.stage.index);

  const reason = !check.ok
    ? check.reason === 'poor'
      ? `Needs ${selected.price - balance} more Sparks`
      : check.reason === 'stage'
        ? `Unlocks at the ${STAGES[selected.minStage ?? 0].name} stage`
        : ''
    : '';

  const pick = (item: Item) => {
    setMessage('');
    setPreview((p) => ({ ...p, [slot]: item.id }));
  };

  const act = () => {
    if (owned) {
      wearItem(slot, selected.id);
      setPreview((p) => {
        const { [slot]: _removed, ...rest } = p;
        return rest;
      });
      haptic('success');
    } else {
      const res = buyItem(selected.id);
      if (res.ok) {
        haptic('success');
        setPreview((p) => {
          const { [slot]: _removed, ...rest } = p;
          return rest;
        });
      }
    }
  };

  return (
    <Screen edges={['top']}>
      <TopBar title="Wardrobe" right={<Text style={[type.body, { color: t.text, fontWeight: '900' }]}>✨ {balance}</Text>} />

      <Card style={{ alignItems: 'center', gap: space.sm }}>
        <EchoAvatar
          size={190}
          skin={e.echo?.skin ?? 1}
          hair={e.echo?.hair ?? 0}
          stage={e.stage.index}
          mood={e.mood}
          outfit={shown}
          accent={e.accent}
        />
        <Muted>{e.echo ? `${e.echo.name} is trying on: ${selected.name}` : selected.name}</Muted>
      </Card>

      <View style={styles.tabs}>
        {SLOTS.map((s) => (
          <Chip key={s.id} label={`${s.icon} ${s.label}`} selected={slot === s.id} onPress={() => setSlot(s.id)} />
        ))}
      </View>

      <View style={styles.grid}>
        {items.map((item) => {
          const has = isOwned(profile, item);
          const on = worn[slot] === item.id;
          const sel = selectedId === item.id;
          return (
            <Squish
              key={item.id}
              hapticKind="select"
              onPress={() => pick(item)}
              containerStyle={{ width: '47.5%' }}
              style={[
                styles.item,
                { backgroundColor: t.surface, borderColor: sel ? t.accent : t.border },
              ]}
              accessibilityLabel={item.name}
            >
              <View style={[styles.swatch, { backgroundColor: item.color }]}>
                {item.color2 ? <View style={[styles.swatchHalf, { backgroundColor: item.color2 }]} /> : null}
                <Text style={{ fontSize: 22 }}>{SLOTS.find((s) => s.id === item.slot)!.icon}</Text>
              </View>
              <Text style={[type.small, { color: t.text, fontWeight: '800' }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[type.tiny, { color: on ? t.success : has ? t.textMuted : t.accent, letterSpacing: 0 }]}>
                {on ? 'Wearing' : has ? 'Owned' : `✨ ${item.price}`}
              </Text>
            </Squish>
          );
        })}
      </View>

      {message ? <Muted style={{ color: t.danger }}>{message}</Muted> : null}
      <BounceButton
        label={
          owned
            ? isWorn
              ? 'Wearing'
              : selected.price === 0 && selected.id.endsWith('-none')
                ? 'Take off'
                : 'Wear'
            : `Buy for ✨ ${selected.price}`
        }
        size="lg"
        disabled={owned ? isWorn : !check.ok}
        onPress={act}
      />
      {reason ? <Muted style={{ textAlign: 'center' }}>{reason}</Muted> : null}

      {waiting > 0 ? (
        <Card style={{ backgroundColor: t.dark ? tint(t.accent, -0.6) : t.accentSoft }}>
          <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>🛡️ {waiting} Sparks are waiting for proof</Text>
          <Muted>Add proof to your recent logs to release them.</Muted>
        </Card>
      ) : null}
      <Muted style={{ textAlign: 'center', paddingBottom: space.xl }}>
        These are placeholder looks. Echo's final art arrives later, and everything you own comes with you.
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  item: { borderWidth: 2, borderRadius: radius.md, padding: space.md, gap: 6 },
  swatch: { height: 64, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  swatchHalf: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', opacity: 0.9 },
});
