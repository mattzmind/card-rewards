/* Wallet: summary, sort/filter, pinned + grouped lists. Press and hold a card to drag it (My order);
   swipe a card for actions; tap for details. */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sortable from 'react-native-sortables';

import { activeWallet, fmtRate } from '@/core/engine';
import type { WalletCard, WalletFilter } from '@/core/types';
import {
  FILTER_DEFAULT, SORTS, activeFilterCount, filterValueLabel, viewOf, walletFiltered, walletGroups, walletSorted, walletSummary,
} from '@/core/wallet';
import { reorder } from '@/store/actions';
import { useApp, useCtx } from '@/store/app';
import { CardArt } from '@/ui/card-art';
import { HeaderButtons } from '@/ui/header-buttons';
import { Icon } from '@/ui/icon';
import { Button, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';
import { WalletRow } from '@/ui/wallet-row';

export default function Wallet() {
  const c = useColors(), insets = useSafeAreaInsets(), ctx = useCtx(), update = useApp(s => s.update);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const [showOff, setShowOff] = useState(false);
  const v = viewOf(ctx), nf = activeFilterCount(v.f);
  const act = activeWallet(ctx), all = ctx.state.wallet;
  const active = walletFiltered(ctx, act, v.f);
  const off = walletFiltered(ctx, all.filter(w => w.inactive), v.f).sort((a, b) => b.inactive!.localeCompare(a.inactive!));
  const pinned = walletSorted(ctx, active.filter(w => w.pinned), v), groups = walletGroups(ctx, walletSorted(ctx, active.filter(w => !w.pinned), v), v);
  const shown = [...pinned, ...groups.flatMap(g => g.items)].map(w => w.id);
  const canDrag = !nf; // dragging a filtered list would be confusing
  const sum = walletSummary(ctx);
  const fan = [...act.filter(w => w.pinned), ...act.filter(w => !w.pinned)].slice(0, 3);
  const clearFilter = (k: keyof WalletFilter | '*') => { tap(); update(s => { const cur = viewOf({ ...ctx, state: s }); s.view = { ...cur, f: k === '*' ? { ...FILTER_DEFAULT } : { ...cur.f, [k]: FILTER_DEFAULT[k] } }; }); };

  const list = (items: WalletCard[], key: string) => {
    const row = (w: WalletCard, i: number) => <WalletRow w={w} shown={shown} showRate={v.showRate} showLast4={v.showLast4} first={i === 0} />;
    return (
      <View key={key} style={[styles.list, { backgroundColor: c.surface }]}>
        {canDrag && items.length > 1 ? (
          <Sortable.Grid columns={1} data={items} keyExtractor={w => w.id} scrollableRef={scrollRef} rowGap={0}
            activeItemScale={1.03} dragActivationDelay={350} overDrag="vertical"
            renderItem={({ item, index }) => row(item, index)}
            onDragEnd={({ data, fromIndex, toIndex }) => { if (fromIndex !== toIndex) reorder(data.map(w => w.id), shown); }} />
        ) : items.map((w, i) => <View key={w.id}>{row(w, i)}</View>)}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <LinearGradient colors={[c.heroA, c.heroB, c.bg]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.topRow}><Text style={[styles.brand, { color: c.ink }]}>lucro</Text><HeaderButtons /></View>
          {fan.length ? (
            <View style={styles.fan} pointerEvents="none">
              {fan.map((w, i) => (
                <View key={w.id} style={[styles.fanCard, { zIndex: 3 - i, transform: [{ translateX: [8, -14, -36][i] }, { translateY: [0, 10, 22][i] }, { rotate: ['2deg', '-8deg', '-16deg'][i] }] }]}>
                  <CardArt product={w.product} width={140} plain />
                </View>
              ))}
            </View>
          ) : null}
          <Text style={[styles.title, { color: c.ink }]}>Your wallet</Text>
          <Text style={[styles.meta, { color: c.ink }]}>{act.length} CARD{act.length === 1 ? '' : 'S'}  ·  {sum.banks} BANK{sum.banks === 1 ? '' : 'S'}</Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: GUTTER }}>
          {act.length ? (
            <>
              <View style={[styles.stats, { backgroundColor: c.surface }]}>
                <View style={styles.stat}><Text style={[styles.statN, { color: c.rate }]}>{sum.best ? fmtRate(sum.best.rate) + '%' : '—'}</Text><Text style={[styles.statL, { color: c.muted }]}>TOP RATE</Text></View>
                <View style={[styles.stat, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.line }]}><Text style={[styles.statN, { color: c.ink }]}>{sum.everyday != null ? fmtRate(sum.everyday) + '%' : '—'}</Text><Text style={[styles.statL, { color: c.muted }]}>EVERYWHERE</Text></View>
              </View>
              {sum.best ? (
                <Pressable onPress={() => { tap(); router.push({ pathname: '/answer', params: { c: sum.best!.catId } }); }}
                  style={({ pressed }) => [styles.best, { backgroundColor: pressed ? c.surface2 : c.surface }]}>
                  <Icon name="star" color={c.star} size={20} />
                  <Text style={[styles.bestText, { color: c.ink }]}>Your best rate: <Text style={{ fontFamily: fonts.bold }}>{fmtRate(sum.best.rate)}% at {sum.best.catLabel.toLowerCase()}</Text> with {sum.best.card}</Text>
                  <Icon name="chevR" color={c.muted} size={18} />
                </Pressable>
              ) : null}
            </>
          ) : null}

          {all.length ? (
            <View style={styles.toolbar}>
              <Pill c={c} icon="sort" label={SORTS[v.sort]} on={v.sort !== 'custom' || v.group !== 'none'} onPress={() => router.push({ pathname: '/display', params: { mode: 'sort' } })} />
              <Pill c={c} icon="filter" label={`Filter${nf ? ` · ${nf}` : ''}`} on={!!nf} onPress={() => router.push({ pathname: '/display', params: { mode: 'filter' } })} />
            </View>
          ) : null}
          {nf ? (
            <View style={styles.chips}>
              {(Object.keys(FILTER_DEFAULT) as (keyof WalletFilter)[]).filter(k => v.f[k] !== FILTER_DEFAULT[k]).map(k => (
                <Pressable key={k} onPress={() => clearFilter(k)} accessibilityLabel={`Remove filter ${filterValueLabel(ctx, k, v.f[k])}`}
                  style={[styles.chip, { borderColor: c.ink, backgroundColor: c.surface }]}>
                  <Text style={[styles.chipText, { color: c.ink }]}>{filterValueLabel(ctx, k, v.f[k])}</Text><Icon name="x" color={c.ink} size={14} />
                </Pressable>
              ))}
              <Pressable onPress={() => clearFilter('*')} style={styles.clearAll}><Text style={[styles.link, { color: c.accent }]}>Clear all</Text></Pressable>
            </View>
          ) : null}

          {!all.length ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyH, { color: c.ink }]}>No cards yet</Text>
              <Text style={[styles.emptyP, { color: c.muted }]}>Add the cards you carry and Earn picks the best one for every purchase.</Text>
              <Button title="Add a card" onPress={() => router.push('/add')} />
            </View>
          ) : !active.length && nf ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyP, { color: c.muted }]}>No cards match these filters.</Text>
              <Button kind="ghost" title="Clear filters" onPress={() => clearFilter('*')} />
            </View>
          ) : !active.length ? (
            <Text style={[styles.hint, { color: c.muted }]}>All your cards are deactivated. Reactivate one below or tap + to add a card.</Text>
          ) : (
            <>
              {pinned.length ? <><SecHead c={c} icon="pin" title="Pinned" />{list(pinned, 'pinned')}</> : null}
              {groups.map(g => (
                <View key={g.key}>
                  {g.title ? <SecHead c={c} title={g.title} n={g.items.length} /> : pinned.length ? <SecHead c={c} title="All cards" /> : <View style={{ height: 18 }} />}
                  {list(g.items, g.key)}
                </View>
              ))}
              {!ctx.state.dragTipSeen && active.length > 1 ? (
                <Text style={[styles.hint, { color: c.muted, textAlign: 'center' }]}>
                  Tip: press and hold a card to move it. Swipe a card for more options.{' '}
                  <Text style={{ color: c.accent, fontFamily: fonts.semibold }} onPress={() => update(s => { s.dragTipSeen = true; })}>Got it</Text>
                </Text>
              ) : null}
            </>
          )}

          {off.length ? (
            <>
              <Pressable onPress={() => { tap(); setShowOff(!showOff); }} style={[styles.more, { backgroundColor: c.surface }]} accessibilityState={{ expanded: showOff }}>
                <Icon name="archive" color={c.ink} size={20} />
                <Text style={[styles.moreText, { color: c.ink }]}>Deactivated cards ({off.length})</Text>
                <Icon name={showOff ? 'chevD' : 'chevR'} color={c.muted} size={18} />
              </Pressable>
              {showOff ? (
                <>
                  <Text style={[styles.hint, { color: c.muted }]}>Cards you no longer use. They don't show up on Earn or in notifications.</Text>
                  <View style={[styles.list, { backgroundColor: c.surface }]}>
                    {off.map((w, i) => <WalletRow key={w.id} w={w} shown={shown} showRate={false} showLast4={v.showLast4} first={i === 0} />)}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      </Animated.ScrollView>

      <Pressable onPress={() => { tap(); router.push('/add'); }} accessibilityLabel="Add a card"
        style={({ pressed }) => [styles.fab, { backgroundColor: c.primary, bottom: insets.bottom + 72, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
        <Icon name="plus" color={c.onPrimary === '#ffffff' ? c.hl : c.onPrimary} size={28} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

type C = ReturnType<typeof useColors>;
function Pill({ c, icon, label, on, onPress }: { c: C; icon: string; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [styles.pill, { borderColor: on ? c.ink : c.line, backgroundColor: on ? c.hl + '4D' : pressed ? c.surface2 : c.surface }]}>
      <Icon name={icon} color={c.ink} size={18} /><Text style={[styles.pillText, { color: c.ink }]} numberOfLines={1}>{label}</Text><Icon name="chevD" color={c.muted} size={16} />
    </Pressable>
  );
}
function SecHead({ c, title, icon, n }: { c: C; title: string; icon?: string; n?: number }) {
  return (
    <View style={styles.sec}>
      {icon ? <Icon name={icon} color={c.ink} size={18} /> : null}
      <Text style={[styles.secText, { color: c.ink }]}>{title}</Text>
      {n != null ? <Text style={[styles.secN, { color: c.muted }]}>{n}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: GUTTER, paddingBottom: 18, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 18 },
  brand: { fontFamily: fonts.displayHeavy, fontSize: 24, letterSpacing: -0.8 },
  fan: { position: 'absolute', right: -6, top: 92, width: 180, height: 130 },
  fanCard: { position: 'absolute', right: 0, top: 0 },
  title: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.8, maxWidth: '60%' },
  meta: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, marginTop: 16 },
  stats: { flexDirection: 'row', borderRadius: 22, paddingVertical: 16, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statN: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.4 },
  statL: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.8, marginTop: 4 },
  best: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12, minHeight: 52 },
  bestText: { flex: 1, fontFamily: fonts.body, fontSize: 15 },
  toolbar: { flexDirection: 'row', gap: 10, marginTop: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 44, flexShrink: 1 },
  pillText: { fontFamily: fonts.semibold, fontSize: 14, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 36 },
  chipText: { fontFamily: fonts.medium, fontSize: 13 },
  clearAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  link: { fontFamily: fonts.semibold, fontSize: 14 },
  list: { borderRadius: 22, overflow: 'hidden' },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 26, marginBottom: 10, marginHorizontal: 4 },
  secText: { fontFamily: fonts.display, fontSize: 20 },
  secN: { fontFamily: fonts.body, fontSize: 15 },
  hint: { fontFamily: fonts.body, fontSize: 13, marginTop: 14, marginHorizontal: 2, lineHeight: 19 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, paddingHorizontal: 16, minHeight: 52, marginTop: 20 },
  moreText: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
  empty: { alignItems: 'stretch', gap: 10, paddingVertical: 36 },
  emptyH: { fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  emptyP: { fontFamily: fonts.body, fontSize: 15, textAlign: 'center', marginBottom: 8 },
  fab: { position: 'absolute', right: 18, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
