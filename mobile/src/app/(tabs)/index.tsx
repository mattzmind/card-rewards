/* Earn: greeting, store/category search, favorites or popular categories, all categories. */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CAT_GROUPS, POPULAR_CATS, catById, catName } from '@/core/cats';
import { activeWallet, allTasks, searchAll, visibleCats } from '@/core/engine';
import { myName, useApp, useCtx } from '@/store/app';
import { CardArt } from '@/ui/card-art';
import { HeaderButtons } from '@/ui/header-buttons';
import { Icon } from '@/ui/icon';
import { Button, List, Row, SectionTitle, Tile, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const openAnswer = (c: string, s?: string) => router.push({ pathname: '/answer', params: s ? { c, s } : { c } });

export default function Earn() {
  const c = useColors(), insets = useSafeAreaInsets();
  const ctx = useCtx(), state = useApp(s => s.state), update = useApp(s => s.update);
  const [q, setQ] = useState('');
  const act = activeWallet(ctx), tasks = allTasks(ctx).length, name = myName(state);
  const top = act.find(w => w.pinned) || act[0];
  const vis = visibleCats(ctx), vid = new Set(vis.map(x => x.id));
  const stores = ctx.catalog.stores || [];

  const favs = state.favs.map(k => {
    const id = k.slice(2);
    if (k[0] === 's') { const st = stores.find(x => x.id === id); return st && catById(st.cat) ? { c: st.cat, s: id, label: st.name } : null; }
    const cat = catById(id); return cat ? { c: id, s: '', label: cat.label } : null;
  }).filter((x): x is { c: string; s: string; label: string } => !!x);
  const recents = state.recents.filter(x => catById(x.c) && (!x.s || stores.some(s => s.id === x.s)));
  const res = q.trim() ? searchAll(ctx, q) : null;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentInsetAdjustmentBehavior="never">
      <LinearGradient colors={[c.heroA, c.heroB, c.bg]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brandRow}>
          <Text style={[styles.brand, { color: c.ink }]}>lucro</Text>
          <HeaderButtons />
        </View>
        {top ? <View style={styles.peek} pointerEvents="none"><CardArt product={top.product} width={170} plain /></View> : null}
        <Text style={[styles.greet, { color: c.ink }]}>{greeting()}{name ? ',' : ''}</Text>
        {name ? <Text style={[styles.name, { color: c.ink }]}>{name}</Text> : null}
        <Text style={[styles.tag, { color: c.muted }]}>Every purchase pays you back.</Text>
        <Text style={[styles.meta, { color: c.ink }]}>
          {act.length} CARD{act.length === 1 ? '' : 'S'} READY{tasks ? <Text style={{ color: c.warn }}>{`  ·  ${tasks} NEED${tasks === 1 ? 'S' : ''} SETUP`}</Text> : null}
        </Text>
      </LinearGradient>

      {!act.length ? (
        <View style={[styles.emptyBox, { paddingHorizontal: GUTTER }]}>
          <Text style={[styles.emptyH, { color: c.ink }]}>Add your first card</Text>
          <Text style={[styles.emptyP, { color: c.muted }]}>Lucro shows which card wins at every store. Add the cards you carry to get started.</Text>
          <Button title="Add a card" onPress={() => router.push('/add')} />
        </View>
      ) : (
      <View style={{ paddingHorizontal: GUTTER }}>
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Icon name="search" color={c.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Where are you shopping?" placeholderTextColor={c.muted}
            style={[styles.searchInput, { color: c.ink }]} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
        </View>

        {res ? (
          <>
            {res.st.length || res.ct.length ? (
              <List style={{ marginTop: 12 }}>
                {res.st.map((s, i) => <Row key={s.id} first={i === 0} icon={s.cat} title={s.name}
                  sub={catName(s.cat) + (s.id === 'costco' || s.id === 'costco_gas' ? ' · Visa only' : '')} onPress={() => openAnswer(s.cat, s.id)} />)}
                {res.ct.map((x, i) => <Row key={x.id} first={!res.st.length && i === 0} icon={x.id} title={x.label} sub="Category" onPress={() => openAnswer(x.id)} />)}
              </List>
            ) : <Text style={[styles.hint, { color: c.muted }]}>No store called “{q}” in the list.</Text>}
            <SectionTitle>Local or not listed? Pick what it is</SectionTitle>
            <View style={styles.tiles}>{vis.map(x => <Tile key={x.id} icon={x.id} label={x.label} onPress={() => openAnswer(x.id)} />)}</View>
          </>
        ) : (
          <>
            <SectionTitle>{favs.length ? 'Favorites' : 'Popular categories'}</SectionTitle>
            <View style={[styles.panel, { backgroundColor: c.surface }]}>
              {!favs.length ? <Text style={[styles.hint, { color: c.muted, marginTop: 0, marginBottom: 10 }]}>Where most people shop. Star any answer to pin your own favorites.</Text> : null}
              <View style={styles.tiles}>
                {favs.length
                  ? favs.map(f => <Tile key={f.c + f.s} icon={f.c} label={f.label} onPress={() => openAnswer(f.c, f.s || undefined)} />)
                  : POPULAR_CATS.filter(id => vid.has(id)).map(id => <Tile key={id} wide icon={id} label={catName(id)} onPress={() => openAnswer(id)} />)}
              </View>
            </View>

            {recents.length ? (
              <>
                <SectionTitle right={<Pressable hitSlop={12} onPress={() => { tap(); update(s => { s.recents = []; }); }}><Text style={[styles.link, { color: c.accent }]}>Clear</Text></Pressable>}>Recent</SectionTitle>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {recents.map(x => {
                    const st = x.s ? stores.find(s => s.id === x.s) : null;
                    return (
                      <Pressable key={x.c + (x.s || '')} onPress={() => openAnswer(x.c, x.s || undefined)}
                        style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
                        <Icon name={x.c} color={c.accent} size={18} />
                        <Text style={[styles.chipText, { color: c.ink }]}>{st ? st.name : catName(x.c)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <SectionTitle>All categories</SectionTitle>
            {(() => {
              const placed = new Set<string>();
              return CAT_GROUPS.map(([group, ids], i) => {
                const list = i === CAT_GROUPS.length - 1 ? vis.filter(x => !placed.has(x.id)) : vis.filter(x => ids.includes(x.id));
                list.forEach(x => placed.add(x.id));
                if (!list.length) return null;
                return (
                  <View key={group} style={{ marginBottom: 20 }}>
                    <Text style={[styles.group, { color: c.muted }]}>{group.toUpperCase()}</Text>
                    <View style={styles.tiles}>{list.map(x => <Tile key={x.id} icon={x.id} label={x.label} onPress={() => openAnswer(x.id)} />)}</View>
                  </View>
                );
              });
            })()}
          </>
        )}
        <Text style={[styles.foot, { color: c.muted }]}>
          {Object.keys(ctx.catalog.products).length} cards and {stores.length} stores in the catalog.{'\n'}Your cards stay on this phone.
        </Text>
      </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: GUTTER, paddingBottom: 22, overflow: 'hidden' },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 14 },
  brand: { fontFamily: fonts.displayHeavy, fontSize: 24, letterSpacing: -0.8 },
  peek: { position: 'absolute', right: -46, top: 90, transform: [{ rotate: '-6deg' }] },
  greet: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, maxWidth: '68%' },
  name: { fontFamily: fonts.display, fontSize: 18, marginTop: 4 },
  tag: { fontFamily: fonts.body, fontSize: 16, marginTop: 8, maxWidth: '62%' },
  meta: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, marginTop: 18 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 52 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 17, paddingVertical: 12 },
  hint: { fontFamily: fonts.body, fontSize: 14, marginTop: 12, marginHorizontal: 2 },
  panel: { borderRadius: 22, padding: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  link: { fontFamily: fonts.semibold, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 44 },
  chipText: { fontFamily: fonts.semibold, fontSize: 14 },
  group: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, marginBottom: 10, marginHorizontal: 2 },
  emptyBox: { paddingTop: 12, gap: 10 },
  emptyH: { fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  emptyP: { fontFamily: fonts.body, fontSize: 15, textAlign: 'center', marginBottom: 8 },
  foot: { fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
