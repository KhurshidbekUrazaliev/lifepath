import { supabase } from './supabase';
import { PublicProfile, RankRow } from './lib/rankings';

export interface BoardQuery {
  sinceMs: number | null; // null = all time
  country?: string | null;
  city?: string | null;
}

export async function fetchLeaderboard(q: BoardQuery): Promise<RankRow[]> {
  const { data, error } = await supabase.rpc('leaderboard', {
    p_since_ms: q.sinceMs,
    p_country: q.country ?? null,
    p_city: q.city ?? null,
    p_limit: 50,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    rank: Number(r.rank),
    display_name: String(r.display_name),
    country: r.country ?? null,
    city: r.city ?? null,
    xp: Number(r.xp),
    is_me: !!r.is_me,
  }));
}

export async function loadPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('display_name,country,city,opted_in')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as PublicProfile | null) ?? null;
}

export async function savePublicProfile(userId: string, p: PublicProfile): Promise<void> {
  const { error } = await supabase
    .from('public_profiles')
    .upsert({ user_id: userId, ...p, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
