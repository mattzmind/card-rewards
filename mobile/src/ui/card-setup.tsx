/* Card setup form: quarterly bonus activation, chosen categories (dropdowns, like the bank's own site),
   Citi Custom Cash's top category, and a first-year bonus. It's controlled: the screen holds the draft and
   decides when to save (the add flow's setup page, or card details' Save changes). */
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { catName } from '@/core/cats';
import { iso, qDeadline, qEnd, qLabel, qStart, shortDate } from '@/core/dates';
import { type Ctx, brandOf, fmtRate, productOf, selOpts } from '@/core/engine';
import type { Product, WalletCard } from '@/core/types';

import { Icon } from './icon';
import { tap } from './parts';
import { Select } from './select';
import { fonts, useColors } from './theme';

export interface SetupDraft {
  sel: Record<string, (string | undefined)[]>;
  autoFocus?: string;
  activated: string[];   // this and next quarter's bonuses marked activated
  opened?: string;       // first-year bonus: 'YYYY-MM' the card was opened, or 'old'
}

export const needsSetup = (p?: Product) => !!p && !!((p.choice || []).length || p.rotating || p.auto || p.firstYear);
const FIRST_YEAR = 'firstYear';

export function draftOf(ctx: Ctx, w: WalletCard): SetupDraft {
  const p = productOf(ctx, w.product), { QK, NQK } = ctx.clock;
  const sel = Object.fromEntries((p?.choice || []).map(s => {
    const cur = selOpts(w, s); return [s.id, Array.from({ length: s.pick }, (_, i) => cur[i])];
  }));
  const fy = w.promos.find(x => x.src === FIRST_YEAR);
  return { sel, autoFocus: w.autoFocus, activated: w.activated.filter(k => k === QK || k === NQK), opened: fy?.opened };
}
const picks = (a?: (string | undefined)[]) => (a || []).filter(Boolean) as string[];
export function draftDirty(ctx: Ctx, w: WalletCard, d: SetupDraft) {
  const o = draftOf(ctx, w);
  return JSON.stringify([Object.values(d.sel).map(picks), d.autoFocus || '', [...d.activated].sort(), d.opened || ''])
    !== JSON.stringify([Object.values(o.sel).map(picks), o.autoFocus || '', [...o.activated].sort(), o.opened || '']);
}
/* Every category dropdown filled in */
export const draftComplete = (p: Product | undefined, d: SetupDraft) => (p?.choice || []).every(s => picks(d.sel[s.id]).length === s.pick);
export const missingText = (p: Product | undefined, d: SetupDraft) => {
  const s = (p?.choice || []).find(x => picks(d.sel[x.id]).length !== x.pick);
  return s ? `Choose ${s.pick === 1 ? 'a category' : `${s.pick} categories`} for ${fmtRate(s.rate)}% to save.` : '';
};
/* The promo the first-year answer turns into (ends the month it turns one) */
export function firstYearPromo(p: Product, opened?: string) {
  if (!p.firstYear || !opened || opened === 'old') return null;
  const [y, m] = opened.split('-').map(Number);
  return { extra: p.firstYear.extra, until: iso(new Date(y, m - 1 + p.firstYear.months, 0)), label: p.firstYear.label, opened, src: FIRST_YEAR };
}

export function CardSetupForm({ ctx, w, draft, onChange }: { ctx: Ctx; w: WalletCard; draft: SetupDraft; onChange: (d: SetupDraft) => void }) {
  const c = useColors(), p = productOf(ctx, w.product), [open, setOpen] = useState<string | null>(null);
  if (!p || !needsSetup(p)) return null;
  const { QK, NQK, PICK_Q, NOW } = ctx.clock, bank = brandOf(ctx, p.brand);
  const toggle = (k: string) => setOpen(o => (o === k ? null : k));
  const set = (patch: Partial<SetupDraft>) => { onChange({ ...draft, ...patch }); setOpen(null); };
  const S = styles;

  return (
    <View style={{ gap: 12 }}>
      {p.rotating ? (
        <View style={[S.card, { backgroundColor: c.surface }]}>
          <Text style={[S.h, { color: c.ink }]}>{fmtRate(p.rotating.rate)}% quarterly bonus</Text>
          <Text style={[S.sub, { color: c.muted }]}>{p.rotating.activateHint || `Activate each quarter with ${bank.name}, then mark it here.`}</Text>
          {[QK, NQK].map(k => {
            const q = p.rotating!.schedule[k]; if (!q) return null;
            const on = draft.activated.includes(k), r = p.rotating!;
            const when = k === QK ? `Now until ${shortDate(qEnd(k))}` : `Starts ${shortDate(qStart(k))}`;
            const due = r.retroactive ? ` · activate by ${shortDate(qDeadline(k, r.deadlineDay || 31))}` : '';
            return (
              <View key={k} style={[S.qRow, { borderTopColor: c.line }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[S.rowTitle, { color: c.ink }]}>{qLabel(k)}: {q.label}</Text>
                  <Text style={[S.sub, { color: c.muted }]}>{when}{due}</Text>
                </View>
                <Pressable onPress={() => { tap(); set({ activated: on ? draft.activated.filter(x => x !== k) : [...draft.activated, k] }); }}
                  accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  style={[S.chip, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.line }]}>
                  {on ? <Icon name="check" color={c.onPrimary} size={14} strokeWidth={2.4} /> : null}
                  <Text style={[S.chipText, { color: on ? c.onPrimary : c.ink }]}>{on ? 'Activated' : 'Mark activated'}</Text>
                </Pressable>
              </View>
            );
          })}
          {bank.login ? (
            <Pressable onPress={() => { tap(); Linking.openURL(bank.login!).catch(() => {}); }} style={S.link} accessibilityRole="link">
              <Text style={[S.linkText, { color: c.accent }]}>Activate with {bank.name}</Text><Icon name="chevR" color={c.accent} size={16} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {(p.choice || []).length ? (
        <View style={[S.card, { backgroundColor: c.surface }]}>
          {(p.choice || []).map((s, si) => {
            const cur = draft.sel[s.id] || [];
            return (
              <View key={s.id} style={si > 0 && { marginTop: 18 }}>
                <View style={S.slotHead}>
                  <Text style={[S.rate, { color: c.rate }]}>{fmtRate(s.rate)}%</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.rowTitle, { color: c.ink }]}>Choose {s.pick}{s.period === 'quarter' ? ` for ${qLabel(PICK_Q)}` : ''}</Text>
                    {s.note ? <Text style={[S.sub, { color: c.muted }]}>{s.note}</Text> : null}
                  </View>
                </View>
                <View style={{ gap: 8, marginTop: 10 }}>
                  {Array.from({ length: s.pick }, (_, i) => (
                    <Select key={i} label={`${fmtRate(s.rate)}% category ${i + 1}`} value={cur[i]} open={open === `${s.id}:${i}`} onToggle={() => toggle(`${s.id}:${i}`)}
                      options={s.options} taken={picks(cur.filter((_, j) => j !== i))}
                      onChange={id => { const next = Array.from({ length: s.pick }, (_, j) => (j === i ? id : cur[j])); set({ sel: { ...draft.sel, [s.id]: next } }); }} />
                  ))}
                </View>
              </View>
            );
          })}
          <Text style={[S.hint, { color: c.muted }]}>Pick the same categories you chose with {bank.name}. Most banks lock them until next quarter.</Text>
        </View>
      ) : null}

      {p.auto ? (
        <View style={[S.card, { backgroundColor: c.surface }]}>
          <View style={S.slotHead}>
            <Text style={[S.rate, { color: c.rate }]}>{fmtRate(p.auto.rate)}%</Text>
            <View style={{ flex: 1 }}>
              <Text style={[S.rowTitle, { color: c.ink }]}>Where will you use this card most?</Text>
              <Text style={[S.sub, { color: c.muted }]}>{bank.name} pays {fmtRate(p.auto.rate)}% on whichever of these you spend the most in each billing cycle. Pick one and Lucro will suggest this card there, so your spending lands in that category.</Text>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <Select label="Top category" value={draft.autoFocus} open={open === 'auto'} onToggle={() => toggle('auto')}
              options={p.auto.options.map(o => ({ id: o, label: catName(o) }))} onChange={id => set({ autoFocus: id })} />
          </View>
          {p.auto.note ? <Text style={[S.hint, { color: c.muted }]}>{p.auto.note}</Text> : null}
        </View>
      ) : null}

      {p.firstYear ? (
        <View style={[S.card, { backgroundColor: c.surface }]}>
          <View style={S.slotHead}>
            <Text style={[S.rate, { color: c.rate }]}>+{fmtRate(p.firstYear.extra)}%</Text>
            <View style={{ flex: 1 }}>
              <Text style={[S.rowTitle, { color: c.ink }]}>{p.firstYear.label.replace(/^First-year bonus: /, 'First year: ')}</Text>
              {p.firstYear.note ? <Text style={[S.sub, { color: c.muted }]}>{p.firstYear.note}</Text> : null}
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <Select label="Did you get this offer" placeholder="Did you get this offer? When did you open it?" value={draft.opened} open={open === 'opened'} onToggle={() => toggle('opened')}
              options={[{ id: 'old', label: 'No, or I opened it over a year ago' }, ...Array.from({ length: p.firstYear.months }, (_, i) => {
                const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
                return { id: iso(d).slice(0, 7), label: `Yes, opened ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` };
              })]}
              onChange={id => set({ opened: id })} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 14 },
  h: { fontFamily: fonts.display, fontSize: 18 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  sub: { fontFamily: fonts.body, fontSize: 13, marginTop: 2, lineHeight: 18 },
  hint: { fontFamily: fonts.body, fontSize: 13, marginTop: 12, lineHeight: 18 },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 40 },
  chipText: { fontFamily: fonts.medium, fontSize: 14 },
  slotHead: { flexDirection: 'row', gap: 12 },
  rate: { fontFamily: fonts.display, fontSize: 22, minWidth: 48 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, marginTop: 6 },
  linkText: { fontFamily: fonts.semibold, fontSize: 15 },
});
