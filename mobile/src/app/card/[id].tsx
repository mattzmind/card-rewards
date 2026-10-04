/* Card details: setup (quarterly bonus, chosen categories, top category), caps, reward tiers,
   perks, last 4 / network, and Deactivate / Remove. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { catName } from '@/core/cats';
import { isoToDate, qDeadline, qEnd, qLabel, qStart, shortDate } from '@/core/dates';
import { brandOf, capWord, dn, fmtRate, netLabel, netOf, productOf, selLabels, selOpts } from '@/core/engine';
import type { ChoiceSlot, WalletCard } from '@/core/types';
import { capLabel } from '@/core/wallet';
import { confirmSame, removeCards, rename, savePicks, setField, setInactive, toggleAct, undoCap } from '@/store/actions';
import { useCtx } from '@/store/app';
import { CardArt } from '@/ui/card-art';
import { Icon } from '@/ui/icon';
import { Button, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

const isDefaultSel = (w: WalletCard, s: ChoiceSlot) => !(w.sel[s.id]?.opts?.length) && !!s.default;

export default function CardDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(), ctx = useCtx();
  const w = ctx.state.wallet.find(x => x.id === id);
  const [naming, setNaming] = useState(false), [nick, setNick] = useState('');
  if (!w) return null;
  const p = productOf(ctx, w.product), name = dn(ctx, w);
  const { QK, NQK, TODAY } = ctx.clock;
  const S = makeStyles(c);

  const footer = (
    <View style={{ gap: 10, marginTop: 28 }}>
      <Button title="Done" onPress={() => router.back()} />
      <Pressable onPress={() => { tap(); setInactive([w.id], !w.inactive); }} style={S.outline}>
        <Icon name={w.inactive ? 'restore' : 'archive'} color={c.ink} size={20} /><Text style={S.outlineText}>{w.inactive ? 'Reactivate card' : 'Deactivate card'}</Text>
      </Pressable>
      <Pressable onPress={() => { tap(); removeCards([w.id], () => router.back()); }} style={[S.outline, { borderColor: c.danger + '73' }]}>
        <Icon name="trash" color={c.danger} size={20} /><Text style={[S.outlineText, { color: c.danger }]}>Remove from wallet</Text>
      </Pressable>
      {!w.inactive ? <Text style={[S.hint, { textAlign: 'center' }]}>Deactivate keeps the card in your history but stops using it on Earn.</Text> : null}
    </View>
  );
  if (!p) return <ScrollView contentContainerStyle={S.wrap}><Text style={S.h}>{name}</Text><Text style={S.sub}>This card isn't in the catalog anymore.</Text>{footer}</ScrollView>;

  const unit = p.type !== 'cash' ? 'x' : '%', brand = brandOf(ctx, p.brand);
  const tiers: { rate: number; t: string; s: string }[] = [];
  (p.rules || []).forEach(r => tiers.push({ rate: r.rate, t: r.label, s: [r.cond, r.note].filter(Boolean).join(' · ') }));
  (p.choice || []).forEach(s => { const l = selLabels(w, s); tiers.push({ rate: s.rate, t: `${s.label}: ${l.length ? l.join(', ') : 'not set'}${isDefaultSel(w, s) ? ' (default)' : ''}`, s: s.note || '' }); });
  if (p.rotating) { const q = p.rotating.schedule[QK]; tiers.push({ rate: p.rotating.rate, t: `${qLabel(QK)}: ${q ? q.label : 'not announced yet'}`, s: (p.rotating.cap || '') + (q && !w.activated.includes(QK) ? ' · not activated' : '') }); }
  if (p.auto) tiers.push({ rate: p.auto.rate, t: 'Your top category' + (w.autoFocus ? ` (expecting ${catName(w.autoFocus)})` : ''), s: p.auto.note || '' });
  tiers.sort((a, b) => b.rate - a.rate); tiers.push({ rate: p.base, t: p.baseLabel || 'Everything else', s: '' });
  const notes = [...(p.perks || [])];
  w.promos.forEach(pr => { if (pr.until >= TODAY) notes.unshift(`${pr.label}, until ${shortDate(isoToDate(pr.until))}`); });
  if (w.introApr && w.introApr >= TODAY) notes.unshift(`0% intro APR until ${isoToDate(w.introApr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  const caps = Object.entries(w.capped || {}).filter(([, u]) => u >= TODAY);
  const src = p.source || {};
  const saveName = () => { rename(w.id, nick); setNaming(false); };

  return (
    <ScrollView contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled">
      <View style={S.head}>
        <CardArt product={w.product} width={92} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {naming ? (
            <View style={S.renameRow}>
              <TextInput value={nick} onChangeText={setNick} placeholder={p.short} placeholderTextColor={c.muted} autoFocus maxLength={40}
                onSubmitEditing={saveName} returnKeyType="done" style={S.renameField} />
              <Pressable onPress={saveName} accessibilityLabel="Save name" style={[S.iconBtn, { backgroundColor: c.primary }]}><Icon name="check" color={c.onPrimary} size={18} /></Pressable>
              <Pressable onPress={() => setNaming(false)} accessibilityLabel="Cancel" style={S.iconBtn}><Icon name="x" color={c.ink} size={18} /></Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { tap(); setNick(w.nickname || ''); setNaming(true); }} style={S.titleRow} accessibilityLabel="Rename card">
              <Text style={S.h} numberOfLines={2}>{name}</Text>
              <View style={[S.pencil, { backgroundColor: c.surface2 }]}><Icon name="edit" color={c.muted} size={16} /></View>
            </Pressable>
          )}
          <Text style={S.sub}>{brand.name} {p.name} · {netLabel(netOf(ctx, w))}{w.last4 ? ` · •••• ${w.last4}` : ''}</Text>
          {p.status === 'closed' ? <Pill c={c} text="No longer offered to new applicants" warn /> : null}
          {w.inactive ? <Pill c={c} text={`Deactivated ${shortDate(isoToDate(w.inactive))}`} /> : null}
        </View>
      </View>

      <Setup w={w} />

      {caps.length ? (
        <>
          <Text style={S.sec}>Caps reached</Text>
          <View style={S.card}>
            {caps.map(([k, u], i) => (
              <View key={k} style={[S.capRow, i > 0 && S.divider]}>
                <View style={{ flex: 1 }}><Text style={S.rowTitle}>{capLabel(ctx, w, k)}</Text><Text style={S.rowSub}>Counts again after {shortDate(isoToDate(u))}</Text></View>
                <SmallBtn c={c} title="Undo" alt onPress={() => undoCap(w.id, k)} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={S.sec}>Rewards</Text>
      <View style={{ gap: 6 }}>
        {tiers.map((t, i) => (
          <View key={i} style={[S.tier, i === 0 && { borderColor: c.accent }]}>
            <Text style={S.tierRate}>{fmtRate(t.rate)}{unit}</Text>
            <View style={{ flex: 1 }}><Text style={S.rowTitle}>{t.t}</Text>{t.s ? <Text style={S.rowSub}>{t.s}</Text> : null}</View>
          </View>
        ))}
      </View>
      {p.type !== 'cash' ? <Text style={S.hint}>Ranked at {p.cpp || 1}¢ per {p.type === 'miles' ? 'mile' : 'point'}.</Text> : null}

      {notes.length ? (
        <>
          <Text style={S.sec}>Notes & perks</Text>
          <View style={{ gap: 6 }}>{notes.map(n => <Text key={n} style={S.body}>•  {n}</Text>)}</View>
        </>
      ) : null}

      <Text style={S.sec}>Card details</Text>
      <Text style={S.label}>Last 4 digits</Text>
      <TextInput defaultValue={w.last4} keyboardType="number-pad" maxLength={4} placeholder="1234" placeholderTextColor={c.muted}
        onEndEditing={e => setField(w.id, 'last4', e.nativeEvent.text.replace(/\D/g, '').slice(0, 4))} style={S.field} />
      <Text style={S.hint}>Never enter your full card number. The last 4 only help you spot the card at checkout.</Text>
      {p.networkOptions ? (
        <>
          <Text style={S.label}>Logo on your card</Text>
          <View style={S.chips}>{p.networkOptions.map(n => <Chip key={n} c={c} label={capWord(n)} on={netOf(ctx, w) === n} onPress={() => setField(w.id, 'network', n)} />)}</View>
        </>
      ) : null}

      <Text style={[S.hint, { marginTop: 18 }]}>
        {src.checked ? `Terms checked ${isoToDate(src.checked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Terms not yet checked'}
        {src.url ? <Text style={{ color: c.accent }} onPress={() => Linking.openURL(src.url!)}>{'  ·  View source'}</Text> : null}
        {src.note ? `\n${src.note}` : ''}{'\n'}Always confirm terms with your card issuer.
      </Text>
      {footer}
    </ScrollView>
  );
}

/* Quarterly bonus activation, chosen categories, top category */
function Setup({ w }: { w: WalletCard }) {
  const c = useColors(), ctx = useCtx(), S = makeStyles(c);
  const p = productOf(ctx, w.product)!; const { QK, NQK, PICK_Q } = ctx.clock;
  const slots = p.choice || [];
  const saved = (s: ChoiceSlot) => !!w.sel[s.id]?.opts?.length;
  const needs = slots.some(s => !saved(s) && !isDefaultSel(w, s));
  const [editing, setEditing] = useState(needs);
  const [draft, setDraft] = useState<Record<string, string[]>>(() => Object.fromEntries(slots.map(s => [s.id, [...selOpts(w, s)]])));
  if (!p.rotating && !slots.length && !p.auto) return null;

  const per = slots.some(s => s.period === 'quarter') ? ` for ${qLabel(PICK_Q)}` : '';
  const stale = slots.filter(s => s.period === 'quarter' && saved(s) && (!w.sel[s.id]!.quarter || w.sel[s.id]!.quarter! < PICK_Q));
  const complete = slots.every(s => (draft[s.id] || []).length === s.pick);
  const toggle = (s: ChoiceSlot, opt: string) => {
    tap();
    setDraft(d => { const cur = d[s.id] || []; const next = cur.includes(opt) ? cur.filter(x => x !== opt) : s.pick === 1 ? [opt] : cur.length >= s.pick ? [...cur.slice(1), opt] : [...cur, opt]; return { ...d, [s.id]: next }; });
  };
  const askEdit = () => Alert.alert('Edit your saved categories?', 'Use this to fix a mistake or match a change you made with your bank. Your new picks replace the saved ones.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Edit', onPress: () => { setDraft(Object.fromEntries(slots.map(s => [s.id, [...selOpts(w, s)]]))); setEditing(true); } }]);

  return (
    <>
      <Text style={S.sec}>{p.rotating ? 'Quarterly bonus' : 'Your categories'}</Text>
      {p.rotating ? (
        <View style={S.card}>
          {[QK, NQK].map(k => {
            const q = p.rotating!.schedule[k]; if (!q) return null; const on = w.activated.includes(k), r = p.rotating!;
            const when = k === QK ? `Now until ${shortDate(qEnd(k))}` : `Starts ${shortDate(qStart(k))}`;
            const due = r.retroactive ? ` · activate by ${shortDate(qDeadline(k, r.deadlineDay || 31))}` : '';
            return (
              <View key={k} style={[S.capRow, k === NQK && S.divider]}>
                <View style={{ flex: 1 }}><Text style={S.rowTitle}>{qLabel(k)}: {q.label}</Text><Text style={S.rowSub}>{when}{due}</Text></View>
                <Chip c={c} label={on ? 'Activated' : 'Mark activated'} on={on} icon={on ? 'check' : undefined} onPress={() => toggleAct(w.id, k)} />
              </View>
            );
          })}
        </View>
      ) : null}
      {p.rotating ? <Text style={S.hint}>{p.rotating.activateHint || "Activate in your card's app first, then mark it here."}</Text> : null}

      {slots.length ? (
        <View style={[S.card, { padding: 14, marginTop: p.rotating ? 12 : 0 }]}>
          {slots.map((s, si) => (
            <View key={s.id} style={[{ flexDirection: 'row', gap: 12 }, si > 0 && { marginTop: 16 }]}>
              <Text style={S.pickRate}>{fmtRate(s.rate)}%</Text>
              <View style={{ flex: 1 }}>
                {editing ? (
                  <>
                    <Text style={S.rowTitle}>Choose {s.pick}{s.period === 'quarter' ? per : ''}</Text>
                    {s.note ? <Text style={S.rowSub}>{s.note}</Text> : null}
                    <View style={[S.chips, { marginTop: 8 }]}>
                      {s.options.map(o => <Chip key={o.id} c={c} label={o.label} on={(draft[s.id] || []).includes(o.id)} onPress={() => toggle(s, o.id)} />)}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={S.rowTitle}>{s.label.replace(/^Your /, '').replace(/^\w/, x => x.toUpperCase())}</Text>
                    <Text style={S.rowSub}>{selLabels(w, s).join(', ') || 'Not set'}{isDefaultSel(w, s) ? ' (card default)' : ''}</Text>
                  </>
                )}
              </View>
            </View>
          ))}
          {editing ? (
            <>
              <Text style={[S.hint, { marginTop: 14 }]}>Pick the same categories you chose with {brandOf(ctx, p.brand).name}. Most banks lock them until next quarter.</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                {slots.some(saved) ? <View style={{ minWidth: 100 }}><Button kind="ghost" title="Cancel" onPress={() => setEditing(false)} /></View> : null}
                <View style={{ flex: 1 }}><Button title="Save categories" disabled={!complete} onPress={() => { savePicks(w.id, draft); setEditing(false); }} /></View>
              </View>
            </>
          ) : (
            <>
              <View style={[S.pickFoot, { borderTopColor: c.line }]}>
                <Icon name="check" color={c.rate} size={18} />
                <Text style={[S.rowSub, { flex: 1 }]}>{stale.length ? `Saved for ${qLabel(w.sel[stale[0].id]!.quarter || QK)}` : `Saved${per}`}</Text>
                <SmallBtn c={c} title="Edit" alt onPress={askEdit} />
              </View>
              {stale.length ? (
                <View style={[S.newQ, { backgroundColor: c.warnBg }]}>
                  <Text style={[S.rowSub, { color: c.warn, flex: 1 }]}>New quarter: keep the same picks for {qLabel(PICK_Q)}?</Text>
                  <SmallBtn c={c} title="Keep same" onPress={() => confirmSame(w.id)} />
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {p.auto ? (
        <View style={[S.card, { padding: 14, marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={S.pickRate}>{fmtRate(p.auto.rate)}%</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.rowTitle}>Where will you spend most this month?</Text>
              <Text style={S.rowSub}>Only your top category earns {fmtRate(p.auto.rate)}%. This is a guess you can change any time.</Text>
              <View style={[S.chips, { marginTop: 8 }]}>
                {p.auto.options.map(o => <Chip key={o} c={c} label={catName(o)} on={w.autoFocus === o} onPress={() => setField(w.id, 'autoFocus', o)} />)}
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

type C = ReturnType<typeof useColors>;
function Chip({ c, label, on, onPress, icon }: { c: C; label: string; on: boolean; onPress: () => void; icon?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityState={{ selected: on }}
      style={({ pressed }) => [chipS.chip, { backgroundColor: on ? c.primary : pressed ? c.surface2 : c.surface, borderColor: on ? c.primary : c.line }]}>
      {icon ? <Icon name={icon} color={c.onPrimary} size={14} strokeWidth={2.4} /> : null}
      <Text style={[chipS.text, { color: on ? c.onPrimary : c.ink }]}>{label}</Text>
    </Pressable>
  );
}
function SmallBtn({ c, title, onPress, alt }: { c: C; title: string; onPress: () => void; alt?: boolean }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [chipS.small, { backgroundColor: alt ? (pressed ? c.line : c.surface2) : c.primary }]}>
      <Text style={[chipS.smallText, { color: alt ? c.ink : c.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}
function Pill({ c, text, warn }: { c: C; text: string; warn?: boolean }) {
  return <View style={[chipS.pill, { backgroundColor: warn ? c.warnBg : c.surface2 }]}><Text style={[chipS.pillText, { color: warn ? c.warn : c.ink }]}>{text}</Text></View>;
}
const chipS = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 36 },
  text: { fontFamily: fonts.medium, fontSize: 14 },
  small: { borderRadius: 10, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  smallText: { fontFamily: fonts.semibold, fontSize: 13 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  pillText: { fontFamily: fonts.medium, fontSize: 12.5 },
});

const makeStyles = (c: C) => StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 48 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  h: { fontFamily: fonts.display, fontSize: 24, color: c.ink, flexShrink: 1 },
  pencil: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  renameField: { flex: 1, fontFamily: fonts.semibold, fontSize: 18, color: c.ink, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 2 },
  sec: { fontFamily: fonts.display, fontSize: 20, color: c.ink, marginTop: 26, marginBottom: 10 },
  card: { backgroundColor: c.surface, borderRadius: 18, overflow: 'hidden' },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.ink },
  rowSub: { fontFamily: fonts.body, fontSize: 13, color: c.muted, marginTop: 2 },
  tier: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: 'transparent' },
  tierRate: { minWidth: 44, fontFamily: fonts.display, fontSize: 17, color: c.rate },
  pickRate: { fontFamily: fonts.display, fontSize: 22, color: c.rate, minWidth: 44 },
  pickFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  newQ: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, borderRadius: 12, padding: 10 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: c.muted, marginTop: 8, lineHeight: 19 },
  body: { fontFamily: fonts.body, fontSize: 15, color: c.ink, lineHeight: 21 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: c.muted, marginTop: 6, marginBottom: 8 },
  field: { fontFamily: fonts.semibold, fontSize: 18, letterSpacing: 2, color: c.ink, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  outlineText: { fontFamily: fonts.semibold, fontSize: 16, color: c.ink },
});
