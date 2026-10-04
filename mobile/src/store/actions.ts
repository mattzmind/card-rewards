/* Things you can do to your wallet. Each one saves, gives haptic feedback and (where it makes sense)
   shows a toast with Undo, matching the web app's behavior. */
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import { iso, isoToDate, makeClock, shortDate } from '@/core/dates';
import { type Ctx, dn, fmtRate, periodEnd, productOf } from '@/core/engine';
import type { AppState, Report, WalletCard } from '@/core/types';
import { capLabel } from '@/core/wallet';
import { toast } from '@/ui/toast';

import { newCard, useApp } from './app';

const st = () => useApp.getState();
const card = (s: AppState, id: string) => s.wallet.find(w => w.id === id);
const nameOf = (ctx: Ctx, ids: string[]) => {
  const ws = ids.map(id => card(ctx.state, id)).filter(Boolean) as WalletCard[];
  return ws.length === 1 ? dn(ctx, ws[0]) : `${ws.length} cards`;
};
const buzz = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
const ctxNow = (): Ctx => { const { state, catalog } = st(); return { state, catalog, clock: makeClock() }; };

export function setInactive(ids: string[], off: boolean, confirmed = false) {
  const ctx = ctxNow(), name = nameOf(ctx, ids), one = ids.length === 1;
  if (off && !confirmed) {
    Alert.alert(`Deactivate ${name}?`, `${one ? 'It' : 'They'} will move to your deactivated cards and stop showing on Earn and in notifications. You can reactivate ${one ? 'it' : 'them'} any time.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Deactivate', onPress: () => setInactive(ids, true, true) }]);
    return;
  }
  const today = iso(new Date());
  st().update(s => ids.forEach(id => { const w = card(s, id); if (!w) return; if (off) w.inactive = today; else delete w.inactive; }));
  buzz();
  toast(`${name} ${off ? 'deactivated' : 'reactivated'}`, () => st().update(s => ids.forEach(id => { const w = card(s, id); if (!w) return; if (off) delete w.inactive; else w.inactive = today; })));
}

export function removeCards(ids: string[], after?: () => void) {
  const ctx = ctxNow(), name = nameOf(ctx, ids), one = ids.length === 1;
  Alert.alert(`Remove ${name}?`, one
    ? 'It will be deleted from your wallet and its history. To keep it in your history, deactivate it instead.'
    : 'They will be deleted from your wallet and its history. To keep them in your history, deactivate them instead.',
  [{ text: 'Cancel', style: 'cancel' }, {
    text: 'Remove', style: 'destructive', onPress: () => {
      const before = st().state.wallet;
      st().update(s => { s.wallet = s.wallet.filter(w => !ids.includes(w.id)); });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      after?.();
      toast(`${name} removed`, () => st().update(s => { s.wallet = before; }));
    },
  }]);
}

export function togglePin(id: string) {
  let pinned = false, name = '';
  st().update(s => { const w = card(s, id); if (!w) return; w.pinned = !w.pinned; pinned = w.pinned; });
  name = dn(ctxNow(), card(st().state, id)!);
  Haptics.selectionAsync().catch(() => {});
  toast(pinned ? `${name} pinned to the top` : `${name} unpinned`);
}

/* Manual moves switch the list to "My order", keeping exactly what was on screen */
export function freezeOrder(shown: string[]) {
  const s = st().state; if (!s.view || s.view.sort === 'custom') return false;
  st().update(x => { const rest = x.wallet.filter(w => !shown.includes(w.id)); x.wallet = [...shown.map(id => card(x, id)!).filter(Boolean), ...rest]; x.view = { ...x.view!, sort: 'custom' }; });
  return true;
}
export function moveTo(id: string, where: 'top' | 'bottom', shown: string[]) {
  freezeOrder(shown);
  st().update(s => { const i = s.wallet.findIndex(w => w.id === id); const [w] = s.wallet.splice(i, 1); if (where === 'top') s.wallet.unshift(w); else s.wallet.push(w); });
  toast(`${dn(ctxNow(), card(st().state, id)!)} moved to the ${where}`);
}
/* Put these cards back into the same slots in the wallet, in their new order */
export function reorder(ids: string[], shown: string[]) {
  const switched = freezeOrder(shown);
  st().update(s => {
    const slots = s.wallet.map((w, i) => (ids.includes(w.id) ? i : -1)).filter(i => i >= 0);
    const byId = Object.fromEntries(s.wallet.map(w => [w.id, w]));
    slots.forEach((slot, k) => { s.wallet[slot] = byId[ids[k]]; });
  });
  if (switched) toast('Sorted by My order');
}

export function rename(id: string, nickname: string) {
  const old = card(st().state, id)?.nickname || '', v = nickname.trim().slice(0, 40);
  st().update(s => { const w = card(s, id); if (w) w.nickname = v; });
  toast(v ? `Renamed to ${v}` : "Using the card's own name", () => st().update(s => { const w = card(s, id); if (w) w.nickname = old; }));
}
export function setField<K extends keyof WalletCard>(id: string, f: K, v: WalletCard[K]) {
  st().update(s => { const w = card(s, id); if (w) w[f] = v; });
}
export function toggleAct(id: string, q: string) {
  st().update(s => { const w = card(s, id); if (!w) return; w.activated = w.activated.includes(q) ? w.activated.filter(x => x !== q) : [...w.activated, q]; });
  Haptics.selectionAsync().catch(() => {});
}
export function savePicks(id: string, draft: Record<string, (string | undefined)[]>) {
  const ctx = ctxNow(), w0 = card(ctx.state, id); if (!w0) return; const p = productOf(ctx, w0.product)!;
  const before = structuredClone(w0.sel);
  st().update(s => { const w = card(s, id)!; (p.choice || []).forEach(sl => { w.sel[sl.id] = { opts: (draft[sl.id] || []).filter(Boolean).slice(0, sl.pick) as string[], quarter: sl.period === 'quarter' ? ctx.clock.PICK_Q : undefined }; }); });
  buzz();
  toast('Categories saved', () => st().update(s => { const w = card(s, id); if (w) w.sel = before; }));
}
export function confirmSame(id: string) {
  const ctx = ctxNow();
  st().update(s => { const w = card(s, id); if (!w) return; (productOf(ctx, w.product)?.choice || []).forEach(sl => { const x = w.sel[sl.id]; if (sl.period === 'quarter' && x) x.quarter = ctx.clock.PICK_Q; }); });
  buzz(); toast('Picks confirmed');
}
export function startAct(id: string, key: string) { st().update(s => { const w = card(s, id); if (w) w.pending = key; }); }
export function finishAct(id: string, q: string, done: boolean) {
  st().update(s => { const w = card(s, id); if (!w) return; w.pending = null; if (done && !w.activated.includes(q)) w.activated.push(q); });
  if (done) { buzz(); toast(`${dn(ctxNow(), card(st().state, id)!)} bonus activated`); }
}
export function dismissTask(id: string, key: string) {
  st().update(s => { const w = card(s, id); if (w) w.dismissed.push(key); });
  toast('Reminder dismissed', () => st().update(s => { const w = card(s, id); if (w) w.dismissed = w.dismissed.filter(k => k !== key); }));
}
export function markCap(id: string, key: string, per: string) {
  const ctx = ctxNow(), until = periodEnd(ctx, per), prev = card(ctx.state, id)?.capped[key];
  st().update(s => { const w = card(s, id); if (w) w.capped[key] = until; });
  buzz();
  toast(`${capLabel(ctx, card(ctx.state, id)!, key)} marked as capped until ${shortDate(isoToDate(until))}`,
    () => st().update(s => { const w = card(s, id); if (!w) return; if (prev) w.capped[key] = prev; else delete w.capped[key]; }));
}
export function undoCap(id: string, key: string) { st().update(s => { const w = card(s, id); if (w) delete w.capped[key]; }); }

export function addCard(product: string, opts: { nickname?: string; last4?: string; network?: string }) {
  const ctx = ctxNow(), p = productOf(ctx, product)!, w = newCard(product);
  w.nickname = (opts.nickname || '').trim(); w.last4 = opts.last4 || '';
  if (p.networkOptions && opts.network && opts.network !== p.network) w.network = opts.network;
  (w as { added?: number }).added = Date.now();
  st().update(s => { s.wallet.push(w); s.onboarded = true; });
  buzz();
  return w;
}

export const REASONS = ['Another card earns more here', "This card isn't accepted here", 'The store is in the wrong category', 'The rate shown is wrong'];
export function addReport(r: Omit<Report, 'at'>) {
  st().update(s => { s.reports.unshift({ at: iso(new Date()), ...r }); });
  buzz(); toast('Thanks! Feedback saved in notifications');
}
export function clearReports() {
  Alert.alert('Clear all feedback?', 'Your saved reports will be deleted from this phone.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => { st().update(s => { s.reports = []; }); toast('Reports cleared'); } },
  ]);
}
export const reportLine = (r: Report) => `${r.at} | ${r.where} | ${r.card} | ${r.reason}${r.note ? ' | ' + r.note : ''}`;
export const rateText = (r: number) => fmtRate(r) + '%';
