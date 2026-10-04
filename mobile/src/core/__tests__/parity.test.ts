/// <reference types="jest" />
/// <reference types="node" />
/**
 * @jest-environment node
 *
 * Parity: the TypeScript engine must give exactly the same answers as the web app's
 * src/engine.js. Runs the legacy files in a sandbox with a pinned date, then compares
 * every card × every category × every store, for several dates and wallet setups.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

import catalogJson from '../../../assets/catalog.json';
import { CATS, catById } from '../cats';
import { makeClock } from '../dates';
import { type Ctx, evalCard, normalize, rank, tasksFor, visibleCats, networkHidden } from '../engine';
import type { AppState, Catalog, Store, WalletCard } from '../types';

const catalog = catalogJson as unknown as Catalog;
const ROOT = path.join(__dirname, '..', '..', '..', '..');

function legacy(fixed: number) {
  const src = ['cats.js', 'engine.js'].map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n')
    .replace('/*__CATALOG__*/null', () => JSON.stringify(catalog))
    + '\n;globalThis.__api={setWallet(w){state.wallet=w},evalCard,rank,tasksFor,visibleCats,networkHidden,CATS};';
  class FakeDate extends Date {
    constructor(...a: any[]) { if (a.length) super(...(a as [])); else super(fixed); }
    static now() { return fixed; }
  }
  const sandbox: any = { Date: FakeDate, console, JSON, Math, Intl, Object, String, Number, Array, RegExp };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.__api;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const ids = Object.keys(catalog.products);

/* Wallet setups: plain cards, and cards with every option exercised */
function plainWallet(): WalletCard[] {
  return ids.map((id, i) => normalize({ id: 'w' + i, product: id } as WalletCard));
}
function busyWallet(qk: string, today: string): WalletCard[] {
  return ids.map((id, i) => {
    const p = catalog.products[id];
    const w = normalize({ id: 'w' + i, product: id } as WalletCard);
    (p.choice || []).forEach((s, j) => {
      const n = s.pick || 1;
      w.sel[s.id] = { opts: s.options.slice(j % 2, (j % 2) + n).map(o => o.id), quarter: i % 3 ? qk : '2020-Q1' };
    });
    if (i % 2) w.activated = [qk];
    if (p.auto) w.autoFocus = p.auto.options[i % p.auto.options.length];
    if (i % 4 === 0) w.capped = { r0: '2099-01-01', rot: '2099-01-01' };
    if (i % 5 === 0) w.promos = [{ extra: 1, until: '2099-01-01' }, { extra: 2, until: '2000-01-01' }];
    if (i % 7 === 0) w.introApr = today;
    if (i % 11 === 0) w.dismissed = ['act:' + qk];
    return w;
  });
}

const pick = (r: any) => r && ({ product: r.w.product, rate: r.rate, earn: r.earn, label: r.label, note: r.note, flags: r.flags, cap: r.cap, extras: r.extras, apr: r.apr, special: r.special });
const DATES = ['2026-10-04T12:00:00', '2026-12-20T09:00:00', '2026-03-31T18:00:00', '2027-01-10T08:00:00', '2026-07-14T12:00:00'];

describe.each(DATES)('engine parity on %s', when => {
  const fixed = new Date(when).getTime();
  const clock = makeClock(new Date(fixed));
  const old = legacy(fixed);

  test.each([['plain', plainWallet], ['busy', () => busyWallet(clock.QK, clock.TODAY)]])('%s wallet', (_name, make) => {
    const wallet = make();
    const state = { wallet: clone(wallet), people: [], recents: [], usage: {}, reports: [], favs: [], profile: { name: '', theme: 'system' } } as AppState;
    const ctx: Ctx = { catalog, state, clock };
    old.setWallet(clone(wallet));

    let checks = 0;
    const places: [string, Store | null][] = [
      ...CATS.map(c => [c.id, null] as [string, null]),
      ...catalog.stores.filter(s => catById(s.cat)).map(s => [s.cat, s] as [string, Store]),
    ];
    for (const [catId, store] of places) {
      const cat = catById(catId)!;
      const oldCat = old.CATS.find((c: any) => c.id === catId);
      expect(rank(ctx, cat, store).map(pick)).toEqual(old.rank(oldCat, store).map(pick));
      for (let i = 0; i < wallet.length; i++) {
        expect(pick(evalCard(ctx, state.wallet[i], cat, store))).toEqual(pick(old.evalCard(clone(wallet[i]), oldCat, store)));
        checks++;
      }
      expect(networkHidden(ctx, cat)).toBe(old.networkHidden(oldCat));
    }
    for (let i = 0; i < wallet.length; i++) expect(tasksFor(ctx, state.wallet[i])).toEqual(old.tasksFor(clone(wallet[i])));
    expect(visibleCats(ctx).map(c => c.id)).toEqual(old.visibleCats().map((c: any) => c.id));
    expect(checks).toBeGreaterThan(10000);
  });
});
