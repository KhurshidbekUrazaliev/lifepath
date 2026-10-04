import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

/** Springy horizontal progress bar. */
export function ProgressBar({ ratio, color, height = 12 }: { ratio: number; color: string; height?: number }) {
  const t = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, ratio));

  useEffect(() => {
    Animated.spring(anim, { toValue: clamped, useNativeDriver: false, speed: 8, bounciness: 8 }).start();
  }, [clamped, anim]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <View style={[styles.track, { height, borderRadius: height, backgroundColor: t.track }]}>
      <Animated.View style={[styles.fill, { width, backgroundColor: color, borderRadius: height }]}>
        {/* highlight strip gives the bar a soft glossy top */}
        <View style={[styles.gloss, { height: Math.max(2, height / 4), borderRadius: height, top: height / 5 }]} />
      </Animated.View>
    </View>
  );
}

/** Animated progress ring drawn with SVG. */
export function ProgressRing({
  ratio,
  color,
  size = 64,
  stroke = 8,
  children,
}: {
  ratio: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setShown(value));
    Animated.timing(anim, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [clamped, anim]);

  const offset = c * (1 - Math.max(0, Math.min(1, shown)));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', overflow: 'hidden' },
  gloss: { position: 'absolute', left: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.35)' },
});
