import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { Task } from '../lib/types';
import { computeProgress, formatAmount } from '../lib/progress';
import { quickAmounts } from '../lib/templates';
import { xpForLog } from '../lib/gamify';
import { EVIDENCE_WINDOW_DAYS, cleanEvidence, evidenceBonus } from '../lib/evidence';
import { EvidenceFields } from './Evidence';
import { radius, space, tint, type, useTheme } from '../theme';
import { BounceButton, Squish } from './BounceButton';
import { Chip, Field } from './ui';
import { haptic } from './feedback';

export function LogSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const t = useTheme();
  const folder = useStore((s) => (task ? s.folders.find((f) => f.id === task.folderId) : undefined));
  const entries = useStore((s) => s.entries);
  const streak = useStore((s) => s.profile.streak.current);
  const logProgress = useStore((s) => s.logProgress);
  const toggleMilestone = useStore((s) => s.toggleMilestone);
  // Re-read the live task so milestone ticks update inside the sheet.
  const live = useStore((s) => (task ? s.tasks.find((x) => x.id === task.id) : undefined));

  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [proofOpen, setProofOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  useEffect(() => {
    if (task) {
      const q = quickAmounts(task.progressType, task.target);
      setAmount(task.progressType === 'sessions' ? 1 : q[Math.min(1, q.length - 1)]);
      setNote('');
      setProofOpen(false);
      setSummary('');
      setUrl('');
      setPhotoUri(undefined);
    }
    // Reset only when a different task is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  if (!task || !folder || !live) return null;
  const color = folder.color;
  const p = computeProgress(live, entries);
  const quick = quickAmounts(live.progressType, live.target);
  const step = live.progressType === 'time' ? 5 : quick[0];

  const proof = proofOpen ? { summary, url, photoUri } : undefined;
  const hasProof = !!cleanEvidence(proof);
  const baseXp = xpForLog(live, amount, streak);
  const shownXp = baseXp + (hasProof ? evidenceBonus(baseXp) : 0);

  const submit = () => {
    const res = logProgress(live.id, amount, note, proof);
    if (res) {
      haptic('success');
      onClose();
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: t.bg }]}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <View style={styles.header}>
            <Text style={{ fontSize: 28 }}>{folder.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.title, { color: t.text }]} numberOfLines={1}>{live.title}</Text>
              <Text style={[type.small, { color: t.textMuted }]}>{p.label}</Text>
            </View>
          </View>

          {live.progressType === 'milestones' ? (
            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: space.sm }}>
              {live.milestones.length === 0 ? (
                <Text style={[type.body, { color: t.textMuted }]}>No milestones yet. Add some on the task page.</Text>
              ) : null}
              {live.milestones.map((m) => (
                <Squish
                  key={m.id}
                  onPress={() => {
                    toggleMilestone(live.id, m.id);
                    if (!m.done) haptic('success');
                  }}
                  style={[styles.msRow, { backgroundColor: m.done ? (t.dark ? tint(color, -0.6) : tint(color, 0.85)) : t.surface, borderColor: m.done ? color : t.border }]}
                >
                  <Ionicons name={m.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={m.done ? color : t.textMuted} />
                  <Text style={[type.body, { color: t.text, flex: 1, textDecorationLine: m.done ? 'line-through' : 'none' }]}>{m.title}</Text>
                </Squish>
              ))}
              <BounceButton label="Done" variant="soft" color={color} onPress={onClose} style={{ marginTop: space.sm }} />
            </ScrollView>
          ) : (
            <View style={{ gap: space.lg }}>
              {live.progressType !== 'sessions' ? (
                <>
                  <View style={styles.stepper}>
                    <Squish
                      onPress={() => setAmount((a) => Math.max(0, a - step))}
                      style={[styles.stepBtn, { backgroundColor: t.surface }]}
                      accessibilityLabel="Decrease"
                    >
                      <Ionicons name="remove" size={28} color={t.text} />
                    </Squish>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={[styles.big, { color }]}>{amount.toLocaleString()}</Text>
                      <Text style={[type.small, { color: t.textMuted }]}>
                        {live.progressType === 'time' ? 'minutes' : live.unit}
                      </Text>
                    </View>
                    <Squish
                      onPress={() => setAmount((a) => a + step)}
                      style={[styles.stepBtn, { backgroundColor: t.surface }]}
                      accessibilityLabel="Increase"
                    >
                      <Ionicons name="add" size={28} color={t.text} />
                    </Squish>
                  </View>
                  <View style={styles.chips}>
                    {quick.map((q) => (
                      <Chip key={q} label={formatAmount(q, live.unit, live.progressType)} selected={amount === q} color={color} onPress={() => setAmount(q)} />
                    ))}
                  </View>
                  <Field
                    placeholder="Or type an exact amount"
                    keyboardType="numeric"
                    value={amount ? String(amount) : ''}
                    onChangeText={(v) => setAmount(Math.max(0, Number(v.replace(/[^0-9.]/g, '')) || 0))}
                  />
                </>
              ) : (
                <View style={[styles.sessionBox, { backgroundColor: t.dark ? tint(color, -0.65) : tint(color, 0.88) }]}>
                  <Text style={{ fontSize: 40 }}>{folder.icon}</Text>
                  <Text style={[type.heading, { color: t.text }]}>Log one session</Text>
                  <Text style={[type.small, { color: t.textMuted }]}>Session {p.done + 1} of {p.total}</Text>
                </View>
              )}

              <Field
                placeholder={live.progressType === 'sessions' ? 'Note: e.g. 3×10 lateral raises, 12 kg' : 'Note (optional): what stood out?'}
                value={note}
                onChangeText={setNote}
                multiline
              />

              <Squish
                hapticKind="select"
                onPress={() => setProofOpen((v) => !v)}
                style={[styles.proofToggle, { backgroundColor: proofOpen ? t.accentSoft : t.surface, borderColor: proofOpen ? t.accent : t.border }]}
                accessibilityLabel="Add proof"
              >
                <Ionicons name={hasProof ? 'shield-checkmark' : 'shield-outline'} size={20} color={hasProof ? t.success : t.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>{hasProof ? 'Proof added' : 'Add proof'}</Text>
                  <Text style={[type.small, { color: t.textMuted }]}>
                    {hasProof ? 'Bonus XP now, and your Sparks are released' : 'Bonus XP, and your Sparks are released right away'}
                  </Text>
                </View>
                <Ionicons name={proofOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.textMuted} />
              </Squish>
              {proofOpen ? <EvidenceFields summary={summary} url={url} photoUri={photoUri} onSummary={setSummary} onUrl={setUrl} onPhoto={setPhotoUri} /> : null}

              <BounceButton
                label={`Log it  ·  +${shownXp} XP`}
                color={color}
                size="lg"
                disabled={amount <= 0}
                onPress={submit}
              />
              {!hasProof ? (
                <Text style={[type.small, { color: t.textMuted, textAlign: 'center', marginTop: -space.sm }]}>
                  Skip proof and your Sparks wait up to {EVIDENCE_WINDOW_DAYS} days for it. XP counts right away.
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 52, fontWeight: '900', letterSpacing: -1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  sessionBox: { alignItems: 'center', gap: 4, padding: space.xl, borderRadius: radius.lg },
  proofToggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5 },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: 1.5 },
});
