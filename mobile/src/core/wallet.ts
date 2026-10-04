/* Wallet list logic: sort, group, filter, top rate and "best for" (port of src/wallet.js, minus the DOM). */
import { CATS, catById } from './cats';
import { isoToDate, qLabel, shortDate } from './dates';
import { type Ctx, activeWallet, brandOf, dn, evalCard, fmtRate, netLabel, netOf, productOf, tasksFor, visibleCats } from './engine';
import type { WalletCard, WalletFilter, WalletView } from './types';

export const FILTER_DEFAULT: WalletFilter = { person: 'all', earns: 'all', type: 'all', bank: 'all', network: 'all', fee: 'all', status: 'all' };
export const VIEW_DEFAULT: WalletView = { sort: 'custom', order: 'asc', group: 'none', f: { ...FILTER_DEFAULT }, showRate: true, showLast4: true };
export const SORTS: Record<WalletView['sort'], string> = { custom: 'My order', rewards: 'Highest rewards', name: 'Name A–Z', bank: 'Bank', added: 'Recently added' };
export const GROUPS: Record<WalletView['group'], string> = { none: 'No groups', person: 'Person', bank: 'Bank', type: 'Reward type' };
/* Each sort's natural direction: A–Z, highest first, newest first */
export const SORT_NATURAL: Record<WalletView['sort'], 'asc' | 'desc'> = { custom: 'asc', rewards: 'desc', name: 'asc', bank: 'asc', added: 'desc' };
const TYPE_LABEL: Record<string, string> = { cash: 'Cash back', points: 'Points', miles: 'Miles' };

/* Saved per phone; fill in anything missing */
export function viewOf(ctx: Ctx): WalletView {
  const v = { ...VIEW_DEFAULT, ...(ctx.state.view || {}) } as WalletView;
  v.f = { ...FILTER_DEFAULT, ...(v.f || {}) };
  return v;
}

/* Best rate a card can earn anywhere, counted in cents per dollar (points valued at their ¢ estimate) */
export function topRate(ctx: Ctx, w: WalletCard) {
  const p = productOf(ctx, w.product); if (!p) return 0;
  const mult = p.type === 'cash' ? 1 : (p.cpp || 1);
  const rates = [p.base || 0, ...(p.rules || []).filter(r => !r.cond).map(r => r.rate), ...(p.choice || []).map(s => s.rate)];
  if (p.rotating) rates.push(p.rotating.rate); if (p.auto) rates.push(p.auto.rate);
  return Math.round(Math.max(...rates) * mult * 100) / 100;
}
const addedAt = (w: WalletCard) => (w as { added?: number }).added || (+(String(w.id).match(/^w(\d{12,})/) || [])[1] || 0);

/* earns more than its everyday rate at this category (promos that boost everything don't count) */
export function earnsExtra(ctx: Ctx, w: WalletCard, catId: string) {
  const p = productOf(ctx, w.product), c = catById(catId); if (!p || !c) return false;
  const e = evalCard(ctx, w, c, null); if (!e) return false;
  const mult = p.type === 'cash' ? 1 : (p.cpp || 1), promo = e.extras.reduce((t, x) => t + x.extra, 0) * mult;
  return e.rate - promo > (p.base || 0) * mult + 0.001;
}

export function walletFiltered(ctx: Ctx, list: WalletCard[], f: WalletFilter = viewOf(ctx).f) {
  const { TODAY } = ctx.clock;
  return list.filter(w => {
    const p = productOf(ctx, w.product);
    if (f.person !== 'all' && w.owner !== f.person) return false;
    if (f.earns !== 'all' && !earnsExtra(ctx, w, f.earns)) return false;
    if (f.type !== 'all' && (p?.type || 'cash') !== f.type) return false;
    if (f.bank !== 'all' && p?.brand !== f.bank) return false;
    if (f.network !== 'all' && netOf(ctx, w) !== f.network) return false;
    if (f.fee === 'none' && p && (p.fee || 0) > 0) return false;
    if (f.fee === 'paid' && !(p && (p.fee || 0) > 0)) return false;
    if (f.status === 'setup' && !(!w.inactive && tasksFor(ctx, w).length)) return false;
    if (f.status === 'pinned' && !w.pinned) return false;
    if (f.status === 'intro' && !(w.introApr && w.introApr >= TODAY)) return false;
    return true;
  });
}
export const activeFilterCount = (f: WalletFilter) => (Object.keys(FILTER_DEFAULT) as (keyof WalletFilter)[]).filter(k => f[k] !== FILTER_DEFAULT[k]).length;

export function walletSorted(ctx: Ctx, list: WalletCard[], v: WalletView = viewOf(ctx)) {
  const s = v.sort, idx = new Map(ctx.state.wallet.map((w, i) => [w.id, i])), a = [...list];
  const bank = (w: WalletCard) => { const p = productOf(ctx, w.product); return p ? brandOf(ctx, p.brand).name : '~'; };
  if (s === 'rewards') a.sort((x, y) => topRate(ctx, x) - topRate(ctx, y) || idx.get(x.id)! - idx.get(y.id)!);
  else if (s === 'name') a.sort((x, y) => dn(ctx, x).localeCompare(dn(ctx, y)));
  else if (s === 'bank') a.sort((x, y) => bank(x).localeCompare(bank(y)) || dn(ctx, x).localeCompare(dn(ctx, y)));
  else if (s === 'added') a.sort((x, y) => addedAt(x) - addedAt(y) || idx.get(x.id)! - idx.get(y.id)!);
  else { a.sort((x, y) => idx.get(x.id)! - idx.get(y.id)!); return a; }
  return v.order === 'desc' ? a.reverse() : a;
}

export interface Group { key: string; title: string; items: WalletCard[] }
export function walletGroups(ctx: Ctx, list: WalletCard[], v: WalletView = viewOf(ctx), multiPeople = false): Group[] {
  const g = v.group;
  if (g === 'none' || (g === 'person' && !multiPeople)) return [{ key: 'all', title: '', items: list }];
  const map = new Map<string, Group>(), add = (k: string, t: string, w: WalletCard) => { if (!map.has(k)) map.set(k, { key: k, title: t, items: [] }); map.get(k)!.items.push(w); };
  if (g === 'person') {
    ctx.state.people.forEach(pp => map.set(pp.id, { key: pp.id, title: `${pp.name}'s cards`, items: [] }));
    list.forEach(w => (w.owner && map.has(w.owner) ? map.get(w.owner)!.items.push(w) : add('none', 'Unassigned', w)));
  } else if (g === 'bank') {
    walletSorted(ctx, list, v).forEach(w => { const p = productOf(ctx, w.product), k = p ? p.brand : 'other'; add(k, p ? brandOf(ctx, k).name : 'Other', w); });
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title)).map(x => ({ ...x, items: walletSorted(ctx, x.items, v) }));
  } else if (g === 'type') {
    ['cash', 'points', 'miles'].forEach(t => map.set(t, { key: t, title: TYPE_LABEL[t], items: [] }));
    list.forEach(w => { const t = productOf(ctx, w.product)?.type || 'cash'; (map.get(t) || map.get('cash'))!.items.push(w); });
  }
  return [...map.values()].filter(x => x.items.length);
}

/* What a card is best for: its top two bonus categories, e.g. "6% grocery · 3% gas" */
export interface BestPill { rate: string; label: string; warn?: boolean }
export function bestFor(ctx: Ctx, w: WalletCard): BestPill[] {
  const { QK } = ctx.clock;
  const p = productOf(ctx, w.product); if (!p) return [];
  const mult = p.type === 'cash' ? 1 : (p.cpp || 1);
  const hits = visibleCats(ctx).filter(c => c.id !== 'other').map(c => { const e = evalCard(ctx, w, c, null); return e ? { c, r: e.rate - e.extras.reduce((t, x) => t + x.extra, 0) * mult } : null; })
    .filter((x): x is { c: (typeof CATS)[number]; r: number } => !!x && x.r > (p.base || 0) * mult + 0.001)
    .sort((a, b) => b.r - a.r || (a.c.parent ? 1 : 0) - (b.c.parent ? 1 : 0));
  const seen = new Set<string>(), top: typeof hits = [];
  for (const h of hits) { if (top.length >= 2) break; const k = h.r + '|' + (h.c.parent || h.c.id); if (seen.has(k)) continue; seen.add(k); top.push(h); }
  const q = p.rotating && p.rotating.schedule[QK];
  const pend: BestPill[] = q && !w.activated.includes(QK) ? [{ rate: fmtRate(p.rotating!.rate) + '%', label: q.label.split(/,| &/)[0].toLowerCase() + ' · activate', warn: true }] : [];
  if (!top.length) return [...pend, { rate: fmtRate((p.base || 0) * mult) + '%', label: 'everywhere' }];
  return [...pend, ...top.slice(0, pend.length ? 1 : 2).map(h => ({ rate: fmtRate(Math.round(h.r * 100) / 100) + '%', label: h.c.label.toLowerCase() }))];
}

/* Filter sheet rows: only the filters that make sense for this wallet */
export interface FilterDef { k: keyof WalletFilter; icon: string; label: string; hint?: string; opts: [string, string][] }
export function filterDefs(ctx: Ctx, multiPeople = false): FilterDef[] {
  const ws = ctx.state.wallet, ps = ws.map(w => productOf(ctx, w.product)).filter(Boolean) as NonNullable<ReturnType<typeof productOf>>[];
  const uniq = <T,>(a: T[]) => [...new Set(a)];
  const defs: FilterDef[] = [];
  if (multiPeople) defs.push({ k: 'person', icon: 'user', label: 'Whose card', opts: [['all', 'Everyone'], ...ctx.state.people.filter(pp => ws.some(w => w.owner === pp.id)).map(pp => [pp.id, pp.name] as [string, string])] });
  const cats = visibleCats(ctx).filter(c => c.id !== 'other' && ws.some(w => earnsExtra(ctx, w, c.id)));
  defs.push({ k: 'earns', icon: 'star', label: 'Earns extra at', hint: 'Cards that earn more than their everyday rate there', opts: [['all', 'Anywhere'], ...cats.map(c => [c.id, c.label] as [string, string])] });
  const types = uniq(ps.map(p => p.type));
  if (types.length > 1) defs.push({ k: 'type', icon: 'gauge', label: 'Reward type', opts: [['all', 'All'], ...['cash', 'points', 'miles'].filter(t => types.includes(t)).map(t => [t, TYPE_LABEL[t]] as [string, string])] });
  const banks = uniq(ps.map(p => p.brand)).sort((a, b) => brandOf(ctx, a).name.localeCompare(brandOf(ctx, b).name));
  if (banks.length > 1) defs.push({ k: 'bank', icon: 'home', label: 'Bank', opts: [['all', 'All banks'], ...banks.map(b => [b, brandOf(ctx, b).name] as [string, string])] });
  const nets = uniq(ws.map(w => netOf(ctx, w)).filter(Boolean) as string[]);
  if (nets.length > 1) defs.push({ k: 'network', icon: 'pay', label: 'Network', hint: 'Handy where only some cards are accepted, like Costco (Visa)', opts: [['all', 'All networks'], ...nets.sort().map(n => [n, netLabel(n)] as [string, string])] });
  if (ps.some(p => (p.fee || 0) > 0) && ps.some(p => !((p.fee || 0) > 0))) defs.push({ k: 'fee', icon: 'tag', label: 'Annual fee', opts: [['all', 'All'], ['none', 'No annual fee'], ['paid', 'Has an annual fee']] });
  defs.push({ k: 'status', icon: 'flag', label: 'Status', opts: [['all', 'All cards'], ['setup', 'Needs setup'], ['pinned', 'Pinned'], ['intro', '0% intro APR']] });
  return defs;
}
export function filterValueLabel(ctx: Ctx, k: keyof WalletFilter, val: string) {
  const d = filterDefs(ctx).find(x => x.k === k); const o = d && d.opts.find(x => x[0] === val); return o ? o[1] : val;
}

/* Wallet header numbers: best rate anywhere, everyday rate */
export function walletSummary(ctx: Ctx) {
  let best: { rate: number; catId: string; catLabel: string; card: string } | null = null;
  visibleCats(ctx).filter(c => c.id !== 'other').forEach(c => {
    const r = activeWallet(ctx).map(w => evalCard(ctx, w, c, null)).filter(Boolean).sort((a, b) => b!.rate - a!.rate)[0];
    if (r && (!best || r.rate > best.rate)) best = { rate: r.rate, catId: c.id, catLabel: c.label, card: dn(ctx, r.w) };
  });
  const other = catById('other')!;
  const every = activeWallet(ctx).map(w => evalCard(ctx, w, other, null)).filter(Boolean).sort((a, b) => b!.rate - a!.rate)[0];
  const banks = new Set(activeWallet(ctx).map(w => productOf(ctx, w.product)?.brand).filter(Boolean)).size;
  return { best: best as { rate: number; catId: string; catLabel: string; card: string } | null, everyday: every ? every.rate : null, banks };
}

export const deactivatedLabel = (ctx: Ctx, w: WalletCard) =>
  w.inactive ? `Deactivated ${shortDate(isoToDate(w.inactive))}${w.inactive.slice(0, 4) !== ctx.clock.TODAY.slice(0, 4) ? ', ' + w.inactive.slice(0, 4) : ''}` : '';

/* Name of a capped bonus, for "X marked as capped" */
export function capLabel(ctx: Ctx, w: WalletCard, key: string) {
  const p = productOf(ctx, w.product); if (!p) return key;
  if (key[0] === 'r') return (p.rules || [])[+key.slice(1)]?.label || 'Bonus';
  if (key.startsWith('c:')) return (p.choice || []).find(s => 'c:' + s.id === key)?.label || 'Your pick';
  return key === 'rot' ? 'Quarterly ' + fmtRate(p.rotating?.rate || 5) + '%' : 'Top category ' + fmtRate(p.auto?.rate || 5) + '%';
}
export { qLabel };
