// Run with: npx tsx src/lib/logic.test.ts
import assert from 'node:assert/strict';
import { applyActivity, levelInfo, visibleStreak, xpForLevel, xpForLog, streakMultiplier } from './gamify';
import { computeProgress, forecast, formatAmount } from './progress';
import { daysBetween, dayKey } from './dates';
import { Entry, Folder, Plan, Profile, Task } from './types';
import { daysLabel, monthGrid, parseTime } from './calendar';
import { buildSchedule } from './schedule';

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

console.log(`\n${passed} tests passed`);
