/// <reference types="jest" />
/// <reference types="node" />
/**
 * @jest-environment node
 *
 * Wallet parity: topRate, bestFor, earnsExtra, filters and sorting must match the web app's src/wallet.js.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

import catalogJson from '../../../assets/catalog.json';
import { CATS } from '../cats';
import { makeClock } from '../dates';
import { type Ctx, normalize } from '../engine';
import type { AppState, Catalog, WalletCard, WalletFilter, WalletView } from '../types';
import { FILTER_DEFAULT, VIEW_DEFAULT, bestFor, earnsExtra, topRate, walletFiltered, walletSorted } from '../wallet';

const catalog = catalogJson as unknown as Catalog;
const ROOT = path.join(__dirname, '..', '..', '..', '..');
const FIXED = new Date('2026-10-04T12:00:00').getTime();

function legacy(wallet: WalletCard[]) {
  const src = ['cats.js', 'engine.js', 'wallet.js'].map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n')
    .replace('/*__CATALOG__*/null', () => JSON.stringify(catalog))
    + `\n;globalThis.__api={setWallet(w){state.wallet=w},setView(v){state.view=v},topRate,bestFor,earnsExtra,walletFiltered,walletSorted};`;
  class FakeDate extends Date {
    constructor(...a: any[]) { if (a.length) super(...(a as [])); else super(FIXED); }
    static now() { return FIXED; }
  }
  const el = { addEventListener() {}, innerHTML: '' };
  const sandbox: any = { Date: FakeDate, console, JSON, Math, Intl, Object, String, Number, Array, RegExp, Map, Set,
    document: { getElementById: () => el, querySelectorAll: () => [] }, SHOW: undefined };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  sandbox.__api.setWallet(JSON.parse(JSON.stringify(wallet)));
  return sandbox.__api;
}
/* Legacy bestFor returns HTML pills; turn them into the same shape as the TS version */
const pills = (html: string) => [...html.matchAll(/<span class="bf-pill( warn)?"><b>([^<]*)<\/b> ([^<]*)<\/span>|<span class="bf-pill">([^<]*)<\/span>/g)]
  .map(m => (m[4] ? { rate: m[4].split(' ')[0], label: m[4].split(' ').slice(1).join(' ') } : { rate: m[2], label: m[3].replace(/&amp;/g, '&'), ...(m[1] ? { warn: true } : {}) }));

const ids = Object.keys(catalog.products);
const wallet = ids.map((id, i) => {
  const w = normalize({ id: 'w' + (1700000000000 + i * 1000), product: id } as WalletCard);
  if (i % 3 === 0) w.activated = ['2026-Q4'];
  if (i % 4 === 0) w.pinned = true;
  if (i % 9 === 0) w.introApr = '2027-01-01';
  if (i % 6 === 0) w.promos = [{ extra: 1, until: '2099-01-01', label: 'Promo (test)' }];
  const p = catalog.products[id];
  if (p.auto && i % 2) w.autoFocus = p.auto.options[0];
  return w;
});
const state = { wallet, people: [{ id: 'me', name: 'Me' }], recents: [], usage: {}, reports: [], favs: [], profile: { name: '', theme: 'system' } } as AppState;
const ctx: Ctx = { catalog, state, clock: makeClock(new Date(FIXED)) };
const old = legacy(wallet);

test('topRate and bestFor match for every card', () => {
  for (let i = 0; i < wallet.length; i++) {
    expect(topRate(ctx, wallet[i])).toBe(old.topRate(JSON.parse(JSON.stringify(wallet[i]))));
    expect(bestFor(ctx, wallet[i])).toEqual(pills(old.bestFor(JSON.parse(JSON.stringify(wallet[i])))));
  }
});

test('earnsExtra matches for every card and category', () => {
  for (const w of wallet) for (const c of CATS) expect(earnsExtra(ctx, w, c.id)).toBe(old.earnsExtra(JSON.parse(JSON.stringify(w)), c.id));
});

test('filters match', () => {
  const cases: Partial<WalletFilter>[] = [{ earns: 'grocery' }, { earns: 'gas' }, { type: 'points' }, { bank: 'chase' }, { network: 'visa' }, { fee: 'none' }, { fee: 'paid' }, { status: 'setup' }, { status: 'pinned' }, { status: 'intro' }, { bank: 'amex', fee: 'paid' }];
  for (const f of cases) {
    const full = { ...FILTER_DEFAULT, ...f };
    expect(walletFiltered(ctx, wallet, full).map(w => w.id)).toEqual(old.walletFiltered(JSON.parse(JSON.stringify(wallet)), full).map((w: WalletCard) => w.id));
  }
});

test('sorting matches', () => {
  for (const sort of ['custom', 'rewards', 'name', 'bank', 'added'] as WalletView['sort'][]) for (const order of ['asc', 'desc'] as const) {
    const v = { ...VIEW_DEFAULT, sort, order };
    old.setView(JSON.parse(JSON.stringify(v)));
    expect(walletSorted(ctx, wallet, v).map(w => w.id)).toEqual(old.walletSorted(JSON.parse(JSON.stringify(wallet))).map((w: WalletCard) => w.id));
  }
});
