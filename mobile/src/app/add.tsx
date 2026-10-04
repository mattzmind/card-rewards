/* Add a card: choose the bank (or search any card) → pick the card → optional last 4 / nickname. */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { brandOf, capWord, netLabel, productOf } from '@/core/engine';
import { addCard, setInactive } from '@/store/actions';
import { useCtx } from '@/store/app';
import { CardArt } from '@/ui/card-art';
import { Icon } from '@/ui/icon';
import { Button, List, Row, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';
import { toast } from '@/ui/toast';

const POPULAR_BRANDS = ['chase', 'amex', 'capone', 'citi', 'discover', 'boa', 'wells', 'usbank'];

export default function Add() {
  const c = useColors(), ctx = useCtx();
  const [q, setQ] = useState(''), [bank, setBank] = useState<string | null>(null), [pick, setPick] = useState<string | null>(null);
  const owned = (pid: string) => ctx.state.wallet.find(w => w.product === pid);
  const productsOf = (k: string) => Object.entries(ctx.catalog.products).filter(([, p]) => p.brand === k)
    .sort((a, b) => (+!!owned(a[0]) - +!!owned(b[0])) || (+(a[1].status === 'closed') - +(b[1].status === 'closed')) || a[1].name.localeCompare(b[1].name));
  const banks = useMemo(() => Object.keys(ctx.catalog.brands).filter(k => productsOf(k).length).sort((a, b) => brandOf(ctx, a).name.localeCompare(brandOf(ctx, b).name)), [ctx]);
  const S = styles;

  if (pick) return <Draft pid={pick} back={() => setPick(null)} />;

  const cardRow = (id: string, i: number, big = false) => {
    const p = productOf(ctx, id)!, w = owned(id);
    const action = w ? (w.inactive ? 'Reactivate' : 'Added') : 'Add';
    return (
      <Row key={id} first={i === 0} left={<CardArt product={id} width={big ? 72 : 56} />}
        title={`${brandOf(ctx, p.brand).name} ${p.name}`}
        sub={[netLabel(p.network), p.business ? 'Business' : '', p.status === 'closed' ? 'No longer offered' : '', w ? (w.inactive ? 'Deactivated' : 'In your wallet') : ''].filter(Boolean).join(' · ')}
        onPress={w && !w.inactive ? undefined : () => { tap(); if (w) { setInactive([w.id], false); router.back(); } else setPick(id); }}
        right={<View style={[S.addBtn, { backgroundColor: w && !w.inactive ? c.surface2 : c.primary }]}><Text style={[S.addText, { color: w && !w.inactive ? c.muted : c.onPrimary }]}>{action}</Text></View>} />
    );
  };

  const search = (ph: string) => (
    <View style={[S.search, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Icon name="search" color={c.muted} />
      <TextInput value={q} onChangeText={setQ} placeholder={ph} placeholderTextColor={c.muted} autoCorrect={false} clearButtonMode="while-editing" style={[S.searchInput, { color: c.ink }]} />
    </View>
  );

  if (bank) {
    const b = brandOf(ctx, bank), t = q.trim().toLowerCase();
    const items = productsOf(bank).filter(([, p]) => !t || (p.name + ' ' + p.short).toLowerCase().includes(t));
    return (
      <ScrollView contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled">
        <Back c={c} label="All banks" onPress={() => { setBank(null); setQ(''); }} />
        <Text style={[S.h, { color: c.ink }]}>{b.name}</Text>
        <Text style={[S.sub, { color: c.muted }]}>{b.note || `${productsOf(bank).length} card${productsOf(bank).length > 1 ? 's' : ''}`}</Text>
        {productsOf(bank).length > 3 ? search(`Search ${b.short || b.name} cards`) : null}
        <List style={{ marginTop: 14 }}>{items.map(([id], i) => cardRow(id, i, true))}</List>
        {!items.length ? <Text style={[S.hint, { color: c.muted }]}>No {b.name} cards match “{q}”.</Text> : null}
      </ScrollView>
    );
  }

  const t = q.trim().toLowerCase();
  const bankRow = (k: string, i: number) => <Row key={k} first={i === 0} title={brandOf(ctx, k).name} onPress={() => { setBank(k); setQ(''); }}
    right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={[S.count, { color: c.muted }]}>{productsOf(k).length} card{productsOf(k).length > 1 ? 's' : ''}</Text><Icon name="chevR" color={c.muted} size={18} /></View>} />;
  const mb = t ? banks.filter(k => { const b = brandOf(ctx, k); return (b.name + ' ' + b.short + ' ' + (b.note || '')).toLowerCase().includes(t); }) : [];
  const mc = t ? Object.entries(ctx.catalog.products).filter(([, p]) => (brandOf(ctx, p.brand).name + ' ' + p.name + ' ' + p.short).toLowerCase().includes(t)).map(([id]) => id) : [];
  return (
    <ScrollView contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled">
      <Text style={[S.h, { color: c.ink }]}>Add a card</Text>
      <Text style={[S.sub, { color: c.muted }]}>Choose the bank on your card</Text>
      {search('Search banks or cards')}
      {t ? (
        <>
          {mb.length ? <><Text style={[S.sec, { color: c.ink }]}>Banks</Text><List>{mb.map(bankRow)}</List></> : null}
          {mc.length ? <><Text style={[S.sec, { color: c.ink }]}>Cards</Text><List>{mc.map((id, i) => cardRow(id, i))}</List></> : null}
          {!mb.length && !mc.length ? <Text style={[S.hint, { color: c.muted }]}>No banks or cards match “{q}”.</Text> : null}
        </>
      ) : (
        <>
          <Text style={[S.sec, { color: c.ink }]}>Most popular</Text>
          <List>{POPULAR_BRANDS.filter(k => banks.includes(k)).map(bankRow)}</List>
          <Text style={[S.sec, { color: c.ink }]}>All banks A–Z</Text>
          <List>{banks.map(bankRow)}</List>
        </>
      )}
    </ScrollView>
  );
}

function Draft({ pid, back }: { pid: string; back: () => void }) {
  const c = useColors(), ctx = useCtx(), p = productOf(ctx, pid)!;
  const [last4, setLast4] = useState(''), [nick, setNick] = useState(''), [net, setNet] = useState(p.network);
  const add = () => {
    const w = addCard(pid, { nickname: nick, last4, network: net });
    if (p.choice || p.rotating || p.auto) router.replace({ pathname: '/card/[id]', params: { id: w.id } });
    else { router.back(); toast(`${nick.trim() || p.short} added`); }
  };
  const S = styles;
  return (
    <ScrollView contentContainerStyle={S.wrap} keyboardShouldPersistTaps="handled">
      <Back c={c} label={brandOf(ctx, p.brand).short || 'Back'} onPress={back} />
      <View style={{ alignItems: 'center', marginTop: 4 }}><CardArt product={pid} width={220} /></View>
      <Text style={[S.h, { color: c.ink, textAlign: 'center', marginTop: 16 }]}>{brandOf(ctx, p.brand).name} {p.name}</Text>
      {p.networkOptions ? (
        <>
          <Text style={[S.label, { color: c.muted }]}>Which logo is on your card?</Text>
          <View style={S.chips}>
            {p.networkOptions.map(n => (
              <Pressable key={n} onPress={() => { tap(); setNet(n); }} style={[S.chip, { backgroundColor: net === n ? c.primary : c.surface, borderColor: net === n ? c.primary : c.line }]}>
                <Text style={{ fontFamily: fonts.medium, color: net === n ? c.onPrimary : c.ink }}>{capWord(n)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Text style={[S.label, { color: c.muted }]}>Last 4 digits (optional)</Text>
      <TextInput value={last4} onChangeText={v => setLast4(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="1234" placeholderTextColor={c.muted}
        style={[S.field, { color: c.ink, backgroundColor: c.surface, borderColor: c.line, letterSpacing: 2 }]} />
      <Text style={[S.label, { color: c.muted }]}>Nickname (optional)</Text>
      <TextInput value={nick} onChangeText={setNick} placeholder={p.short} placeholderTextColor={c.muted} maxLength={40}
        style={[S.field, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
      <Text style={[S.hint, { color: c.muted }]}>Never enter your full card number. The last 4 only help you spot the card at checkout.</Text>
      <View style={{ marginTop: 18 }}><Button title="Add to wallet" onPress={add} /></View>
    </ScrollView>
  );
}

function Back({ c, label, onPress }: { c: ReturnType<typeof useColors>; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={styles.back} accessibilityLabel={`Back to ${label}`}>
      <Icon name="chevL" color={c.accent} size={20} /><Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: c.accent }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: 48 },
  h: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.4 },
  sub: { fontFamily: fonts.body, fontSize: 15, marginTop: 4, marginBottom: 14 },
  sec: { fontFamily: fonts.display, fontSize: 19, marginTop: 24, marginBottom: 10 },
  hint: { fontFamily: fonts.body, fontSize: 13, marginTop: 10, lineHeight: 19 },
  count: { fontFamily: fonts.body, fontSize: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12 },
  addBtn: { borderRadius: 10, paddingHorizontal: 12, minHeight: 34, justifyContent: 'center' },
  addText: { fontFamily: fonts.semibold, fontSize: 13 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, alignSelf: 'flex-start', marginBottom: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 18, marginBottom: 8 },
  field: { fontFamily: fonts.semibold, fontSize: 17, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center' },
});
