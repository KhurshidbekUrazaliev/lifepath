import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { Entry } from '../lib/types';
import { EVIDENCE_WINDOW_DAYS, MIN_SUMMARY_CHARS, cleanEvidence, evidenceBonus } from '../lib/evidence';
import { sparksFor } from '../lib/gamify';
import { radius, space, type, useTheme } from '../theme';
import { BounceButton } from './BounceButton';
import { Field } from './ui';
import { haptic } from './feedback';

/** The two proof fields: a short summary in your own words and/or a link. */
export function EvidenceFields({
  summary,
  url,
  onSummary,
  onUrl,
}: {
  summary: string;
  url: string;
  onSummary: (v: string) => void;
  onUrl: (v: string) => void;
}) {
  const t = useTheme();
  const len = summary.trim().length;
  return (
    <View style={{ gap: space.sm }}>
      <Field
        placeholder="What did you do or learn? (a sentence or two)"
        value={summary}
        onChangeText={onSummary}
        multiline
      />
      <Text style={[type.tiny, { color: len >= MIN_SUMMARY_CHARS ? t.success : t.textMuted }]}>
        {len >= MIN_SUMMARY_CHARS ? '✓ That counts as proof' : `${MIN_SUMMARY_CHARS - len} more characters, or add a link instead`}
      </Text>
      <Field
        placeholder="Link (optional): workout app, lesson page, book page"
        value={url}
        onChangeText={onUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
    </View>
  );
}

/** Bottom sheet for adding proof to a log that was saved with one tap. */
export function ProofSheet({ entry, color, onClose }: { entry: Entry | null; color: string; onClose: () => void }) {
  const t = useTheme();
  const attachEvidence = useStore((s) => s.attachEvidence);
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary('');
    setUrl('');
    setError('');
  }, [entry?.id]);

  if (!entry) return null;
  const valid = !!cleanEvidence({ summary, url });
  const bonus = evidenceBonus(entry.xp);
  const sparks = sparksFor(entry.xp + bonus);

  const submit = () => {
    const res = attachEvidence(entry.id, { summary, url });
    if (res.ok) {
      haptic('success');
      onClose();
    } else {
      setError(
        res.reason === 'expired'
          ? `Proof can only be added within ${EVIDENCE_WINDOW_DAYS} days of the log.`
          : res.reason === 'invalid'
            ? 'Write at least a short sentence or add a valid link.'
            : 'This log can no longer take proof.',
      );
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: t.bg }]}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={[type.title, { color: t.text }]}>Add proof</Text>
          <Text style={[type.body, { color: t.textMuted }]}>
            Show this log really happened and you earn +{bonus} XP and release {sparks} Sparks.
            {entry.note ? `\n\n"${entry.note}"` : ''}
          </Text>
          <EvidenceFields summary={summary} url={url} onSummary={setSummary} onUrl={setUrl} />
          {error ? <Text style={[type.small, { color: t.danger }]}>{error}</Text> : null}
          <BounceButton label={`Add proof  ·  +${bonus} XP`} color={color} size="lg" disabled={!valid} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Small state chip used in history rows. */
export function ProofBadge({ icon, label, color, bg }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[type.tiny, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,20,0.45)' },
  sheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: space.xl, paddingBottom: 40, gap: space.lg,
    width: '100%', maxWidth: 640, alignSelf: 'center',
  },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: -8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
