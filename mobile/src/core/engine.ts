/* Ranking engine: a line-for-line port of the web app's src/engine.js.
   The only change: instead of reading globals, every function gets a Ctx
   (catalog + saved state + clock). __tests__/parity.test.ts checks that the
   answers match the web app for every card, category and store. */
import { CATS } from './cats';
import { type Clock, iso, qDeadline, qEnd, qLabel, qStart, shortDate } from './dates';
import type { AppState, Brand, Catalog, Category, ChoiceSlot, Product, Promo, Rule, Store, WalletCard } from './types';

export interface Ctx { catalog: Catalog; state: AppState; clock: Clock }

/* Old product IDs from earlier app versions → catalog IDs */
export const ALIASES: Record<string, string> = {
  amex_bcp: 'amex_blue_cash_preferred', amex_bce: 'amex_blue_cash_everyday',
  chase_fu: 'chase_freedom_unlimited', chase_ff: 'chase_freedom_flex', chase_csp: 'chase_sapphire_preferred',
  usb_cashplus: 'usbank_cash_plus', usb_altgo: 'usbank_altitude_go',
  citi_custom: 'citi_custom_cash', citi_double: 'citi_double_cash',
  boa_ccr: 'boa_customized_cash', discover_it: 'discover_it_cash_back', ally_everyday: 'ollo_everyday_rewards',
};

export function normalize(w: WalletCard): WalletCard {
  if (ALIASES[w.product]) { if (w.product === 'ally_everyday' && !w.nickname) w.nickname = 'Ally'; w.product = ALIASES[w.product]; }
  w.sel = w.sel || {};
  Object.values(w.sel).forEach(s => { if (s && !s.opts && s.cats) { s.opts = s.cats; delete s.cats; } });
  w.activated = w.activated || []; w.dismissed = w.dismissed || []; w.capped = w.capped || {}; w.promos = w.promos || [];
  w.nickname = w.nickname || ''; w.last4 = w.last4 || ''; w.rewards = w.rewards ?? ''; w.limit = w.limit || '';
  return w;
}

/* ─── Lookups and small helpers ─── */
export const productOf = (ctx: Ctx, id: string): Product | undefined => ctx.catalog.products[id];
export const brandOf = (ctx: Ctx, key: string): Brand =>
  ctx.catalog.brands[key] || { name: key, short: key, mono: String(key).slice(0, 2).toUpperCase(), colors: ['#475569', '#1e293b'] };
export const activeWallet = (ctx: Ctx) => ctx.state.wallet.filter(w => !w.inactive);
export const dn = (ctx: Ctx, w: WalletCard) => w.nickname || productOf(ctx, w.product)?.short || 'Card';
export const netOf = (ctx: Ctx, w: WalletCard) => w.network || productOf(ctx, w.product)?.network;
export const fmtRate = (r: number) => (Number.isInteger(r) ? String(r) : String(+r.toFixed(2)));
export const capWord = (w: string) => (w ? w[0].toUpperCase() + w.slice(1) : '');
export const netLabel = (n?: string) => (n === 'store' ? 'Store card' : capWord(n || ''));

/* choice-slot helpers: options are {id,label,cats} */
const optOf = (slot: ChoiceSlot, id: string) => (slot.options || []).find(o => o.id === id);
export const selOpts = (w: WalletCard, slot: ChoiceSlot): string[] => {
  const s = w.sel[slot.id];
  return s && s.opts && s.opts.length ? s.opts : (slot.default ? [slot.default] : []);
};
export const selCats = (w: WalletCard, slot: ChoiceSlot) => selOpts(w, slot).flatMap(id => optOf(slot, id)?.cats || []);
export const selLabels = (w: WalletCard, slot: ChoiceSlot) => selOpts(w, slot).map(id => optOf(slot, id)?.label || id);

/* ─── Ranking ─── */
function matches(cats: string[], excl: string[] | null | undefined, cat: Category) {
  if (cats.includes(cat.id)) return true;
  return !!(cat.parent && cats.includes(cat.parent) && !(excl || []).includes(cat.id));
}
/* spending caps: period parsed from the rule's note ("$6,000/yr", "$1,500/quarter", "per billing cycle") */
export function capPeriod(text?: string): 'month' | 'quarter' | 'year' | null {
  text = (text || '').toLowerCase();
  if (/billing cycle|\/mo\b|per month|a month|monthly/.test(text)) return 'month';
  if (/quarter|\/q\b/.test(text)) return 'quarter';
  if (/\/yr|year|annual/.test(text)) return 'year';
  return null;
}
export function periodEnd(ctx: Ctx, per: string) {
  const { NOW, QK } = ctx.clock;
  if (per === 'month') return iso(new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0));
  if (per === 'quarter') return iso(qEnd(QK));
  return iso(new Date(NOW.getFullYear(), 11, 31));
}
const isCapped = (ctx: Ctx, w: WalletCard, key: string) => !!(w.capped && w.capped[key] && w.capped[key] >= ctx.clock.TODAY);
const storeHit = (r: Rule, store?: Store | null) =>
  !!(store && r.m && (r.m.includes(store.id) || (store.tags || []).some(t => r.m!.includes(t))));

export type Flag = 'confirm' | 'activate';
export interface Cap { key: string; per: string; text?: string }
export interface Result {
  w: WalletCard;
  p: Product;
  earn: number;
  rate: number;
  label: string;
  note: string;
  flags: Flag[];
  cap: Cap | null;
  extras: Promo[];
  apr: string | null;
  special: { rate: number; label: string; cond?: string } | null;
}

export function evalCard(ctx: Ctx, w: WalletCard, cat: Category, store?: Store | null): Result | null {
  const { NOW, TODAY, QK } = ctx.clock;
  const p = productOf(ctx, w.product); if (!p) return null;
  if (p.storeOnly && !p.storeOnly.includes(cat.id)) return null;
  if (cat.networks && !cat.networks.includes(netOf(ctx, w) as string)) return null;
  const bx = p.baseExcept && p.baseExcept.cats.includes(cat.id) ? p.baseExcept : null;
  let best: { rate: number; label: string; note: string; flags: Flag[]; cap: Cap | null } =
    { rate: bx ? bx.rate : p.base, label: bx ? bx.label : (p.baseLabel || 'Everything else'), note: '', flags: [], cap: null };
  const take = (rate: number, label: string, note?: string, flags?: Flag[], cap?: Cap | null) => {
    if (rate > best.rate) best = { rate, label, note: note || '', flags: flags || [], cap: cap || null };
  };
  const conds: Rule[] = [];
  (p.rules || []).forEach((r, i) => {
    if (!matches(r.cats, r.excl, cat)) return;
    if (r.cond && !storeHit(r, store)) { conds.push(r); return; }
    const key = 'r' + i, per = capPeriod(r.note);
    if (per && isCapped(ctx, w, key)) return;
    take(r.rate, r.label, r.cond ? `At ${store!.name}` : r.note, [], per ? { key, per, text: r.note } : null);
  });
  (p.choice || []).forEach(slot => {
    if (!matches(selCats(w, slot), null, cat)) return;
    const key = 'c:' + slot.id, per = capPeriod(slot.note);
    if (per && isCapped(ctx, w, key)) return;
    const s = w.sel[slot.id];
    const stale = slot.period === 'quarter' && (!s || !s.quarter || s.quarter < QK);
    take(slot.rate, slot.label.replace('Your ', '').replace(/^./, c => c.toUpperCase()), slot.note, stale ? ['confirm'] : [], per ? { key, per, text: slot.note } : null);
  });
  if (p.rotating && !isCapped(ctx, w, 'rot')) {
    const q = p.rotating.schedule[QK], cap = { key: 'rot', per: 'quarter', text: p.rotating.cap };
    if (q && matches(q.cats, null, cat)) {
      if (w.activated.includes(QK)) take(p.rotating.rate, qLabel(QK) + ' bonus', p.rotating.cap, [], cap);
      else if (p.rotating.retroactive && qDeadline(QK, p.rotating.deadlineDay || 31) >= NOW)
        take(p.rotating.rate, qLabel(QK) + ' bonus', `Activate by ${shortDate(qDeadline(QK, p.rotating.deadlineDay as number))}`, ['activate'], cap);
    }
  }
  if (p.auto && w.autoFocus && matches([w.autoFocus], null, cat) && !isCapped(ctx, w, 'auto'))
    take(p.auto.rate, 'Top category this cycle', p.auto.note, [], { key: 'auto', per: 'month', text: p.auto.note });
  let rate = best.rate; const extras: Promo[] = [];
  w.promos.forEach(pr => { if (pr.until >= TODAY) { rate += pr.extra; extras.push(pr); } });
  const mult = p.type === 'cash' ? 1 : (p.cpp || 1), bump = extras.reduce((a, e) => a + e.extra, 0);
  rate = rate * mult;
  const special = conds.map(r => ({ rate: Math.round((r.rate + bump) * mult * 100) / 100, label: r.label, cond: r.cond }))
    .filter(x => x.rate > rate).sort((a, b) => b.rate - a.rate)[0] || null;
  const apr = w.introApr && w.introApr >= TODAY ? w.introApr : null;
  return { w, p, earn: Math.round((best.rate + bump) * 100) / 100, rate: Math.round(rate * 100) / 100, label: best.label, note: best.note, flags: best.flags, cap: best.cap, extras, apr, special };
}

export function rank(ctx: Ctx, cat: Category, store?: Store | null): Result[] {
  return activeWallet(ctx).map(w => evalCard(ctx, w, cat, store)).filter((x): x is Result => !!x)
    .sort((a, b) => b.rate - a.rate || a.flags.length - b.flags.length);
}
export function networkHidden(ctx: Ctx, cat: Category) {
  if (!cat.networks) return 0;
  return activeWallet(ctx).filter(w => { const p = productOf(ctx, w.product); return p && !p.storeOnly && !cat.networks!.includes(netOf(ctx, w) as string); }).length;
}
/* does any wallet card name this category directly (not via parent)? */
export function directHit(ctx: Ctx, cat: Category) {
  const { QK } = ctx.clock;
  return activeWallet(ctx).some(w => {
    const p = productOf(ctx, w.product); if (!p) return false;
    if ((p.rules || []).some(r => r.cats.includes(cat.id))) return true;
    if ((p.choice || []).some(s => selCats(w, s).includes(cat.id))) return true;
    const q = p.rotating && p.rotating.schedule[QK]; if (q && q.cats.includes(cat.id)) return true;
    return !!(p.auto && w.autoFocus === cat.id);
  });
}
export const visibleCats = (ctx: Ctx) => CATS.filter(c => !c.niche || directHit(ctx, c));

/* ─── Tasks (quarterly activation & picks) ─── */
export interface Task { kind: 'activate' | 'confirm' | 'pick'; key?: string; q?: string; text: string; sub: string }
export function tasksFor(ctx: Ctx, w: WalletCard): Task[] {
  const { NOW, TODAY, QK, NQK, daysLeftInQ, PICK_Q } = ctx.clock;
  const p = productOf(ctx, w.product); if (!p) return []; const t: Task[] = [];
  if (p.rotating) {
    const r = p.rotating;
    [QK, NQK].forEach(k => {
      const q = r.schedule[k]; if (!q || w.activated.includes(k)) return;
      if (k === NQK && (!q.opens || q.opens > TODAY)) return;
      if (k === QK) {
        if (r.retroactive) { if (qDeadline(k, r.deadlineDay || 31) < NOW) return; }
        else if (daysLeftInQ <= 2) return;
      }
      const due = r.retroactive ? `Activate by ${shortDate(qDeadline(k, r.deadlineDay || 31))}`
        : (k === QK ? `Ends ${shortDate(qEnd(k))}` : `Starts ${shortDate(qStart(k))}, activate before you spend`);
      t.push({ kind: 'activate', key: 'act:' + k, q: k, text: `Activate ${qLabel(k)}: ${q.label}`, sub: due });
    });
  }
  const quarterly = (p.choice || []).filter(s => s.period === 'quarter');
  const stale = quarterly.filter(s => { const x = w.sel[s.id]; return x && x.opts && x.opts.length && (!x.quarter || x.quarter < PICK_Q); });
  if (stale.length) {
    const summ = quarterly.map(s => `${s.rate}% ${selLabels(w, s).join(', ') || 'not set'}`).join(' · ');
    t.push({ kind: 'confirm', key: 'confirm:' + PICK_Q, text: `Confirm ${qLabel(PICK_Q)} picks`, sub: summ });
  }
  (p.choice || []).forEach(s => { if (!selOpts(w, s).length) t.push({ kind: 'pick', text: `Choose ${s.label.replace('Your ', 'your ')}`, sub: s.note || '' }); });
  if (p.auto && !w.autoFocus) t.push({ kind: 'pick', text: 'Set which category you expect to earn 5%', sub: p.auto.note || '' });
  return t.filter(x => !x.key || !w.dismissed.includes(x.key));
}
export const allTasks = (ctx: Ctx) => activeWallet(ctx).flatMap(w => tasksFor(ctx, w).map(t => ({ ...t, w })));

/* ─── Search (Earn) ─── */
export const norm = (s?: string) => (s || '').toLowerCase().replace(/[’'.&+-]/g, '').replace(/\s+/g, ' ').trim();
export function searchAll(ctx: Ctx, q: string): { st: Store[]; ct: Category[] } {
  q = norm(q); if (!q) return { st: [], ct: [] };
  const score = (name: string, aka?: string) => {
    const n = norm(name);
    if (n.startsWith(q)) return 3;
    if (n.split(' ').some(w => w.startsWith(q))) return 2;
    if (n.includes(q) || norm(aka).includes(q)) return 1;
    return 0;
  };
  const st = (ctx.catalog.stores || []).map(s => ({ s, sc: score(s.name, s.aka) })).filter(x => x.sc)
    .sort((a, b) => b.sc - a.sc || a.s.name.localeCompare(b.s.name)).slice(0, 8).map(x => x.s);
  const ct = CATS.map(c => ({ c, sc: score(c.label, c.kw) })).filter(x => x.sc).sort((a, b) => b.sc - a.sc).slice(0, 5).map(x => x.c);
  return { st, ct };
}
