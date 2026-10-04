/// <reference types="jest" />
/** @jest-environment node */
import catalogJson from '../../../assets/catalog.json';
import { makeClock } from '../dates';
import { type Ctx, normalize } from '../engine';
import { reminderPlan } from '../reminders';
import type { AppState, Catalog, WalletCard } from '../types';

const catalog = catalogJson as unknown as Catalog;
const card = (id: string, product: string, extra: Partial<WalletCard> = {}) => ({ ...normalize({ id, product } as WalletCard), ...extra });
const ctxAt = (when: string, wallet: WalletCard[]): Ctx => ({
  catalog, clock: makeClock(new Date(when)),
  state: { wallet, people: [], recents: [], usage: {}, reports: [], favs: [], profile: { name: '', theme: 'system' } } as AppState,
});
const ids = (ctx: Ctx) => reminderPlan(ctx).map(r => r.id);

test('Freedom Flex (activate by the 14th): a week before and the day before the deadline', () => {
  const plan = reminderPlan(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_flex')]));
  expect(plan.map(r => [r.id, r.date.toDateString()])).toEqual([
    ['due7:w1:2026-Q4', new Date(2026, 11, 7).toDateString()],
    ['due1:w1:2026-Q4', new Date(2026, 11, 13).toDateString()],
  ]);
  expect(plan[0].date.getHours()).toBe(10);
  expect(plan[0].body).toMatch(/by Dec 14/);
});

test('no reminders once activated, dismissed, or deactivated', () => {
  expect(ids(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_flex', { activated: ['2026-Q4'] })]))).toEqual([]);
  expect(ids(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_flex', { dismissed: ['act:2026-Q4'] })]))).toEqual([]);
  expect(ids(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_flex', { inactive: '2026-09-01' })]))).toEqual([]);
});

test('past dates are never scheduled', () => {
  const plan = reminderPlan(ctxAt('2026-12-10T12:00:00', [card('w1', 'chase_freedom_flex')]));
  expect(plan.map(r => r.id)).toEqual(['due1:w1:2026-Q4']);
  expect(reminderPlan(ctxAt('2026-12-20T12:00:00', [card('w1', 'chase_freedom_flex')]))).toEqual([]);
});

test('Discover (activate before you spend, no retro deadline) reminds before quarter end', () => {
  const plan = reminderPlan(ctxAt('2026-10-04T12:00:00', [card('w2', 'discover_it_cash_back')]));
  expect(plan.map(r => r.date.toDateString())).toEqual([new Date(2026, 11, 24).toDateString(), new Date(2026, 11, 30).toDateString()]);
});

test('quarterly picks: one reminder 15 days before quarter end, until confirmed for next quarter', () => {
  const sel = { five: { opts: ['fast_food', 'phone'], quarter: '2026-Q4' }, two: { opts: ['gas'], quarter: '2026-Q4' } };
  const plan = reminderPlan(ctxAt('2026-10-04T12:00:00', [card('w3', 'usbank_cash_plus', { sel })]));
  expect(plan.map(r => [r.id, r.date.toDateString()])).toEqual([['picks:w3:2027-Q1', new Date(2026, 11, 16).toDateString()]]);
  const confirmed = { five: { ...sel.five, quarter: '2027-Q1' }, two: { ...sel.two, quarter: '2027-Q1' } };
  expect(ids(ctxAt('2026-10-04T12:00:00', [card('w3', 'usbank_cash_plus', { sel: confirmed })]))).toEqual([]);
  // picks never saved: the in-app task handles it, no dated reminder
  expect(ids(ctxAt('2026-10-04T12:00:00', [card('w3', 'usbank_cash_plus')]))).toEqual([]);
});

test('sorted by date, capped, unique ids', () => {
  const wallet = Object.keys(catalog.products).map((p, i) => card('w' + i, p));
  const plan = reminderPlan(ctxAt('2026-10-04T12:00:00', wallet), 5);
  expect(plan.length).toBeLessThanOrEqual(5);
  expect(plan.map(r => +r.date)).toEqual([...plan.map(r => +r.date)].sort((a, b) => a - b));
  const all = reminderPlan(ctxAt('2026-10-04T12:00:00', wallet), 999);
  expect(new Set(all.map(r => r.id)).size).toBe(all.length);
});
