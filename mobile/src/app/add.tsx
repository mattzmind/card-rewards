/* Add cards: choose the bank (or search any card) and tap every card you carry → review (optional last 4,
   which logo) → "Added" splash → a setup page for each new card that has categories to pick or a bonus
   to activate → back to the wallet. Cards that aren't listed can be requested. */
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { brandOf, capWord, dn, netLabel, productOf } from '@/core/engine';
import { addCard, saveSetup, setInactive } from '@/store/actions';
import { useApp, useCtx } from '@/store/app';
import { enableReminders } from '@/store/reminders';
import { CardArt } from '@/ui/card-art';
import { CardSetupForm, type SetupDraft, draftComplete, draftOf, missingText, needsSetup } from '@/ui/card-setup';
import { Icon } from '@/ui/icon';
import { Button, Last4Input, List, Row, SheetBar, last4Ok, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';
import { toast } from '@/ui/toast';

const POPULAR_BRANDS = ['chase', 'amex', 'capone', 'citi', 'discover', 'boa', 'wells', 'usbank'];
type C = ReturnType<typeof useColors>;
interface Extra { last4: string; net?: string }

export default function Add() {
  const c = useColors(), ctx = useCtx();
  const [q, setQ] = useState(''), [bank, setBank] = useState<string | null>(null);
  const [basket, setBasket] = useState<string[]>([]), [step, setStep] = useState<'browse' | 'review' | 'done' | 'setup'>('browse');
  const [added, setAdded] = useState<string[]>([]), [si, setSi] = useState(0);
  const owned = (pid: string) => ctx.state.wallet.find(w => w.product === pid);
  const productsOf = (k: string) => Object.entries(ctx.catalog.products).filter(([, p]) => p.brand === k)
    .sort((a, b) => (+!!owned(a[0]) - +!!owned(b[0])) || (+(a[1].status === 'closed') - +(b[1].status === 'closed')) || a[1].name.localeCompare(b[1].name));
  const banks = useMemo(() => Object.keys(ctx.catalog.brands).filter(k => productsOf(k).length).sort((a, b) => brandOf(ctx, a).name.localeCompare(brandOf(ctx, b).name)), [ctx]);
  const S = styles;

  /* New cards that need categories picked or a bonus activated, in the order added */
  const toSetUp = added.filter(id => { const w = ctx.state.wallet.find(x => x.id === id); return w && needsSetup(productOf(ctx, w.product)); });
  const finish = () => { router.back(); };

  if (step === 'review') return <Review ids={basket} back={() => setStep('browse')} remove={id => { const next = basket.filter(x => x !== id); setBasket(next); if (!next.length) setStep('browse'); }}
    add={ex => { setAdded(basket.map(pid => addCard(pid, { last4: ex[pid]?.last4, network: ex[pid]?.net }).id)); setStep('done'); }} />;
  if (step === 'done') return <Done ids={added} setupCount={toSetUp.length} next={() => { if (toSetUp.length) { setSi(0); setStep('setup'); } else finish(); }} />;
  if (step === 'setup' && toSetUp[si]) return <Setup key={toSetUp[si]} id={toSetUp[si]} n={si + 1} of={toSetUp.length}
    next={() => { if (si + 1 < toSetUp.length) setSi(si + 1); else finish(); }} />;

  const toggle = (id: string) => { tap(); setBasket(b => (b.includes(id) ? b.filter(x => x !== id) : [...b, id])); };
  const cardRow = (id: string, i: number, big = false) => {
    const p = productOf(ctx, id)!, w = owned(id), on = basket.includes(id), has = !!w && !w.inactive;
    return (
      <Row key={id} first={i === 0} left={<CardArt product={id} width={big ? 72 : 56} />}
        title={`${brandOf(ctx, p.brand).name} ${p.name}`}
        sub={[netLabel(p.network), p.business ? 'Business' : '', w ? (w.inactive ? 'Deactivated' : 'In your wallet') : ''].filter(Boolean).join(' · ')}
        onPress={has ? undefined : () => { if (w) { tap(); setInactive([w.id], false); router.back(); } else toggle(id); }}
        right={w ? (
          <View style={[S.addBtn, { backgroundColor: has ? c.surface2 : c.primary }]}><Text style={[S.addText, { color: has ? c.muted : c.onPrimary }]}>{has ? 'Added' : 'Reactivate'}</Text></View>
        ) : (
          <View accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Select ${p.name}`}
            style={[S.tick, { backgroundColor: on ? c.primary : 'transparent', borderColor: on ? c.primary : c.line }]}>
            <Icon name={on ? 'check' : 'plus'} color={on ? c.onPrimary : c.muted} size={18} strokeWidth={2.4} />
          </View>
        )} />
    );
  };

  const search = (ph: string) => (
    <View style={[S.search, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Icon name="search" color={c.muted} />
      <TextInput value={q} onChangeText={setQ} placeholder={ph} placeholderTextColor={c.muted} autoCorrect={false} clearButtonMode="while-editing" style={[S.searchInput, { color: c.ink }]} />
    </View>
  );
  /* Pinned at the top with the X, so it's always in reach while browsing several banks */
  const head = (left: React.ReactNode) => (
    <View style={{ backgroundColor: c.bg }}>
      <SheetBar onClose={() => router.back()} left={left} />
      {basket.length ? (
        <View style={{ paddingBottom: 10 }}>
          <Button title={`Add ${basket.length} card${basket.length > 1 ? 's' : ''}`} onPress={() => setStep('review')} />
        </View>
      ) : null}
    </View>
  );
  const request = (name = '') => (
    <Pressable onPress={() => { tap(); router.push({ pathname: '/report', params: { card: name } }); }} style={[S.request, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={[S.reqIc, { backgroundColor: c.surface2 }]}><Icon name="plus" color={c.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[S.reqT, { color: c.ink }]}>{name ? `Request “${name}”` : "Can't find your card?"}</Text>
        <Text style={[S.reqS, { color: c.muted }]}>{name ? 'Ask us to add it to Lucro' : "Request it and we'll add it to Lucro"}</Text>
      </View>
      <Icon name="chevR" color={c.muted} size={18} />
    </Pressable>
  );

  if (bank) {
    const b = brandOf(ctx, bank), t = q.trim().toLowerCase();
    const items = productsOf(bank).filter(([, p]) => !t || (p.name + ' ' + p.short).toLowerCase().includes(t));
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
        {head(<Back c={c} label="All banks" onPress={() => { setBank(null); setQ(''); }} />)}
        <Text style={[S.h, { color: c.ink }]}>{b.name}</Text>
        <Text style={[S.sub, { color: c.muted }]}>{b.note ? b.note + '. ' : ''}Tap every card you carry.</Text>
        {productsOf(bank).length > 3 ? search(`Search ${b.short || b.name} cards`) : null}
        <List style={{ marginTop: 14 }}>{items.map(([id], i) => cardRow(id, i, true))}</List>
        {!items.length ? <Text style={[S.hint, { color: c.muted }]}>No {b.name} cards match “{q}”.</Text> : null}
        {request(t ? `${b.short || b.name} ${q.trim()}` : '')}
      </ScrollView>
    );
  }

  const t = q.trim().toLowerCase();
  const bankRow = (k: string, i: number) => <Row key={k} first={i === 0} title={brandOf(ctx, k).name} onPress={() => { setBank(k); setQ(''); }}
    right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={[S.count, { color: c.muted }]}>{productsOf(k).length} card{productsOf(k).length > 1 ? 's' : ''}</Text><Icon name="chevR" color={c.muted} size={18} /></View>} />;
  const mb = t ? banks.filter(k => { const b = brandOf(ctx, k); return (b.name + ' ' + b.short + ' ' + (b.note || '')).toLowerCase().includes(t); }) : [];
  const mc = t ? Object.entries(ctx.catalog.products).filter(([, p]) => (brandOf(ctx, p.brand).name + ' ' + p.name + ' ' + p.short).toLowerCase().includes(t)).map(([id]) => id) : [];
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      {head(<Text style={[S.h, { color: c.ink }]}>Add cards</Text>)}
      <Text style={[S.sub, { color: c.muted }]}>Choose a bank, or search, and tap every card you carry.</Text>
      {search('Search banks or cards')}
      {t ? (
        <>
          {mb.length ? <><Text style={[S.sec, { color: c.ink }]}>Banks</Text><List>{mb.map(bankRow)}</List></> : null}
          {mc.length ? <><Text style={[S.sec, { color: c.ink }]}>Cards</Text><List>{mc.map((id, i) => cardRow(id, i))}</List></> : null}
          {!mb.length && !mc.length ? <Text style={[S.hint, { color: c.muted }]}>No banks or cards match “{q}”.</Text> : null}
          {request(q.trim())}
        </>
      ) : (
        <>
          <Text style={[S.sec, { color: c.ink }]}>Most popular</Text>
          <List>{POPULAR_BRANDS.filter(k => banks.includes(k)).map(bankRow)}</List>
          <Text style={[S.sec, { color: c.ink }]}>All banks A–Z</Text>
          <List>{banks.map(bankRow)}</List>
          {request()}
        </>
      )}
    </ScrollView>
  );
}

/* Optional last 4 and logo for each card before it goes in the wallet */
function Review({ ids, back, remove, add }: { ids: string[]; back: () => void; remove: (id: string) => void; add: (ex: Record<string, Extra>) => void }) {
  const c = useColors(), ctx = useCtx(), S = styles;
  const [ex, setEx] = useState<Record<string, Extra>>(() => Object.fromEntries(ids.map(id => [id, { last4: '', net: productOf(ctx, id)!.network }])));
  const set = (id: string, patch: Partial<Extra>) => setEx(e => ({ ...e, [id]: { ...e[id], ...patch } }));
  const ok = ids.every(id => last4Ok(ex[id]?.last4 || ''));
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} left={<Back c={c} label="Back" onPress={back} />} />
      <Text style={[S.h, { color: c.ink }]}>{ids.length > 1 ? `Add ${ids.length} cards` : 'Add this card'}</Text>
      <Text style={[S.sub, { color: c.muted }]}>The last 4 digits are optional. They only help you spot the card at checkout.</Text>
      <View style={{ gap: 12 }}>
        {ids.map(id => {
          const p = productOf(ctx, id)!, e = ex[id] || { last4: '' };
          return (
            <View key={id} style={[S.revCard, { backgroundColor: c.surface }]}>
              <View style={S.revHead}>
                <CardArt product={id} width={64} />
                <Text style={[S.revName, { color: c.ink }]} numberOfLines={2}>{brandOf(ctx, p.brand).name} {p.name}</Text>
                <Pressable onPress={() => { tap(); remove(id); }} hitSlop={8} accessibilityLabel={`Remove ${p.name}`} style={[S.round, { backgroundColor: c.surface2 }]}>
                  <Icon name="x" color={c.muted} size={16} />
                </Pressable>
              </View>
              <Text style={[S.label, { color: c.muted }]}>Last 4 digits (optional)</Text>
              <Last4Input value={e.last4} onChangeText={v => set(id, { last4: v })} style={[S.field, { color: c.ink, backgroundColor: c.bg, borderColor: c.line, letterSpacing: 2 }]} />
              {!last4Ok(e.last4) ? <Text style={[S.hint, { color: c.warn }]}>Enter all 4 digits, or leave it empty.</Text> : null}
              {p.networkOptions ? (
                <>
                  <Text style={[S.label, { color: c.muted }]}>Which logo is on your card?</Text>
                  <View style={S.chips}>
                    {p.networkOptions.map(n => (
                      <Pressable key={n} onPress={() => { tap(); set(id, { net: n }); }} style={[S.chip, { backgroundColor: e.net === n ? c.primary : c.bg, borderColor: e.net === n ? c.primary : c.line }]}>
                        <Text style={{ fontFamily: fonts.medium, color: e.net === n ? c.onPrimary : c.ink }}>{capWord(n)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          );
        })}
      </View>
      <Text style={[S.hint, { color: c.muted }]}>Never enter your full card number.</Text>
      <View style={{ marginTop: 14 }}><Button title="Add to wallet" onPress={() => add(ex)} disabled={!ok} /></View>
    </ScrollView>
  );
}

/* Confirmation splash; moves on to setup by itself */
function Done({ ids, setupCount, next }: { ids: string[]; setupCount: number; next: () => void }) {
  const c = useColors(), ctx = useCtx(), S = styles;
  const ws = ids.map(id => ctx.state.wallet.find(w => w.id === id)).filter(Boolean) as NonNullable<ReturnType<typeof ctx.state.wallet.find>>[];
  useEffect(() => { if (!setupCount) return; const t = setTimeout(next, 1800); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const one = ws.length === 1;
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={S.wrap} stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} />
      <View style={S.fan}>
        {ws.slice(0, 3).map((w, i, a) => (
          <Animated.View key={w.id} entering={FadeInDown.duration(320).delay(i * 90)}
            style={[S.fanCard, a.length > 1 && { transform: [{ translateX: (i - (a.length - 1) / 2) * 46 }, { rotate: `${(i - (a.length - 1) / 2) * 8}deg` }] }]}>
            <CardArt product={w.product} width={200} />
          </Animated.View>
        ))}
        <Animated.View entering={FadeInDown.duration(300).delay(260)} style={[S.doneIc, { backgroundColor: c.hl, borderColor: c.bg }]}>
          <Icon name="check" color={c.hlInk} size={34} strokeWidth={2.6} />
        </Animated.View>
      </View>
      <Text style={[S.doneH, { color: c.ink }]}>{one ? 'Added to your wallet' : `${ws.length} cards added`}</Text>
      <Text style={[S.doneP, { color: c.muted }]}>
        {one ? dn(ctx, ws[0]) : ws.map(w => dn(ctx, w)).join(', ')}
        {setupCount ? `\nNext: ${setupCount === 1 && one ? 'set up its categories and bonuses' : `set up ${setupCount === 1 ? 'one card' : setupCount + ' cards'}`}.` : '\nLucro will use it for your answers right away.'}
      </Text>
      <View style={{ marginTop: 24 }}>
        <Button title={setupCount ? 'Continue' : 'Done'} onPress={next} />
      </View>
    </ScrollView>
  );
}

/* One new card's setup: pick its categories / mark its bonus activated, then save or skip */
function Setup({ id, n, of, next }: { id: string; n: number; of: number; next: () => void }) {
  const c = useColors(), ctx = useCtx(), S = styles;
  const w = ctx.state.wallet.find(x => x.id === id)!, p = productOf(ctx, w.product)!;
  const [draft, setDraft] = useState<SetupDraft>(() => draftOf(ctx, w));
  const reminders = useApp(s => s.state.profile.reminders), quarterly = !!(p.rotating || (p.choice || []).some(s => s.period === 'quarter'));
  const [remind, setRemind] = useState(reminders !== false);
  const ok = draftComplete(p, draft);
  const save = () => {
    saveSetup(id, draft, `${dn(ctx, w)} is set up`);
    if (quarterly && remind && !reminders) enableReminders();
    next();
  };
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} left={of > 1 ? <Text style={[S.count, { color: c.muted }]}>Card {n} of {of}</Text> : undefined} />
      <View style={S.setupHead}>
        <CardArt product={w.product} width={84} />
        <View style={{ flex: 1 }}>
          <Text style={[S.h, { color: c.ink, fontSize: 24 }]}>Set up your {dn(ctx, w)}</Text>
          <Text style={[S.sub, { color: c.muted, marginBottom: 0 }]}>
            {(p.choice || []).length ? 'Choose the categories you picked with your bank, so Lucro ranks it right.'
              : p.rotating ? 'Mark this quarter\'s bonus once you\'ve activated it with your bank.'
              : p.auto ? 'Tell Lucro where you plan to use it most.' : 'One quick question so Lucro counts your bonus.'}
          </Text>
        </View>
      </View>
      <CardSetupForm ctx={ctx} w={w} draft={draft} onChange={setDraft} />
      {quarterly && reminders !== true ? (
        <View style={[S.remind, { backgroundColor: c.surface }]}>
          <Icon name="bell" color={c.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[S.reqT, { color: c.ink }]}>Remind me every quarter</Text>
            <Text style={[S.reqS, { color: c.muted }]}>A heads-up when it’s time to pick or activate, so you never earn 1% by accident.</Text>
          </View>
          <Switch value={remind} onValueChange={v => { tap(); setRemind(v); }} trackColor={{ true: '#16a34a' }} accessibilityLabel="Remind me every quarter" />
        </View>
      ) : null}
      <View style={{ marginTop: 18, gap: 4 }}>
        <Button title={n < of ? 'Save and continue' : 'Save'} onPress={save} disabled={!ok} />
        {!ok ? <Text style={[S.hint, { color: c.muted, textAlign: 'center', marginTop: 4 }]}>{missingText(p, draft)}</Text> : null}
        <Button kind="ghost" title="Skip for now" onPress={() => { if (n === of) toast('You can set it up any time from the card'); next(); }} />
      </View>
    </ScrollView>
  );
}

function Back({ c, label, onPress }: { c: C; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={styles.back} accessibilityLabel={`Back to ${label}`}>
      <Icon name="chevL" color={c.accent} size={20} /><Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: c.accent }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingBottom: 48 },
  h: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.4 },
  sub: { fontFamily: fonts.body, fontSize: 15, marginTop: 4, marginBottom: 14, lineHeight: 21 },
  sec: { fontFamily: fonts.display, fontSize: 19, marginTop: 24, marginBottom: 10 },
  hint: { fontFamily: fonts.body, fontSize: 13, marginTop: 10, lineHeight: 19 },
  count: { fontFamily: fonts.body, fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12 },
  addBtn: { borderRadius: 10, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center' },
  addText: { fontFamily: fonts.semibold, fontSize: 13 },
  tick: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, alignSelf: 'flex-start' },
  request: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, marginTop: 20 },
  reqIc: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reqT: { fontFamily: fonts.semibold, fontSize: 16 },
  reqS: { fontFamily: fonts.body, fontSize: 13, marginTop: 1 },
  revCard: { borderRadius: 18, padding: 14 },
  revHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  revName: { flex: 1, fontFamily: fonts.semibold, fontSize: 16 },
  round: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 14, marginBottom: 8 },
  field: { fontFamily: fonts.semibold, fontSize: 17, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  fan: { height: 190, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  fanCard: { position: 'absolute' },
  doneIc: { position: 'absolute', bottom: 0, width: 68, height: 68, borderRadius: 34, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  doneH: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.4, marginTop: 26, textAlign: 'center' },
  doneP: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, marginTop: 6, textAlign: 'center' },
  setupHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, marginTop: 12 },
});
