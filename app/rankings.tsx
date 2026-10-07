import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/sync';
import { useStore } from '../src/store';
import { fetchLeaderboard, loadPublicProfile, savePublicProfile } from '../src/rankingsApi';
import {
  COUNTRIES, PublicProfile, RankRow, cleanDisplayName, countryName, daysLeftInWeek, flag, rankMedal, weekStartMs,
} from '../src/lib/rankings';
import { radius, space, tint, type, useTheme } from '../src/theme';
import { Card, Chip, EmptyState, Field, Muted, Screen, SectionTitle, TopBar } from '../src/components/ui';
import { BounceButton, Squish } from '../src/components/BounceButton';
import { haptic } from '../src/components/feedback';

type Period = 'week' | 'all';
type Place = 'global' | 'country' | 'city';

export default function RankingsScreen() {
  const t = useTheme();
  const userId = useAuth((s) => s.userId);
  const echoName = useStore((s) => s.profile.echo?.name);
  const myName = useStore((s) => s.profile.name);

  const [saved, setSaved] = useState<PublicProfile | null>(null);
  const [loadedProfile, setLoadedProfile] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [optedIn, setOptedIn] = useState(false);
  const [pickCountry, setPickCountry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [period, setPeriod] = useState<Period>('week');
  const [place, setPlace] = useState<Place>('global');
  const [rows, setRows] = useState<RankRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load my public profile once signed in.
  useEffect(() => {
    if (!userId) return;
    loadPublicProfile(userId)
      .then((p) => {
        setSaved(p);
        setName(p?.display_name ?? myName ?? echoName ?? '');
        setCountry(p?.country ?? null);
        setCity(p?.city ?? '');
        setOptedIn(!!p?.opted_in);
      })
      .catch((e) => setFormError(String(e?.message ?? e)))
      .finally(() => setLoadedProfile(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchLeaderboard({
        sinceMs: period === 'week' ? weekStartMs() : null,
        country: place === 'country' || place === 'city' ? saved?.country : null,
        city: place === 'city' ? saved?.city : null,
      });
      setRows(data);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      setError(
        /leaderboard|function|schema cache/i.test(msg)
          ? 'Rankings are not set up on the server yet (run supabase/migrations/0003_rankings.sql).'
          : /network|fetch/i.test(msg)
            ? "Can't reach the server. Check your internet connection."
            : msg,
      );
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [userId, period, place, saved]);

  useEffect(() => {
    if (loadedProfile) refresh();
  }, [loadedProfile, refresh]);

  const save = async () => {
    if (!userId) return;
    const display = cleanDisplayName(name);
    if (!display) {
      setFormError('Choose a name others will see.');
      return;
    }
    setSaving(true);
    setFormError('');
    const next: PublicProfile = { display_name: display, country, city: city.trim() || null, opted_in: optedIn };
    try {
      await savePublicProfile(userId, next);
      setSaved(next);
      haptic('success');
    } catch (e: any) {
      setFormError(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <Screen edges={['top']}>
        <TopBar title="Rankings" />
        <EmptyState
          icon="🏆"
          title="Sign in to see rankings"
          body="Rankings use your synced logs, so you need to sign in with Google first. You can do that on the You tab."
        >
          <BounceButton label="Go to You tab" onPress={() => router.replace('/me')} />
        </EmptyState>
      </Screen>
    );
  }

  const dirty =
    !saved ||
    saved.display_name !== cleanDisplayName(name) ||
    saved.country !== country ||
    (saved.city ?? '') !== city.trim() ||
    saved.opted_in !== optedIn;

  const places: { id: Place; label: string; enabled: boolean }[] = [
    { id: 'global', label: '🌍 Global', enabled: true },
    { id: 'country', label: `${flag(saved?.country)} My country`, enabled: !!saved?.country },
    { id: 'city', label: '📍 My city', enabled: !!saved?.country && !!saved?.city },
  ];

  return (
    <Screen edges={['top']}>
      <TopBar title="Rankings" />

      <View style={styles.row}>
        <Chip label="This week" selected={period === 'week'} onPress={() => setPeriod('week')} />
        <Chip label="All time" selected={period === 'all'} onPress={() => setPeriod('all')} />
      </View>
      <View style={styles.row}>
        {places.map((p) => (
          <Chip
            key={p.id}
            label={p.label}
            selected={place === p.id}
            onPress={() => (p.enabled ? setPlace(p.id) : setFormError('Add your country (and city) below to unlock local rankings.'))}
          />
        ))}
      </View>
      {period === 'week' ? <Muted>{daysLeftInWeek()} {daysLeftInWeek() === 1 ? 'day' : 'days'} left this week (weeks start Monday, UTC)</Muted> : null}

      {loading && !rows ? <ActivityIndicator color={t.accent} style={{ marginVertical: space.xl }} /> : null}
      {error ? <Card><Text style={[type.body, { color: t.danger }]}>{error}</Text></Card> : null}

      {rows && rows.length === 0 && !error ? (
        <EmptyState
          icon="🌱"
          title="No one here yet"
          body={
            saved?.opted_in
              ? 'Rankings count logs that have proof. Add proof to a log and you will show up here.'
              : 'Turn on "Show me on rankings" below, and add proof to your logs, to be the first.'
          }
        />
      ) : null}

      {rows && rows.length > 0 ? (
        <Card style={{ padding: space.sm }}>
          {rows.map((r, i) => (
            <View
              key={`${r.rank}-${r.display_name}-${i}`}
              style={[
                styles.rankRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: t.border },
                r.is_me && { backgroundColor: t.dark ? tint(t.accent, -0.6) : t.accentSoft, borderRadius: radius.md },
              ]}
            >
              <Text style={[type.heading, { color: t.text, width: 44, textAlign: 'center' }]}>{rankMedal(r.rank) || r.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: t.text, fontWeight: '800' }]} numberOfLines={1}>
                  {r.display_name}{r.is_me ? '  (you)' : ''}
                </Text>
                <Muted>{flag(r.country)} {[r.city, countryName(r.country)].filter(Boolean).join(', ') || 'Somewhere on Earth'}</Muted>
              </View>
              <Text style={[type.body, { color: t.accent, fontWeight: '900' }]}>{r.xp.toLocaleString()} XP</Text>
            </View>
          ))}
        </Card>
      ) : null}
      <Muted>Only logs with proof count. A one-tap log never ranks.</Muted>

      <SectionTitle>Your ranking profile</SectionTitle>
      <Card style={{ gap: space.lg }}>
        <View style={styles.between}>
          <View style={{ flex: 1, paddingRight: space.md }}>
            <Text style={[type.body, { color: t.text, fontWeight: '800' }]}>Show me on rankings</Text>
            <Muted>Off by default. Others see only your display name, country, city and proven XP.</Muted>
          </View>
          <Switch value={optedIn} onValueChange={setOptedIn} trackColor={{ true: t.accent }} />
        </View>
        <Field label="Display name (public)" placeholder="e.g. Faris" value={name} onChangeText={setName} maxLength={24} />
        <View style={{ gap: 6 }}>
          <Text style={[type.tiny, { color: t.textMuted, textTransform: 'uppercase' }]}>Country (optional)</Text>
          <Squish onPress={() => setPickCountry(true)} style={[styles.select, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[type.body, { color: country ? t.text : t.textMuted, fontWeight: '600' }]}>
              {country ? `${flag(country)}  ${countryName(country) || country}` : 'Choose a country'}
            </Text>
          </Squish>
        </View>
        <Field label="City (optional)" placeholder="e.g. Seoul" value={city} onChangeText={setCity} maxLength={40} />
        {formError ? <Text style={[type.small, { color: t.danger }]}>{formError}</Text> : null}
        <BounceButton label={saving ? 'Saving…' : 'Save'} disabled={saving || !dirty} onPress={save} />
      </Card>

      <Modal visible={pickCountry} transparent animationType="slide" onRequestClose={() => setPickCountry(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={styles.backdrop} onPress={() => setPickCountry(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: t.bg }]}>
            <Text style={[type.title, { color: t.text }]}>Choose a country</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              <Squish onPress={() => { setCountry(null); setPickCountry(false); }} style={styles.countryRow}>
                <Text style={[type.body, { color: t.textMuted }]}>None</Text>
              </Squish>
              {COUNTRIES.map((c) => (
                <Squish key={c.code} hapticKind="select" onPress={() => { setCountry(c.code); setPickCountry(false); }} style={styles.countryRow}>
                  <Text style={[type.body, { color: t.text, fontWeight: country === c.code ? '900' : '600' }]}>
                    {flag(c.code)}  {c.name}
                  </Text>
                </Squish>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <View style={{ height: space.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  select: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14 },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,20,0.45)' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: space.xl, gap: space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  countryRow: { paddingVertical: 12 },
});
