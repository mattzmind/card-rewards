/* Answer sheet: which card to use here, how much it earns, and the runners-up. */
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { catById } from '@/core/cats';
import { isoToDate, qLabel, shortDate } from '@/core/dates';
import { type Result, capWord, dn, fmtRate, networkHidden, periodEnd, rank } from '@/core/engine';
import { useApp, useCtx } from '@/store/app';
import { CardArt } from '@/ui/card-art';
import { Icon } from '@/ui/icon';
import { List, Row, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

const money = (v: number) => '$' + (Math.round(v * 100) % 100 ? v.toFixed(2) : v.toFixed(0));
/* "Spend $100, earn $2 back" / "Spend $100, earn 300 points (about $3.90)" */
function dollars(x: Result): [string, string, string] {
  if (x.p.type === 'cash') return ['Spend $100, earn ', `${money(x.rate)} back`, ''];
  const pts = Math.round(x.earn * 100).toLocaleString('en-US'), unit = x.p.type === 'miles' ? 'miles' : 'points';
  return ['Spend $100, earn ', `${pts} ${unit}`, ` (about ${money(x.rate)})`];
}

export default function Answer() {
  const c = useColors(), ctx = useCtx(), update = useApp(s => s.update), favs = useApp(s => s.state.favs);
  const { c: catId, s: storeId } = useLocalSearchParams<{ c: string; s?: string }>();
  const cat = catById(catId), store = storeId ? (ctx.catalog.stores || []).find(x => x.id === storeId) || null : null;
  const [showAll, setShowAll] = useState(false), [why, setWhy] = useState(false);
  const logged = useRef(false);

  /* Count the lookup and remember it in Recent (once per open) */
  useEffect(() => {
    if (logged.current || !cat) return; logged.current = true;
    update(s => {
      s.usage[cat.id] = (s.usage[cat.id] || 0) + 1;
      s.recents = [{ c: cat.id, s: storeId || undefined }, ...s.recents.filter(x => !(x.c === cat.id && (x.s || null) === (storeId || null)))].slice(0, 6);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [cat, storeId, update]);

  if (!cat) return null;
  const r = rank(ctx, cat, store), where = store ? store.name : cat.label;
  const favKey = store ? 's:' + store.id : 'c:' + cat.id, isFav = favs.includes(favKey);
  const toggleFav = () => { tap(); update(s => { const i = s.favs.indexOf(favKey); if (i < 0) s.favs.push(favKey); else s.favs.splice(i, 1); }); };

  const header = (
    <View style={styles.bar}>
      <Pressable onPress={toggleFav} hitSlop={8} accessibilityLabel={isFav ? 'Remove from favorites' : 'Add to favorites'}
        style={[styles.round, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="star" color={isFav ? c.star : c.muted} fill={isFav ? c.star : 'none'} size={20} />
      </Pressable>
      <Text style={[styles.where, { color: c.ink }]} numberOfLines={1}>{where}</Text>
      <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close" style={[styles.round, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="x" color={c.ink} size={20} />
      </Pressable>
    </View>
  );
  const context = (
    <Text style={[styles.ctx, { color: c.muted }]}>
      {store ? <>{store.name} counts as <Text style={styles.b}>{cat.label.toLowerCase()}</Text></> : <>Best card for <Text style={styles.b}>{cat.label.toLowerCase()}</Text></>}
    </Text>
  );

  if (!r.length) {
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        {header}{context}
        <View style={styles.none}>
          <Text style={[styles.noneTitle, { color: c.ink }]}>None of your cards work here</Text>
          <Text style={[styles.body, { color: c.muted, textAlign: 'center' }]}>
            {cat.networks ? 'Costco only takes Visa credit cards. Add a Visa card to your wallet to see an answer.' : 'Add more cards to your wallet to see an answer.'}
          </Text>
        </View>
      </ScrollView>
    );
  }

  const b = r[0], hidden = networkHidden(ctx, cat), rest = r.slice(1).filter(x => x.rate > 0);
  const pills: { text: string; kind?: 'warn' | 'info' }[] = [];
  if (b.label !== 'Everything else') pills.push({ text: b.label + (b.note ? ` · ${b.note}` : '') });
  if (b.flags.includes('confirm')) pills.push({ text: `Confirm ${qLabel(ctx.clock.PICK_Q)} picks`, kind: 'warn' });
  if (b.flags.includes('activate')) pills.push({ text: 'Not activated yet', kind: 'warn' });
  b.extras.forEach(e => pills.push({ text: `Includes ${(e.label || 'promo').split(' (')[0]}` }));
  if (b.apr) pills.push({ text: `0% APR until ${shortDate(isoToDate(b.apr))}` });
  if (store && (store as { note?: string }).note) pills.push({ text: (store as { note?: string }).note!, kind: 'info' });
  const special = r.filter(x => x.special && x.special.rate > b.rate).sort((a, z) => z.special!.rate - a.special!.rate).slice(0, 4);
  const others = r.slice(1, 4).map(x => `${dn(ctx, x.w)} ${fmtRate(x.rate)}%`).join(', ');
  const [d1, d2, d3] = dollars(b);
  const src = (b.p.source || {}) as { checked?: string };

  const markCap = () => {
    if (!b.cap) return; const cap = b.cap, until = periodEnd(ctx, cap.per);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    update(s => { const w = s.wallet.find(x => x.id === b.w.id); if (w) w.capped[cap.key] = until; });
  };
  const altRow = (x: Result, i: number, specialRow = false) => (
    <Row key={x.w.id + (specialRow ? 's' : '')} first={i === 0}
      left={specialRow ? undefined : <CardArt product={x.w.product} width={44} />}
      title={dn(ctx, x.w) + (x.w.last4 ? ` ••${x.w.last4}` : '')}
      sub={specialRow ? x.special!.cond : x.label + (x.flags.length ? ' · needs update' : '')}
      right={<Text style={[styles.altRate, { color: c.rate }]}>{fmtRate(specialRow ? x.special!.rate : x.rate)}%</Text>} />
  );

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {header}{context}
      <View style={styles.cardWrap}><CardArt product={b.w.product} width={240} /></View>
      <Text style={[styles.ansName, { color: c.ink }]}>{dn(ctx, b.w)}{b.w.last4 ? `  •••• ${b.w.last4}` : ''}</Text>
      <Text style={[styles.rate, { color: c.rate }]}>{fmtRate(b.rate)}%</Text>
      <Text style={[styles.dollars, { color: c.muted }]}>{d1}<Text style={[styles.b, { color: c.ink }]}>{d2}</Text>{d3}</Text>
      {pills.length ? (
        <View style={styles.pills}>
          {pills.map(p => (
            <View key={p.text} style={[styles.pill, { backgroundColor: p.kind === 'warn' ? c.warnBg : p.kind === 'info' ? c.infoBg : c.surface2 }]}>
              <Text style={[styles.pillText, { color: p.kind === 'warn' ? c.warn : p.kind === 'info' ? c.info : c.ink }]}>{p.text}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {b.cap ? (
        <Pressable onPress={markCap} style={({ pressed }) => [styles.quiet, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
          <Icon name="gauge" color={c.ink} size={18} /><Text style={[styles.quietText, { color: c.ink }]}>Hit the cap?</Text>
        </Pressable>
      ) : null}

      {rest.length ? (
        <>
          <Text style={[styles.sec, { color: c.ink }]}>Next best</Text>
          <List>{(showAll ? rest : rest.slice(0, 1)).map((x, i) => altRow(x, i))}</List>
          {rest.length > 1 ? (
            <Pressable onPress={() => { tap(); setShowAll(!showAll); }} style={styles.linkBtn}>
              <Text style={[styles.link, { color: c.accent }]}>{showAll ? 'Show less' : `Show all ${rest.length + 1} cards`}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
      {special.length ? (
        <>
          <Text style={[styles.sec, { color: c.ink }]}>Better only in these cases</Text>
          <List>{special.map((x, i) => altRow(x, i, true))}</List>
        </>
      ) : null}
      {hidden ? <Text style={[styles.hint, { color: c.muted }]}>Costco only takes Visa, so {hidden} of your cards aren't shown.</Text> : null}

      <Pressable onPress={() => { tap(); setWhy(!why); }} style={[styles.why, { borderColor: c.line, backgroundColor: c.surface }]}>
        <Icon name="info" color={c.accent} size={20} />
        <Text style={[styles.whyText, { color: c.ink }]}>Why this card?</Text>
        <Icon name={why ? 'chevD' : 'chevR'} color={c.muted} size={18} />
      </Pressable>
      {why ? (
        <View style={styles.whyBody}>
          <Text style={[styles.body, { color: c.ink }]}>{dn(ctx, b.w)} earns <Text style={styles.b}>{fmtRate(b.rate)}%</Text> here: {b.label.toLowerCase()}{b.note ? ` (${b.note})` : ''}.</Text>
          {b.p.type !== 'cash' ? <Text style={[styles.body, { color: c.ink }]}>{capWord(b.p.type)} are counted at {b.p.cpp || 1}¢ each so they compare fairly with cash back.</Text> : null}
          {others ? <Text style={[styles.body, { color: c.ink }]}>It beats {others}.</Text> : null}
          <Text style={[styles.body, { color: c.muted }]}>
            {src.checked ? `Card terms checked ${isoToDate(src.checked).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. ` : ''}Always confirm terms with your card issuer.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingTop: 18, paddingBottom: 48 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  where: { flex: 1, textAlign: 'center', fontFamily: fonts.display, fontSize: 20 },
  ctx: { fontFamily: fonts.body, fontSize: 15, textAlign: 'center', marginTop: 10 },
  b: { fontFamily: fonts.bold },
  cardWrap: { alignItems: 'center', marginTop: 20 },
  ansName: { fontFamily: fonts.display, fontSize: 24, textAlign: 'center', marginTop: 18 },
  rate: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 70, textAlign: 'center', letterSpacing: -2 },
  dollars: { fontFamily: fonts.body, fontSize: 16, textAlign: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontFamily: fonts.medium, fontSize: 13 },
  quiet: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, minHeight: 44, marginTop: 14 },
  quietText: { fontFamily: fonts.semibold, fontSize: 14 },
  sec: { fontFamily: fonts.display, fontSize: 20, marginTop: 28, marginBottom: 10 },
  altRate: { fontFamily: fonts.display, fontSize: 20 },
  linkBtn: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  link: { fontFamily: fonts.semibold, fontSize: 15 },
  hint: { fontFamily: fonts.body, fontSize: 13, marginTop: 12 },
  why: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 52, marginTop: 24 },
  whyText: { flex: 1, fontFamily: fonts.semibold, fontSize: 16 },
  whyBody: { gap: 8, paddingHorizontal: 4, paddingTop: 12 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  none: { alignItems: 'center', gap: 8, paddingVertical: 48 },
  noneTitle: { fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
});
