import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { Entry, Evidence } from '../lib/types';
import { photosAvailable, pickPhoto, useCloudPhotoUrl } from '../photos';
import { EVIDENCE_WINDOW_DAYS, MIN_SUMMARY_CHARS, cleanEvidence, evidenceBonus } from '../lib/evidence';
import { sparksFor } from '../lib/gamify';
import { radius, space, type, useTheme } from '../theme';
import { BounceButton, Squish } from './BounceButton';
import { Field } from './ui';
import { haptic } from './feedback';

/** The proof fields: a photo, a short summary in your own words, and/or a link. */
export function EvidenceFields({
  summary,
  url,
  photoUri,
  onSummary,
  onUrl,
  onPhoto,
}: {
  summary: string;
  url: string;
  photoUri?: string;
  onSummary: (v: string) => void;
  onUrl: (v: string) => void;
  onPhoto: (uri?: string) => void;
}) {
  const t = useTheme();
  const [photoError, setPhotoError] = useState('');
  const len = summary.trim().length;

  const pick = async (source: 'camera' | 'library') => {
    setPhotoError('');
    const res = await pickPhoto(source);
    if ('uri' in res) {
      haptic('success');
      onPhoto(res.uri);
    } else if ('error' in res) {
      setPhotoError(res.error);
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      {photosAvailable() ? (
        photoUri ? (
          <View style={styles.photoRow}>
            <Image source={{ uri: photoUri }} style={styles.thumb} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[type.body, { color: t.success, fontWeight: '800' }]}>✓ Photo added</Text>
              <BounceButton label="Remove photo" variant="ghost" size="sm" onPress={() => onPhoto(undefined)} />
            </View>
          </View>
        ) : (
          <View style={styles.photoRow}>
            <Squish onPress={() => pick('camera')} style={[styles.photoBtn, { backgroundColor: t.surface, borderColor: t.border }]} containerStyle={{ flex: 1 }} accessibilityLabel="Take a photo">
              <Ionicons name="camera-outline" size={20} color={t.accent} />
              <Text style={[type.small, { color: t.text, fontWeight: '800' }]}>Take photo</Text>
            </Squish>
            <Squish onPress={() => pick('library')} style={[styles.photoBtn, { backgroundColor: t.surface, borderColor: t.border }]} containerStyle={{ flex: 1 }} accessibilityLabel="Choose a photo">
              <Ionicons name="image-outline" size={20} color={t.accent} />
              <Text style={[type.small, { color: t.text, fontWeight: '800' }]}>Choose photo</Text>
            </Squish>
          </View>
        )
      ) : null}
      {photoError ? <Text style={[type.small, { color: t.danger }]}>{photoError}</Text> : null}
      <Field
        placeholder="What did you do or learn? (a sentence or two)"
        value={summary}
        onChangeText={onSummary}
        multiline
      />
      <Text style={[type.tiny, { color: len >= MIN_SUMMARY_CHARS ? t.success : t.textMuted }]}>
        {len >= MIN_SUMMARY_CHARS ? '✓ That counts as proof' : `A photo, a link, or ${MIN_SUMMARY_CHARS - len} more characters counts as proof`}
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

/** A proof photo in a history row: the file on this device, or a temporary cloud link on other devices. */
export function ProofPhoto({ evidence }: { evidence: Evidence }) {
  const [localFailed, setLocalFailed] = useState(false);
  const cloud = useCloudPhotoUrl(evidence.photoPath, !evidence.photoUri || localFailed);
  const uri = evidence.photoUri && !localFailed ? evidence.photoUri : cloud;
  if (!uri) return null;
  return <Image source={{ uri }} style={styles.proofPhoto} onError={() => setLocalFailed(true)} resizeMode="cover" />;
}

/** Bottom sheet for adding proof to a log that was saved with one tap. */
export function ProofSheet({ entry, color, onClose }: { entry: Entry | null; color: string; onClose: () => void }) {
  const t = useTheme();
  const attachEvidence = useStore((s) => s.attachEvidence);
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary('');
    setUrl('');
    setPhotoUri(undefined);
    setError('');
  }, [entry?.id]);

  if (!entry) return null;
  const valid = !!cleanEvidence({ summary, url, photoUri });
  const bonus = evidenceBonus(entry.xp);
  const sparks = sparksFor(entry.xp + bonus);

  const submit = () => {
    const res = attachEvidence(entry.id, { summary, url, photoUri });
    if (res.ok) {
      haptic('success');
      onClose();
    } else {
      setError(
        res.reason === 'expired'
          ? `Proof can only be added within ${EVIDENCE_WINDOW_DAYS} days of the log.`
          : res.reason === 'invalid'
            ? 'Add a photo, a valid link, or at least a short sentence.'
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
          <EvidenceFields summary={summary} url={url} photoUri={photoUri} onSummary={setSummary} onUrl={setUrl} onPhoto={setPhotoUri} />
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
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5 },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  proofPhoto: { width: 120, height: 120, borderRadius: radius.md, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
});
