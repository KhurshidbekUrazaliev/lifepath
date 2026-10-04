import React from 'react';
import {
  Platform, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cardShadow, radius, space, tint, type, useTheme } from '../theme';
import { Squish } from './BounceButton';

/** Scrollable screen with safe areas and a centered column on wide (web) screens. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const inner = <View style={[styles.column, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface }, cardShadow(t), style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[type.heading, { color: t.text }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: any }) {
  const t = useTheme();
  return <Text style={[type.small, { color: t.textMuted }, style]}>{children}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const t = useTheme();
  const c = color ?? t.accent;
  return (
    <Squish
      onPress={onPress}
      hapticKind="select"
      style={[
        styles.chip,
        {
          backgroundColor: selected ? c : t.surfaceAlt,
          borderColor: selected ? c : t.border,
        },
      ]}
    >
      <Text style={[type.small, { fontWeight: '700', color: selected ? '#fff' : t.text }]}>{label}</Text>
    </Squish>
  );
}

export function Field(props: TextInputProps & { label?: string }) {
  const t = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={[type.tiny, { color: t.textMuted, textTransform: 'uppercase' }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={t.textMuted}
        {...rest}
        style={[
          styles.input,
          { backgroundColor: t.surface, color: t.text, borderColor: t.border },
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          style,
        ]}
      />
    </View>
  );
}

export function TopBar({ title, right, color }: { title?: string; right?: React.ReactNode; color?: string }) {
  const t = useTheme();
  const fg = color ?? t.text;
  return (
    <View style={styles.topBar}>
      <Squish
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={[styles.iconBtn, { backgroundColor: color ? 'rgba(255,255,255,0.22)' : t.surface }]}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color={fg} />
      </Squish>
      {title ? (
        <Text numberOfLines={1} style={[type.heading, { color: fg, flex: 1, textAlign: 'center' }]}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function IconButton({
  name,
  onPress,
  color,
  bg,
  label,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  bg?: string;
  label: string;
}) {
  const t = useTheme();
  return (
    <Squish onPress={onPress} accessibilityLabel={label} style={[styles.iconBtn, { backgroundColor: bg ?? t.surface }]}>
      <Ionicons name={name} size={20} color={color ?? t.text} />
    </Squish>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: string; title: string; body: string; children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.empty, { borderColor: t.border }]}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Text style={[type.heading, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[type.body, { color: t.textMuted, textAlign: 'center' }]}>{body}</Text>
      {children}
    </View>
  );
}

export function Pill({ text, color, bg }: { text: string; color: string; bg?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? (t.dark ? tint(color, -0.65) : tint(color, 0.85)) }]}>
      <Text style={[type.tiny, { color: t.dark ? tint(color, 0.3) : tint(color, -0.3) }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 120 },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space.lg, gap: space.lg },
  card: { borderRadius: radius.lg, padding: space.lg },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '600' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.sm, padding: space.xl, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
