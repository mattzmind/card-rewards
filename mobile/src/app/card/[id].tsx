/* Card details: setup (quarterly bonus, chosen categories, top category, first-year bonus), caps, reward tiers,
   perks, last 4 / network, and Deactivate / Remove.
   Setup, last 4 and network are one draft: Save changes commits them (it also appears right under the setup form). Closing with unsaved edits (X or a swipe
   down) asks Save / Discard / Keep editing. This uses usePreventRemove, which makes the native sheet
   cancel the swipe itself. Don't toggle the sheet's options (e.g. gestureEnabled) from here: changing a
   formSheet's options while it's open re-applies its native setup, and the X bar was lost that way. */
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { catName } from '@/core/cats';
import { isoToDate, qLabel, shortDate } from '@/core/dates';
import { brandOf, capWord, dn, fmtRate, netLabel, netOf, productOf, selLabels } from '@/core/engine';
import type { ChoiceSlot, WalletCard } from '@/core/types';
import { capLabel } from '@/core/wallet';
import { confirmSame, removeCards, rename, saveSetup, setField, setInactive, undoCap } from '@/store/actions';
import { useCtx } from '@/store/app';
import { CardArt } from '@/ui/card-art';
import { CardSetupForm, type SetupDraft, draftComplete, draftDirty, draftOf, missingText, needsSetup } from '@/ui/card-setup';
import { Icon } from '@/ui/icon';
import { Button, Last4Input, SheetBar, last4Ok, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';
import { toast } from '@/ui/toast';

const isDefaultSel = (w: WalletCard, s: ChoiceSlot) => !(w.sel[s.id]?.opts?.length) && !!s.default;

export default function CardDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors(), ctx = useCtx();
  const w = ctx.state.wallet.find(x => x.id === id);
  const [naming, setNaming] = useState(false), [nick, setNick] = useState('');
  const [last4, setLast4] = useState(w?.last4 || ''), [net, setNet] = useState(w?.network);
  const navigation = useNavigation(), [leaving, setLeaving] = useState(false);
  /* Compare the network shown on screen (the card's choice, else the product default), not the raw saved value */
  const netChanged = !!w && netOf(ctx, { ...w, network: net }) !== netOf(ctx, w);
  /* Categories, activations and the first-year bonus are part of the same draft, so Save changes covers them */
  const [draft, setDraft] = useState<SetupDraft | null>(() => (w ? draftOf(ctx, w) : null));
  const pr = w ? productOf(ctx, w.product) : undefined;
  const setupDirty = !!w && !!draft && draftDirty(ctx, w, draft), setupOk = !draft || draftComplete(pr, draft);
  const dirty = !!w && (last4 !== (w.last4 || '') || netChanged || setupDirty);
  const canSave = dirty && last4Ok(last4) && (!setupDirty || setupOk);
  const commit = () => {
    if (!w) return;
    setField(w.id, 'last4', last4); if (netChanged) setField(w.id, 'network', net);
    if (setupDirty && draft) saveSetup(w.id, draft, 'Changes saved'); else toast('Changes saved');
  };
  /* Close after the guard has switched off (next render), so Save / Remove don't trigger the prompt */
  useEffect(() => { if (leaving) router.back(); }, [leaving]);

  usePreventRemove(dirty && !leaving, ({ data }) => {
    const go = () => navigation.dispatch(data.action);
    Alert.alert('Save your changes?', "You edited this card but haven't saved it yet.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: go },
      ...(canSave ? [{ text: 'Save', onPress: () => { commit(); go(); } }] : []),
    ]);
  });
  if (!w) return null;
  const p = productOf(ctx, w.product), name = dn(ctx, w);
  const { QK, TODAY } = ctx.clock;
  const S = makeStyles(c);

  const footer = (
    <View style={{ gap: 10, marginTop: 28 }}>
      <Button title="Save changes" disabled={!canSave} onPress={() => { commit(); setLeaving(true); }} />
      <Pressable onPress={() => { tap(); setInactive([w.id], !w.inactive); }} style={S.outline}>
        <Icon name={w.inactive ? 'restore' : 'archive'} color={c.ink} size={20} /><Text style={S.outlineText}>{w.inactive ? 'Reactivate card' : 'Deactivate card'}</Text>
      </Pressable>
      <Pressable onPress={() => { tap(); removeCards([w.id], () => setLeaving(true)); }} style={[S.outline, { borderColor: c.danger + '73' }]}>
        <Icon name="trash" color={c.danger} size={20} /><Text style={[S.outlineText, { color: c.danger }]}>Remove from wallet</Text>
      </Pressable>
      {!w.inactive ? <Text style={[S.hint, { textAlign: 'center' }]}>Deactivate keeps the card in your history but stops using it on Earn.</Text> : null}
    </View>
  );
  const bar = <SheetBar onClose={() => router.back()} />;
  if (!p) return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={S.wrap} stickyHeaderIndices={[0]}>
      {bar}<Text style={S.h}>{name}</Text><Text style={S.sub}>{"This card isn't in the catalog anymore."}</Text>{footer}
    </ScrollView>
  );

  const unit = p.type !== 'cash' ? 'x' : '%', brand = brandOf(ctx, p.brand);
  /* Under the setup form: "New quarter: keep the same picks?" or a saved check */
  const { PICK_Q } = ctx.clock, slots = p.choice || [];
  const qSlots = slots.filter(s => s.period === 'quarter' && w.sel[s.id]?.opts?.length);
  const staleQ = qSlots.some(s => (w.sel[s.id]!.quarter || '') < PICK_Q);
  const savedNote = staleQ ? '' : slots.length && slots.every(s => w.sel[s.id]?.opts?.length) ? (qSlots.length ? `Saved for ${qLabel(PICK_Q)}` : 'Saved')
    : !slots.length && p.auto && w.autoFocus ? 'Saved' : '';
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
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      {bar}
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
          <Text style={S.sub}>{brand.name} {p.name} · {netLabel(netOf(ctx, w))}{w.last4 ? ` · •••• ${w.last4}` : ''}</Text>
          {w.inactive ? <Pill c={c} text={`Deactivated ${shortDate(isoToDate(w.inactive))}`} /> : null}
        </View>
      </View>

      {draft && needsSetup(p) ? (
        <>
          <Text style={S.sec}>{p.rotating ? 'Quarterly bonus' : (p.choice || []).length ? 'Your categories' : p.auto ? `Your ${fmtRate(p.auto.rate)}% category` : 'First-year bonus'}</Text>
          {staleQ ? (
            <View style={[S.newQ, { backgroundColor: c.warnBg }]}>
              <Text style={[S.rowSub, { color: c.warn, flex: 1, marginTop: 0 }]}>New quarter: keep the same picks for {qLabel(PICK_Q)}?</Text>
              <SmallBtn c={c} title="Keep same" onPress={() => confirmSame(w.id)} />
            </View>
          ) : null}
          <CardSetupForm ctx={ctx} w={w} draft={draft} onChange={setDraft} />
          {setupDirty ? (
            <View style={{ marginTop: 12 }}>
              <Button title="Save changes" disabled={!canSave} onPress={commit} />
              {!setupOk ? <Text style={[S.hint, { textAlign: 'center' }]}>{missingText(p, draft)}</Text> : null}
            </View>
          ) : savedNote ? (
            <View style={S.savedRow}><Icon name="check" color={c.rate} size={18} strokeWidth={2.4} /><Text style={[S.rowSub, { marginTop: 0 }]}>{savedNote}</Text></View>
          ) : null}
        </>
      ) : null}

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
          <View key={i} style={S.tier}>
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
      <Text style={S.label}>Last 4 digits (optional)</Text>
      <Last4Input value={last4} onChangeText={setLast4} style={S.field} />
      {!last4Ok(last4) ? <Text style={[S.hint, { color: c.warn }]}>Enter all 4 digits, or leave it empty.</Text> : null}
      <Text style={S.hint}>Never enter your full card number. The last 4 only help you spot the card at checkout.</Text>
      {p.networkOptions ? (
        <>
          <Text style={S.label}>Logo on your card</Text>
          <View style={S.chips}>{p.networkOptions.map(n => <Chip key={n} c={c} label={capWord(n)} on={(net || netOf(ctx, w)) === n} onPress={() => setNet(n)} />)}</View>
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

type C = ReturnType<typeof useColors>;
function Chip({ c, label, on, onPress, icon }: { c: C; label: string; on: boolean; onPress: () => void; icon?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityState={{ selected: on }}
      style={[chipS.chip, { backgroundColor: on ? c.primary : c.surface, borderColor: on ? c.primary : c.line }]}>
      {icon ? <Icon name={icon} color={c.onPrimary} size={14} strokeWidth={2.4} /> : null}
      <Text style={[chipS.text, { color: on ? c.onPrimary : c.ink }]}>{label}</Text>
    </Pressable>
  );
}
function SmallBtn({ c, title, onPress, alt }: { c: C; title: string; onPress: () => void; alt?: boolean }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={[chipS.small, { backgroundColor: alt ? c.surface2 : c.primary }]}>
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
  wrap: { paddingHorizontal: GUTTER, paddingBottom: 48 },
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
  tier: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: c.surface },
  tierRate: { minWidth: 44, fontFamily: fonts.display, fontSize: 17, color: c.rate },
  pickRate: { fontFamily: fonts.display, fontSize: 22, color: c.rate, minWidth: 44 },
  pickFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  newQ: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, borderRadius: 12, padding: 10 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: c.muted, marginTop: 8, lineHeight: 19 },
  body: { fontFamily: fonts.body, fontSize: 15, color: c.ink, lineHeight: 21 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: c.muted, marginTop: 6, marginBottom: 8 },
  field: { fontFamily: fonts.semibold, fontSize: 18, letterSpacing: 2, color: c.ink, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginHorizontal: 4 },
  outline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  outlineText: { fontFamily: fonts.semibold, fontSize: 16, color: c.ink },
});
