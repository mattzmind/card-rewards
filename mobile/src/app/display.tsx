/* Sort & Filter sheet (Todoist-style): rows with the current value → option list. ✓ saves, ✕ discards. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import type { WalletFilter, WalletView } from '@/core/types';
import { FILTER_DEFAULT, GROUPS, SORTS, SORT_NATURAL, VIEW_DEFAULT, filterDefs, viewOf, walletFiltered } from '@/core/wallet';
import { useApp, useCtx } from '@/store/app';
import { Icon } from '@/ui/icon';
import { tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

type Key = 'group' | 'sort' | 'order' | `f.${keyof WalletFilter}`;

export default function Display() {
  const { mode } = useLocalSearchParams<{ mode: 'sort' | 'filter' }>();
  const c = useColors(), ctx = useCtx(), update = useApp(s => s.update);
  const [v, setV] = useState<WalletView>(() => structuredClone(viewOf(ctx)));
  const [picking, setPicking] = useState<Key | null>(null);
  const defs = filterDefs(ctx);
  const save = () => { update(s => { s.view = v; }); router.back(); };
  const reset = () => { tap(); setV(mode === 'sort' ? { ...structuredClone(VIEW_DEFAULT), f: v.f } : { ...v, f: { ...FILTER_DEFAULT } }); };

  const head = (title: string, back?: () => void) => (
    <View style={styles.head}>
      <Pressable onPress={() => { tap(); if (back) back(); else router.back(); }} accessibilityLabel={back ? 'Back' : 'Cancel'} style={[styles.round, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name={back ? 'chevL' : 'x'} color={c.ink} size={20} />
      </Pressable>
      <Text style={[styles.title, { color: c.ink }]}>{title}</Text>
      {back ? <View style={{ width: 44 }} /> : (
        <Pressable onPress={() => { tap(); save(); }} accessibilityLabel="Save" style={[styles.round, { backgroundColor: c.primary, borderColor: c.primary }]}>
          <Icon name="check" color={c.onPrimary} size={20} />
        </Pressable>
      )}
    </View>
  );

  if (picking) {
    let title = '', opts: [string, string][] = [], cur = '', hint = '';
    if (picking === 'group') { title = 'Grouping'; cur = v.group === 'person' ? 'none' : v.group; opts = [['none', 'None'], ['bank', 'Bank'], ['type', 'Reward type']]; }
    else if (picking === 'sort') { title = 'Sorting'; cur = v.sort; opts = Object.entries(SORTS); }
    else if (picking === 'order') {
      title = 'Ordering'; cur = v.order; opts = [['asc', 'Ascending'], ['desc', 'Descending']];
      hint = ({ rewards: 'Descending shows the highest rates first.', name: 'Ascending is A to Z.', bank: 'Ascending is A to Z.', added: 'Descending shows the newest cards first.' } as Record<string, string>)[v.sort] || '';
    } else { const d = defs.find(x => 'f.' + x.k === picking)!; title = d.label; cur = v.f[d.k]; opts = d.opts; hint = d.hint || ''; }
    const choose = (val: string) => {
      tap();
      setV(x => {
        if (picking.startsWith('f.')) return { ...x, f: { ...x.f, [picking.slice(2)]: val } };
        if (picking === 'sort') return { ...x, sort: val as WalletView['sort'], order: SORT_NATURAL[val as WalletView['sort']] };
        return { ...x, [picking]: val };
      });
      setPicking(null);
    };
    return (
      <ScrollView contentContainerStyle={styles.wrap}>
        {head(title, () => setPicking(null))}
        {hint ? <Text style={[styles.hint, { color: c.muted }]}>{hint}</Text> : null}
        <View style={[styles.group, { backgroundColor: c.surface }]}>
          {opts.map(([val, label], i) => (
            <Pressable key={val} onPress={() => choose(val)} style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, pressed && { backgroundColor: c.surface2 }]}>
              <Text style={[styles.label, { color: c.ink, fontFamily: val === cur ? fonts.bold : fonts.medium }]}>{label}</Text>
              {val === cur ? <Icon name="check" color={c.accent} size={20} strokeWidth={2.4} /> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  const row = (icon: string, label: string, value: string, key: Key, disabled = false, first = false) => (
    <Pressable key={key} disabled={disabled} onPress={() => { tap(); setPicking(key); }}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, pressed && { backgroundColor: c.surface2 }, disabled && { opacity: 0.45 }]}>
      <Icon name={icon} color={c.accent} size={20} />
      <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
      <Text style={[styles.value, { color: c.muted }]} numberOfLines={1}>{value}</Text>
      <Icon name="chevR" color={c.muted} size={18} />
    </Pressable>
  );
  const toggle = (k: 'showRate' | 'showLast4', label: string, first = false) => (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
      <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
      <Switch value={v[k]} onValueChange={val => { tap(); setV(x => ({ ...x, [k]: val })); }} trackColor={{ true: '#16a34a' }} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {head(mode === 'sort' ? 'Sort' : 'Filter')}
      {mode === 'sort' ? (
        <>
          <View style={[styles.group, { backgroundColor: c.surface }]}>
            {row('layers', 'Grouping', GROUPS[v.group === 'person' ? 'none' : v.group], 'group', false, true)}
            {row('sort', 'Sorting', SORTS[v.sort], 'sort')}
            {row('arrowUp', 'Ordering', v.sort === 'custom' ? 'Your order' : v.order === 'asc' ? 'Ascending' : 'Descending', 'order', v.sort === 'custom')}
          </View>
          {v.sort === 'custom' ? <Text style={[styles.hint, { color: c.muted }]}>Press and hold any card in your wallet to drag it into place.</Text> : null}
          <Text style={[styles.sec, { color: c.muted }]}>SHOW ON EACH CARD</Text>
          <View style={[styles.group, { backgroundColor: c.surface }]}>{toggle('showRate', 'Top reward rate', true)}{toggle('showLast4', 'Last 4 digits')}</View>
        </>
      ) : (
        <>
          <View style={[styles.group, { backgroundColor: c.surface }]}>
            {defs.map((d, i) => row(d.icon, d.label, (d.opts.find(o => o[0] === v.f[d.k]) || d.opts[0])[1], `f.${d.k}`, false, i === 0))}
          </View>
          <Text style={[styles.hint, { color: c.muted }]}>Showing {walletFiltered(ctx, ctx.state.wallet, v.f).length} of {ctx.state.wallet.length} cards.</Text>
        </>
      )}
      <Pressable onPress={reset} style={({ pressed }) => [styles.reset, { borderColor: c.line, backgroundColor: pressed ? c.surface2 : c.surface }]}>
        <Text style={[styles.resetText, { color: c.ink }]}>Reset {mode === 'sort' ? 'sort' : 'filters'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: 48 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 20 },
  group: { borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 54 },
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 16 },
  value: { fontFamily: fonts.body, fontSize: 15, maxWidth: '45%' },
  hint: { fontFamily: fonts.body, fontSize: 13, marginTop: 10, marginHorizontal: 4, lineHeight: 19 },
  sec: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, marginTop: 24, marginBottom: 8, marginHorizontal: 4 },
  reset: { marginTop: 24, minHeight: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontFamily: fonts.semibold, fontSize: 15 },
});
