import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { radius, tint, useTheme } from '../theme';
import { haptic, NATIVE_DRIVER } from './feedback';

/** Any pressable surface that squishes on press and springs back. */
export function Squish({
  children,
  onPress,
  onLongPress,
  style,
  containerStyle,
  disabled,
  scaleTo = 0.95,
  hapticKind = 'light',
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Layout style for the outer touch target (flex sizing in grids). */
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
  hapticKind?: 'light' | 'medium' | 'select' | 'none';
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number, bouncy: boolean) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: NATIVE_DRIVER,
      speed: bouncy ? 14 : 40,
      bounciness: bouncy ? 14 : 0,
    }).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={containerStyle}
      onPressIn={() => to(scaleTo, false)}
      onPressOut={() => to(1, true)}
      onPress={() => {
        if (hapticKind !== 'none') haptic(hapticKind);
        onPress?.();
      }}
      onLongPress={onLongPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.45 }]}>{children}</Animated.View>
    </Pressable>
  );
}

type Variant = 'primary' | 'soft' | 'ghost' | 'danger';

export function BounceButton({
  label,
  onPress,
  variant = 'primary',
  color,
  icon,
  disabled,
  style,
  size = 'md',
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  color?: string;
  icon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
}) {
  const t = useTheme();
  const base = color ?? t.accent;
  const bg =
    variant === 'primary' ? base
    : variant === 'danger' ? t.danger
    : variant === 'soft' ? (t.dark ? tint(base, -0.6) : tint(base, 0.85))
    : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : t.dark ? tint(base, 0.35) : tint(base, -0.25);
  const pad = size === 'lg' ? 18 : size === 'sm' ? 9 : 14;
  const fontSize = size === 'lg' ? 17 : size === 'sm' ? 14 : 16;

  return (
    <Squish
      onPress={onPress}
      disabled={disabled}
      hapticKind={variant === 'primary' ? 'medium' : 'light'}
      accessibilityLabel={label}
      style={[
        styles.btn,
        { backgroundColor: bg, paddingVertical: pad, paddingHorizontal: pad + 8 },
        variant === 'primary' && {
          shadowColor: base, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg, fontSize }]}>
        {icon ? `${icon}  ` : ''}
        {label}
      </Text>
    </Squish>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '800', letterSpacing: 0.2 },
});
