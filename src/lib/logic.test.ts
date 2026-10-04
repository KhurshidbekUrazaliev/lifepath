// Run with: npx tsx src/lib/logic.test.ts
import assert from 'node:assert/strict';
import { applyActivity, levelInfo, visibleStreak, xpForLevel, xpForLog, streakMultiplier } from './gamify';
import { computeProgress, forecast, formatAmount } from './progress';
import { daysBetween, dayKey } from './dates';
import { Entry, Task } from './types';

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

console.log(`\n${passed} tests passed`);
