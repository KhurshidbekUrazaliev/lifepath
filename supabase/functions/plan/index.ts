// Supabase Edge Function: "plan". Turns a task and your habits into a schedule of study/workout sessions.
//
// Deploy: supabase functions deploy plan        (or paste into Dashboard → Edge Functions → Deploy a new function)
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      (optional: PLAN_MODEL=<model id>)
//
// Safety: needs a signed-in user with an active Plus entitlement, and is limited to 20 plans per day.
// The app also re-validates whatever comes back, so a bad answer can never put junk in the calendar.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const DAILY_LIMIT = 20;
const MODEL = Deno.env.get('PLAN_MODEL') ?? 'claude-sonnet-5-5';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SYSTEM = `You plan sessions for a personal progress tracker.
Given one task, the person's recent activity and their preferences, reply with ONLY a JSON array of planned sessions:
[{"day":"YYYY-MM-DD","time":"HH:MM" or null,"note":"short, specific, under 100 characters"}]
Rules:
- Days must be after "today", on or before the task deadline (if any) and within the planning window.
- At most one session per day, and no more than the requested days per week.
- Size sessions from the person's real pace; make the plan finish on time when a deadline exists.
- Prefer a rest day between hard sessions. Keep notes concrete (what to read, practice or do).
- Never include anything except the JSON array.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  // Plus only.
  const { data: ent } = await asUser.from('entitlements').select('plan,expires_at').eq('user_id', user.id).maybeSingle();
  const plus = ent?.plan === 'plus' && (!ent.expires_at || Date.parse(ent.expires_at) > Date.now());
  if (!plus) return json({ error: 'plus_required' }, 402);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!body?.task || JSON.stringify(body).length > 12_000) return json({ error: 'bad_request' }, 400);

  // Daily limit, kept with the service role so people cannot reset it.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const day = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin.from('ai_usage').select('calls').eq('user_id', user.id).eq('day', day).maybeSingle();
  if ((usage?.calls ?? 0) >= DAILY_LIMIT) return json({ error: 'daily_limit' }, 429);
  await admin.from('ai_usage').upsert({ user_id: user.id, day, calls: (usage?.calls ?? 0) + 1 }, { onConflict: 'user_id,day' });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'not_configured' }, 503);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(body) }],
    }),
  });
  if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);

  const out = await res.json();
  const text: string = (out?.content ?? []).map((c: any) => c?.text ?? '').join('');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) return json({ error: 'bad_answer' }, 502);
  try {
    return json({ sessions: JSON.parse(text.slice(start, end + 1)) });
  } catch {
    return json({ error: 'bad_answer' }, 502);
  }
});
