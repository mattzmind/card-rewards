/// <reference types="jest" />
/** @jest-environment node */
import catalogJson from '../../../assets/catalog.json';
import { makeClock } from '../dates';
import { type Ctx, normalize } from '../engine';
import type { AppState, Catalog, WalletCard } from '../types';
import { bestFor, quarterRows, rateTiers, walletTip } from '../wallet';

const catalog = catalogJson as unknown as Catalog;
const card = (id: string, product: string, extra: Partial<WalletCard> = {}) => ({ ...normalize({ id, product } as WalletCard), ...extra });
const ctxAt = (when: string, wallet: WalletCard[]): Ctx => ({
  catalog, clock: makeClock(new Date(when)),
  state: { wallet, people: [], recents: [], usage: {}, reports: [], favs: [], profile: { name: '', theme: 'system' } } as AppState,
});
const states = (ctx: Ctx) => quarterRows(ctx).map(r => [r.w.id, r.q, r.state]);

test('rotating card: activate until done, then on; missed after a retroactive deadline', () => {
  expect(states(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_flex')]))).toEqual([['w1', '2026-Q4', 'activate']]);
  expect(quarterRows(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_flex')]))[0].due).toBe('Activate by Dec 14');
  expect(states(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_flex', { activated: ['2026-Q4'] })]))).toEqual([['w1', '2026-Q4', 'on']]);
  expect(states(ctxAt('2026-12-20T12:00:00', [card('w1', 'chase_freedom_flex')]))[0][2]).toBe('missed');
});

test('cards without quarterly bonuses and deactivated cards get no row', () => {
  expect(quarterRows(ctxAt('2026-10-04T12:00:00', [card('w1', 'chase_freedom_unlimited'), card('w2', 'chase_freedom_flex', { inactive: '2026-09-01' })]))).toEqual([]);
});

test('quarterly picks: choose when empty, confirm when left from an earlier quarter, set when saved', () => {
  const p = Object.entries(catalog.products).find(([, x]) => (x.choice || []).some(s => s.period === 'quarter'))!;
  const slots = p[1].choice!.filter(s => s.period === 'quarter');
  const sel = (quarter: string) => Object.fromEntries(slots.map(s => [s.id, { opts: s.options.slice(0, s.pick).map(o => o.id), quarter }]));
  expect(states(ctxAt('2026-10-04T12:00:00', [card('w1', p[0])]))[0][2]).toBe('pick');
  expect(states(ctxAt('2026-10-04T12:00:00', [card('w1', p[0], { sel: sel('2026-Q3') })]))[0][2]).toBe('confirm');
  expect(states(ctxAt('2026-10-04T12:00:00', [card('w1', p[0], { sel: sel('2026-Q4') })]))[0][2]).toBe('on');
});

test('tip names a card that beats the everyday rate, and the seed changes which one', () => {
  const ctx = ctxAt('2026-10-04T12:00:00', [card('w1', 'amex_gold'), card('w2', 'chase_freedom_unlimited')]);
  const a = walletTip(ctx, 0), b = walletTip(ctx, 0.999);
  expect(a && b).toBeTruthy();
  expect(a!.catId).not.toBe(b!.catId);
  expect(walletTip(ctxAt('2026-10-04T12:00:00', []), 0.5)).toBeNull();
});

test('wallet pills: same rate shares one pill, a new pill only when the rate changes', () => {
  const h = (rate: string, label: string) => ({ rate, label });
  expect(rateTiers([h('3%', 'grocery'), h('3%', 'gas')])).toEqual([{ rate: '3%', label: 'grocery and gas' }]);
  expect(rateTiers([h('6%', 'grocery'), h('6%', 'streaming'), h('3%', 'gas'), h('3%', 'transit')]))
    .toEqual([{ rate: '6%', label: 'grocery and streaming' }, { rate: '3%', label: 'gas' }]);
  expect(rateTiers([h('5%', 'a'), h('5%', 'b'), h('5%', 'c'), h('2%', 'd')])).toEqual([{ rate: '5%', label: 'a and b' }, { rate: '2%', label: 'd' }]);
  expect(rateTiers([h('4%', 'dining'), h('2%', 'gas'), h('1%', 'x')], 1)).toEqual([{ rate: '4%', label: 'dining' }]);
});

test('Amex Gold shows 4% grocery and dining as one pill', () => {
  const ctx = ctxAt('2026-10-04T12:00:00', [card('w1', 'amex_gold')]);
  expect(bestFor(ctx, ctx.state.wallet[0])[0]).toEqual({ rate: '4%', label: 'grocery and dining' });
});
