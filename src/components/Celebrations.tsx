import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Celebration, useStore } from '../store';
import { PALETTE } from '../lib/templates';
import { radius, space, type, useTheme } from '../theme';
import { BounceButton } from './BounceButton';
import { haptic, NATIVE_DRIVER } from './feedback';

/** Reads the celebration queue and shows XP toasts and milestone moments one at a time. */
export function Celebrations() {
  const queue = useStore((s) => s.celebrations);
  const dismiss = useStore((s) => s.dismissCelebration);
  const current = queue[0];
  if (!current) return null;
  if (current.kind === 'xp') return <XpToast key={current.id} item={current} onDone={() => dismiss(current.id)} />;
  return <BigMoment key={current.id} item={current} onDone={() => dismiss(current.id)} />;
}

function XpToast({ item, onDone }: { item: Celebration; onDone: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 14, bounciness: 12 }),
      Animated.delay(900),
      Animated.timing(anim, { toValue: 2, duration: 250, useNativeDriver: NATIVE_DRIVER }),
    ]).start(() => done.current());
  }, [anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [-40, 0, -30] });
  const opacity = anim.interpolate({ inputRange: [0, 0.6, 1, 2], outputRange: [0, 1, 1, 0] });
  const scale = anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.7, 1, 0.9] });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: insets.top + 12 }]}>
      <Animated.View style={[styles.toast, { backgroundColor: t.text, opacity, transform: [{ translateY }, { scale }] }]}>
        <Text style={{ fontSize: 18 }}>⚡</Text>
        <Text style={[type.heading, { color: t.bg }]}>{item.title}</Text>
      </Animated.View>
    </View>
  );
}

function BigMoment({ item, onDone }: { item: Celebration; onDone: () => void }) {
  const t = useTheme();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptic('success');
    Animated.spring(pop, { toValue: 1, useNativeDriver: NATIVE_DRIVER, speed: 10, bounciness: 16 }).start();
  }, [pop]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <Confetti />
        <Animated.View style={[styles.card, { backgroundColor: t.surface, transform: [{ scale }], opacity: pop }]}>
          <Text style={{ fontSize: 64 }}>{item.icon ?? '🎉'}</Text>
          <Text style={[type.tiny, { color: t.textMuted, textTransform: 'uppercase' }]}>
            {item.kind === 'achievement' ? 'Achievement unlocked' : item.kind === 'levelup' ? 'Level up' : 'Task complete'}
          </Text>
          <Text style={[type.title, { color: t.text, textAlign: 'center' }]}>{item.title}</Text>
          {item.subtitle ? <Text style={[type.body, { color: t.textMuted, textAlign: 'center' }]}>{item.subtitle}</Text> : null}
          {item.xp ? <Text style={[type.heading, { color: t.accent }]}>+{item.xp} XP</Text> : null}
          <BounceButton label="Nice!" onPress={onDone} style={{ alignSelf: 'stretch', marginTop: space.sm }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

function Confetti({ count = 40 }: { count?: number }) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 160,
        delay: Math.random() * 300,
        size: 6 + Math.random() * 8,
        color: PALETTE[i % PALETTE.length],
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
        round: Math.random() > 0.6,
        anim: new Animated.Value(0),
      })),
    [count, width],
  );

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 1800 + Math.random() * 800,
          delay: p.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <Animated.View
          key={p.key}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? p.size : 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.85] }) },
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: radius.pill, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,8,20,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { width: '100%', maxWidth: 360, borderRadius: 32, padding: space.xl, alignItems: 'center', gap: space.sm },
});
