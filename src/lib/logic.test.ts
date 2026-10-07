// Run with: npx tsx src/lib/logic.test.ts
import assert from 'node:assert/strict';
import { applyActivity, levelInfo, visibleStreak, xpForLevel, xpForLog, streakMultiplier } from './gamify';
import { computeProgress, forecast, formatAmount } from './progress';
import { daysBetween, dayKey } from './dates';
import { Entry, Folder, Plan, Profile, Task } from './types';
import { daysLabel, monthGrid, parseTime } from './calendar';
import { buildSchedule } from './schedule';
import { fromRecordMap, mergeProfiles, planSync, RemoteRecord, stableStringify, toRecordMap } from './syncPlan';
import { canBuy, sparkBalance } from './wardrobe';
import { cleanDisplayName, daysLeftInWeek, flag, rankMedal, weekEndMs, weekStartMs } from './rankings';
import {
  ATTRIBUTES, archetypeFor, attrLevel, computeAttributes, echoLine, echoMood, stageFor, totalPoints,
} from './echo';
import {
  cleanEvidence, daysLeftForProof, evidenceBonus, evidenceState, normalizeUrl, pendingSparks, sparksForAward, sparksGranted,
} from './evidence';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log('  ✓', name);
}

const book: Task = {
  id: 't1', folderId: 'f1', title: 'Sherlock Holmes', progressType: 'units', target: 300, unit: 'pages',
  milestones: [], resources: [], createdAt: 0,
};
const DAY = 86400000;
const now = new Date(2026, 9, 5, 12).getTime();

test('dates: daysBetween across months', () => {
  assert.equal(daysBetween('2026-09-30', '2026-10-01'), 1);
  assert.equal(daysBetween('2026-10-05', '2026-10-05'), 0);
  assert.equal(dayKey(now), '2026-10-05');
});

test('progress: units accumulate and cap at 100%', () => {
  const entries: Entry[] = [
    { id: 'a', taskId: 't1', at: now, amount: 120, xp: 0 },
    { id: 'b', taskId: 't1', at: now, amount: 30, xp: 0 },
    { id: 'c', taskId: 'other', at: now, amount: 999, xp: 0 },
  ];
  const p = computeProgress(book, entries);
  assert.equal(p.done, 150);
  assert.equal(p.ratio, 0.5);
  assert.equal(p.label, '150 / 300 pages');
  const over = computeProgress(book, [{ id: 'x', taskId: 't1', at: now, amount: 400, xp: 0 }]);
  assert.equal(over.ratio, 1);
});

test('progress: milestones', () => {
  const t: Task = { ...book, progressType: 'milestones', milestones: [
    { id: '1', title: 'A', done: true }, { id: '2', title: 'B', done: false },
    { id: '3', title: 'C', done: true }, { id: '4', title: 'D', done: false },
  ] };
  const p = computeProgress(t, []);
  assert.equal(p.ratio, 0.5);
  assert.equal(p.label, '2 / 4 steps');
});

test('progress: forecast finish date from pace', () => {
  const entries: Entry[] = [
    { id: 'a', taskId: 't1', at: now - 9 * DAY, amount: 50, xp: 0 },
    { id: 'b', taskId: 't1', at: now - 1 * DAY, amount: 50, xp: 0 },
  ];
  const f = forecast(book, entries, now)!;
  assert.equal(f.perDay, 10); // 100 pages over 10 days
  assert.equal(Math.round((f.finishAt! - now) / DAY), 20); // 200 remaining at 10/day
});

test('format: time and sessions', () => {
  assert.equal(formatAmount(90, 'min', 'time'), '1h 30m');
  assert.equal(formatAmount(45, 'min', 'time'), '45 min');
  assert.equal(formatAmount(1, '', 'sessions'), '1 session');
});

test('levels: thresholds', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 100);
  assert.equal(xpForLevel(3), 300);
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(450).level, 3);
  assert.equal(levelInfo(450).into, 150);
});

test('xp: consistency beats volume', () => {
  const small = xpForLog(book, 10, 0);
  const huge = xpForLog(book, 300, 0);
  assert.ok(huge <= 20, 'volume bonus is capped');
  assert.ok(small >= 10);
  assert.equal(streakMultiplier(14), 1.2);
  assert.equal(streakMultiplier(100), 1.5);
});

test('streak: consecutive days increment, same day no-op', () => {
  let s = applyActivity({ current: 0, best: 0 }, 0, '2026-10-01');
  assert.equal(s.streak.current, 1);
  s = applyActivity(s.streak, s.freezes, '2026-10-01');
  assert.equal(s.streak.current, 1);
  assert.equal(s.increased, false);
  s = applyActivity(s.streak, s.freezes, '2026-10-02');
  assert.equal(s.streak.current, 2);
});

test('streak: freeze covers exactly one missed day', () => {
  let s = applyActivity({ current: 5, best: 5, lastDay: '2026-10-01' }, 1, '2026-10-03');
  assert.equal(s.streak.current, 6);
  assert.equal(s.usedFreeze, true);
  assert.equal(s.freezes, 0);
  s = applyActivity({ current: 5, best: 5, lastDay: '2026-10-01' }, 1, '2026-10-04');
  assert.equal(s.streak.current, 1, 'two missed days resets');
  assert.equal(s.streak.best, 5);
});

test('streak: earn a freeze every 7 days', () => {
  const s = applyActivity({ current: 6, best: 6, lastDay: '2026-10-01' }, 0, '2026-10-02');
  assert.equal(s.streak.current, 7);
  assert.equal(s.earnedFreeze, true);
  assert.equal(s.freezes, 1);
});

test('streak: visible streak lapses after missed days', () => {
  const st = { current: 4, best: 4, lastDay: '2026-10-01' };
  assert.equal(visibleStreak(st, 0, '2026-10-02'), 4);
  assert.equal(visibleStreak(st, 0, '2026-10-03'), 0);
  assert.equal(visibleStreak(st, 1, '2026-10-03'), 4);
});

// ---------- v0.2: calendar & notification schedule ----------

test('calendar: October 2026 grid is Sunday-first full weeks', () => {
  const g = monthGrid(2026, 9); // Oct 1 2026 is a Thursday
  assert.equal(g[0][0].key, '2026-09-27');
  assert.equal(g[0][4].key, '2026-10-01');
  assert.equal(g[0][4].inMonth, true);
  assert.ok(g.every((w) => w.length === 7));
  assert.equal(g.flat().filter((d) => d.inMonth).length, 31);
});

test('calendar: day labels', () => {
  assert.equal(daysLabel([1, 2, 3, 4, 5, 6, 7]), 'Every day');
  assert.equal(daysLabel([2, 3, 4, 5, 6]), 'Weekdays');
  assert.equal(daysLabel([2, 4, 6]), 'Mon, Wed, Fri');
  assert.deepEqual(parseTime('07:30'), { hour: 7, minute: 30 });
  assert.equal(parseTime('bad'), null);
});

const folder: Folder = { id: 'f1', name: 'Reading', icon: '📚', color: '#000', templateId: 'reading', progressType: 'units', unit: 'pages', createdAt: 0 };
const baseProfile: Profile = {
  name: '', xp: 0, sparks: 0, streak: { current: 3, best: 3, lastDay: '2026-10-04' }, freezes: 0,
  dailyGoalXp: 30, haptics: true, achievements: {}, nudge: { enabled: false, hour: 21, minute: 0 },
};

test('schedule: weekly reminders per selected day, none for finished tasks', () => {
  const tasks: Task[] = [
    { ...book, reminder: { hour: 21, minute: 30, days: [2, 4, 6] } },
    { ...book, id: 't2', completedAt: 1, reminder: { hour: 8, minute: 0, days: [1] } },
  ];
  const items = buildSchedule({ tasks, folders: [folder], plans: [], entries: [], profile: baseProfile }, now);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0].trigger, { kind: 'weekly', weekday: 2, hour: 21, minute: 30 });
  assert.equal(items[0].data.taskId, 't1');
});

test('schedule: future plans only, default 9:00 when no time', () => {
  const plans: Plan[] = [
    { id: 'p1', taskId: 't1', day: '2026-10-06', time: '18:00', createdAt: 0 },
    { id: 'p2', taskId: 't1', day: '2026-10-07', createdAt: 0 },
    { id: 'p3', taskId: 't1', day: '2026-10-01', createdAt: 0 }, // past
    { id: 'p4', taskId: 't1', day: '2026-10-08', doneAt: 1, createdAt: 0 }, // done
  ];
  const items = buildSchedule({ tasks: [book], folders: [folder], plans, entries: [], profile: baseProfile }, now);
  assert.deepEqual(items.map((i) => i.id), ['plan-p1', 'plan-p2']);
  assert.equal(new Date((items[1].trigger as { at: number }).at).getHours(), 9);
});

test('schedule: nudge skips today once something is logged', () => {
  const profile = { ...baseProfile, nudge: { enabled: true, hour: 21, minute: 0 } };
  const none = buildSchedule({ tasks: [book], folders: [folder], plans: [], entries: [], profile }, now);
  assert.equal(none.length, 7);
  assert.equal(none[0].title, '🔥 Keep your 3-day streak');
  const logged: Entry[] = [{ id: 'e', taskId: 't1', at: now - 1000, amount: 5, xp: 10 }];
  const after = buildSchedule({ tasks: [book], folders: [folder], plans: [], entries: logged, profile }, now);
  assert.equal(after.length, 6);
  assert.ok(!after.some((i) => i.id === 'nudge-2026-10-05'));
});

// ---------- v0.3: sync planning ----------

const syncProfile: Profile = { ...baseProfile, xp: 100 };
const folderA: Folder = { ...folder, id: 'fa' };
const data0 = { folders: [folderA], tasks: [book], entries: [] as Entry[], plans: [] as Plan[], profile: syncProfile };

test('sync: stableStringify ignores key order and undefined', () => {
  assert.equal(stableStringify({ b: 1, a: { d: 2, c: undefined, e: 3 } }), stableStringify({ a: { e: 3, d: 2 }, b: 1 }));
});

test('sync: first sync pushes everything local', () => {
  const plan = planSync(toRecordMap(data0), {}, []);
  assert.equal(plan.push.length, 3); // folder, task, profile
  assert.equal(plan.localChanged, false);
  const again = planSync(toRecordMap(data0), plan.snapshot, []);
  assert.equal(again.push.length, 0, 'nothing to push once in sync');
});

test('sync: remote edit applies when unchanged locally', () => {
  const first = planSync(toRecordMap(data0), {}, []);
  const remote: RemoteRecord[] = [{ kind: 'task', id: 't1', data: { ...book, title: 'Renamed' }, deleted: false, updated_at: '2026-10-05T01:00:00Z' }];
  const plan = planSync(toRecordMap(data0), first.snapshot, remote);
  assert.equal(plan.localChanged, true);
  assert.equal(plan.push.length, 0);
  const out = fromRecordMap(plan.local, syncProfile);
  assert.equal(out.tasks[0].title, 'Renamed');
});

test('sync: remote delete removes record; local delete pushes tombstone', () => {
  const first = planSync(toRecordMap(data0), {}, []);
  const gone = planSync(toRecordMap(data0), first.snapshot, [{ kind: 'folder', id: 'fa', data: null, deleted: true, updated_at: 'x' }]);
  assert.equal(fromRecordMap(gone.local, syncProfile).folders.length, 0);
  const localDel = planSync(toRecordMap({ ...data0, folders: [] }), first.snapshot, []);
  assert.deepEqual(localDel.push, [{ kind: 'folder', id: 'fa', data: null, deleted: true }]);
});

test('sync: conflict keeps local edit and pushes it', () => {
  const first = planSync(toRecordMap(data0), {}, []);
  const edited = { ...data0, tasks: [{ ...book, title: 'Mine' }] };
  const remote: RemoteRecord[] = [{ kind: 'task', id: 't1', data: { ...book, title: 'Theirs' }, deleted: false, updated_at: 'x' }];
  const plan = planSync(toRecordMap(edited), first.snapshot, remote);
  assert.equal(fromRecordMap(plan.local, syncProfile).tasks[0].title, 'Mine');
  assert.equal(plan.push.length, 1);
});

test('sync: profile conflict merges without losing progress', () => {
  const first = planSync(toRecordMap(data0), {}, []);
  const localP = { ...syncProfile, xp: 150, achievements: { a: 1 }, streak: { current: 4, best: 4, lastDay: '2026-10-05' } };
  const remoteP = { ...syncProfile, xp: 130, achievements: { b: 2 }, streak: { current: 9, best: 9, lastDay: '2026-10-04' } };
  const plan = planSync(toRecordMap({ ...data0, profile: localP }), first.snapshot, [
    { kind: 'profile', id: 'me', data: remoteP, deleted: false, updated_at: 'x' },
  ]);
  const p = fromRecordMap(plan.local, syncProfile).profile;
  assert.equal(p.xp, 150);
  assert.deepEqual(Object.keys(p.achievements).sort(), ['a', 'b']);
  assert.equal(p.streak.current, 4, 'most recent streak wins');
  assert.equal(p.streak.best, 9, 'best streak never drops');
  assert.equal(plan.push.length, 1);
});

test('sync: new device with example data merges with cloud data', () => {
  const cloud: RemoteRecord[] = [{ kind: 'folder', id: 'cloudF', data: { ...folder, id: 'cloudF' }, deleted: false, updated_at: 'x' }];
  const plan = planSync(toRecordMap(data0), {}, cloud);
  const out = fromRecordMap(plan.local, syncProfile);
  assert.deepEqual(out.folders.map((f) => f.id).sort(), ['cloudF', 'fa']);
  assert.ok(plan.push.some((r) => r.id === 'fa'));
});

// ---------- evidence (v0.4) ----------

test('evidence: links are normalized, junk is rejected', () => {
  assert.equal(normalizeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(normalizeUrl('  example.com/lesson '), 'https://example.com/lesson');
  assert.equal(normalizeUrl('not a link'), undefined);
  assert.equal(normalizeUrl('hello'), undefined);
  assert.equal(normalizeUrl(''), undefined);
});

test('evidence: needs a real summary or a usable link', () => {
  assert.equal(cleanEvidence({ summary: 'ok' }), undefined);
  assert.equal(cleanEvidence({ summary: '   ' }), undefined);
  assert.equal(cleanEvidence(undefined), undefined);
  const a = cleanEvidence({ summary: 'Read chapter 3, the cab chase', url: 'nope' }, 5);
  assert.deepEqual(a, { summary: 'Read chapter 3, the cab chase', url: undefined, photoUri: undefined, at: 5 });
  const b = cleanEvidence({ summary: 'short', url: 'books.example.com/p/12' }, 5);
  assert.deepEqual(b, { summary: undefined, url: 'https://books.example.com/p/12', photoUri: undefined, at: 5 });
  assert.deepEqual(cleanEvidence({ photoUri: 'file:///x.jpg' }, 5), { summary: undefined, url: undefined, photoUri: 'file:///x.jpg', at: 5 });
  assert.equal(cleanEvidence({ photoUri: '   ' }), undefined);
});

test('evidence: bonus is 25% with a floor of 3', () => {
  assert.equal(evidenceBonus(40), 10);
  assert.equal(evidenceBonus(10), 3);
  assert.equal(evidenceBonus(1), 3);
});

test('evidence: quick logs are pending for 7 days, then expire', () => {
  const quick: Entry = { id: 'q', taskId: 't1', at: now, amount: 5, xp: 30, trust: 'quick' };
  assert.equal(evidenceState(quick, now + DAY), 'pending');
  assert.equal(evidenceState(quick, now + 7 * DAY), 'pending');
  assert.equal(evidenceState(quick, now + 7 * DAY + 1), 'expired');
  assert.equal(daysLeftForProof(quick, now + DAY), 5);
  assert.equal(daysLeftForProof(quick, now + 8 * DAY), 0);
  assert.equal(evidenceState({ ...quick, trust: 'evidence' }, now), 'verified');
  assert.equal(evidenceState({ id: 'o', taskId: 't1', at: now, amount: 1, xp: 10 }, now), 'legacy');
});

test('evidence: sparks are withheld for quick logs, kept for old logs', () => {
  const quick: Entry = { id: 'q', taskId: 't1', at: now, amount: 5, xp: 35, trust: 'quick' };
  const proven: Entry = { ...quick, trust: 'evidence' };
  const old: Entry = { id: 'o', taskId: 't1', at: now, amount: 5, xp: 35 };
  assert.equal(sparksGranted(quick), 0);
  assert.equal(sparksGranted(proven), 3);
  assert.equal(sparksGranted(old), 3);
  assert.equal(pendingSparks([quick, proven, old], now + DAY), 3);
  assert.equal(pendingSparks([quick], now + 9 * DAY), 0); // expired Sparks are no longer pending
});

test('evidence: award pays Sparks for bonuses even on a quick log', () => {
  assert.equal(sparksForAward('evidence', 35, 85), 8);
  assert.equal(sparksForAward('quick', 35, 35), 0);
  assert.equal(sparksForAward('quick', 35, 85), 5); // finishing a task (+50 XP) still pays 5 Sparks
});

// ---------- Echo Lite (v0.5) ----------

const gymFolder: Folder = { id: 'fg', name: 'Gym', icon: '💪', color: '#f00', templateId: 'gym', progressType: 'sessions', unit: 'sessions', createdAt: 0 };
const bookFolder: Folder = { id: 'fb', name: 'Reading', icon: '📚', color: '#00f', templateId: 'reading', progressType: 'units', unit: 'pages', createdAt: 0 };
const customFolder: Folder = { id: 'fc', name: 'Mine', icon: '✨', color: '#0f0', templateId: 'custom', progressType: 'units', unit: 'x', createdAt: 0 };
const echoTasks: Task[] = [
  { ...book, id: 'tg', folderId: 'fg' }, { ...book, id: 'tb', folderId: 'fb' }, { ...book, id: 'tc', folderId: 'fc' },
];

test('echo: effort goes to the folder\'s attribute; quick logs count 40%', () => {
  const entries: Entry[] = [
    { id: '1', taskId: 'tg', at: now, amount: 1, xp: 50, trust: 'evidence' },
    { id: '2', taskId: 'tg', at: now, amount: 1, xp: 50, trust: 'quick' },
    { id: '3', taskId: 'tb', at: now, amount: 5, xp: 30 }, // before v0.4: counts in full
    { id: '4', taskId: 'gone', at: now, amount: 5, xp: 99, trust: 'evidence' }, // deleted task: ignored
  ];
  const p = computeAttributes(entries, echoTasks, [gymFolder, bookFolder, customFolder]);
  assert.equal(p.strength, 70);
  assert.equal(p.wisdom, 30);
  assert.equal(p.voice, 0);
  assert.equal(totalPoints(p), 100);
});

test('echo: custom folders feed all six attributes equally', () => {
  const p = computeAttributes([{ id: '1', taskId: 'tc', at: now, amount: 1, xp: 60, trust: 'evidence' }], echoTasks, [customFolder]);
  for (const a of ATTRIBUTES) assert.equal(p[a.id], 10);
});

test('echo: attribute levels and stages', () => {
  assert.equal(attrLevel(0).level, 1);
  assert.equal(attrLevel(25).level, 2);
  assert.equal(attrLevel(99).level, 2);
  assert.equal(attrLevel(100).level, 3);
  assert.equal(stageFor(0).name, 'Spark');
  assert.equal(stageFor(150).name, 'Sprout');
  assert.equal(stageFor(149).toNext, 1);
  assert.equal(stageFor(99999).name, 'Legend');
  assert.equal(stageFor(99999).ratio, 1);
});

test('echo: archetype follows the strongest path, generalist when spread out', () => {
  const none = { wisdom: 0, strength: 0, voice: 0, craft: 0, fortune: 0, spirit: 0 };
  assert.equal(archetypeFor(none), 'Newcomer');
  assert.equal(archetypeFor({ ...none, strength: 400 }), 'Warrior');
  assert.equal(archetypeFor({ wisdom: 100, strength: 100, voice: 100, craft: 100, fortune: 100, spirit: 100 }), 'Wayfarer');
});

test('echo: mood is never negative, and the daily line is stable', () => {
  assert.equal(echoMood(true, 0), 'radiant');
  assert.equal(echoMood(false, 3), 'content');
  assert.equal(echoMood(false, 0), 'resting');
  assert.equal(echoLine('resting', '2026-10-07'), echoLine('resting', '2026-10-07'));
});

test('sync: echo naming survives profile merge', () => {
  const base: Profile = { name: '', xp: 0, sparks: 0, streak: { current: 0, best: 0 }, freezes: 0, dailyGoalXp: 30, haptics: true, achievements: {}, nudge: { enabled: false, hour: 21, minute: 0 } };
  const named = { ...base, echo: { name: 'Kai', skin: 1, hair: 2, bornAt: 5 } };
  const m1 = mergeProfiles(base, named);
  assert.equal(m1.echo?.name, 'Kai');
  const m2 = mergeProfiles(named, base);
  assert.equal(m2.echo?.name, 'Kai');
});

// ---------- Wardrobe (v0.6) ----------

test('wardrobe: balance = earned Sparks minus the price of owned items', () => {
  assert.equal(sparkBalance({ sparks: 100 }), 100);
  assert.equal(sparkBalance({ sparks: 100, owned: ['top-hoodie'] }), 60);
  assert.equal(sparkBalance({ sparks: 10, owned: ['top-kimono'] }), 0); // never negative
});

test('wardrobe: buying rules', () => {
  const p = { sparks: 100, owned: ['hat-cap'] };
  assert.deepEqual(canBuy(p, 'hat-cap', 0), { ok: false, reason: 'owned' });
  assert.deepEqual(canBuy(p, 'top-tee', 0), { ok: false, reason: 'owned' }); // free items are always owned
  assert.deepEqual(canBuy(p, 'top-kimono', 0), { ok: false, reason: 'poor' });
  assert.deepEqual(canBuy({ sparks: 999 }, 'hat-crown', 1), { ok: false, reason: 'stage' });
  assert.deepEqual(canBuy({ sparks: 999 }, 'hat-crown', 4), { ok: true });
  assert.deepEqual(canBuy(p, 'nope', 0), { ok: false, reason: 'unknown' });
});

test('wardrobe: purchases from two devices merge without double-spending', () => {
  const base: Profile = { name: '', xp: 0, sparks: 120, streak: { current: 0, best: 0 }, freezes: 0, dailyGoalXp: 30, haptics: true, achievements: {}, nudge: { enabled: false, hour: 21, minute: 0 } };
  const a = { ...base, owned: ['top-hoodie'] }; // 40
  const b = { ...base, owned: ['hat-cap'] }; // 30
  const m = mergeProfiles(a, b);
  assert.deepEqual([...(m.owned ?? [])].sort(), ['hat-cap', 'top-hoodie']);
  assert.equal(sparkBalance(m), 50);
});

// ---------- Rankings (v0.7) ----------

test('rankings: the week starts Monday 00:00 UTC for everyone', () => {
  const wed = Date.UTC(2026, 9, 7, 13, 30); // Wed 7 Oct 2026
  assert.equal(weekStartMs(wed), Date.UTC(2026, 9, 5)); // Mon 5 Oct
  assert.equal(weekStartMs(Date.UTC(2026, 9, 5)), Date.UTC(2026, 9, 5)); // Monday itself
  assert.equal(weekStartMs(Date.UTC(2026, 9, 11, 23, 59)), Date.UTC(2026, 9, 5)); // Sunday night
  assert.equal(weekEndMs(wed), Date.UTC(2026, 9, 12));
  assert.equal(daysLeftInWeek(wed), 5);
});

test('rankings: flags, names, medals', () => {
  assert.equal(flag('KR'), '🇰🇷');
  assert.equal(flag('us'), '🇺🇸');
  assert.equal(flag(null), '🌍');
  assert.equal(cleanDisplayName('   '), undefined);
  assert.equal(cleanDisplayName('  Khurshid   B  '), 'Khurshid B');
  assert.equal(cleanDisplayName('x'.repeat(40))?.length, 24);
  assert.equal(rankMedal(1), '🥇');
  assert.equal(rankMedal(4), '');
});

console.log(`\n${passed} tests passed`);
