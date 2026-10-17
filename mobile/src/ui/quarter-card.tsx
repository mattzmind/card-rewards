/* Wallet: this quarter's bonuses, always shown while the wallet has a rotating or quarterly-pick card.
   Compact by default: one line per card (name, rate, status), and anything left to do (activate, choose,
   confirm) keeps its button right there. Tap the header to show each card's categories; the choice is saved.
   Tap a row for the card's details. */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { qLabel } from '@/core/dates';
import { dn, fmtRate } from '@/core/engine';
import { type QuarterRow, quarterRows } from '@/core/wallet';
import { confirmSame, finishAct, startAct } from '@/store/actions';
import { useApp, useCtx } from '@/store/app';

import { CardArt } from './card-art';
import { Icon } from './icon';
import { openBank } from './links';
import { tap } from './parts';
import { fonts, useColors } from './theme';

type C = ReturnType<typeof useColors>;
const openCard = (id: string) => router.push({ pathname: '/card/[id]', params: { id } });

export function QuarterCard() {
  const c = useColors(), ctx = useCtx(), rows = quarterRows(ctx), { QK, daysLeftInQ } = ctx.clock;
  if (!rows.length) return null;
  const todo = rows.filter(r => r.state === 'activate' || r.state === 'pick' || r.state === 'confirm').length;
  const open = !!ctx.state.quarterOpen;
  const toggle = () => { tap(); useApp.getState().update(s => { s.quarterOpen = !open; }); };
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <Pressable onPress={toggle} style={styles.head} accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`${qLabel(QK)} bonuses, ${open ? 'hide' : 'show'} categories`}>
        <Icon name="bolt" color={todo ? c.warn : c.rate} size={18} />
        <Text style={[styles.title, { color: c.ink }]}>{qLabel(QK)} bonuses</Text>
        <Text style={[styles.left, { color: c.muted }]}>{daysLeftInQ} day{daysLeftInQ === 1 ? '' : 's'} left</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="chevD" color={c.muted} size={18} /></View>
      </Pressable>
      {rows.map(r => <Line key={r.w.id + r.q} c={c} r={r} name={dn(ctx, r.w)} next={r.q !== QK} open={open} ctxBank={() => openBank(ctx, r.w)} />)}
    </View>
  );
}

function Line({ c, r, name, next, open, ctxBank }: { c: C; r: QuarterRow; name: string; next: boolean; open: boolean; ctxBank: () => void }) {
  const pending = r.state === 'activate' && !!r.key && r.w.pending === r.key;
  const right = pending ? null
    : r.state === 'on' ? <View style={styles.status}><Icon name="check" color={c.rate} size={16} strokeWidth={2.6} /><Text style={[styles.statusText, { color: c.rate }]}>{r.key ? 'On' : 'Set'}</Text></View>
    : r.state === 'activate' ? <Btn c={c} title="Activate" onPress={() => { startAct(r.w.id, r.key!); ctxBank(); }} />
    : r.state === 'pick' ? <Btn c={c} title="Choose" onPress={() => openCard(r.w.id)} />
    : r.state === 'confirm' ? <Btn c={c} title="Keep" onPress={() => confirmSame(r.w.id)} />
    : r.state === 'missed' ? <Text style={[styles.statusText, { color: c.muted }]}>Missed</Text>
    : null;
  return (
    <Pressable onPress={() => { tap(); openCard(r.w.id); }} accessibilityLabel={`${name}, ${r.what}`}
      style={[styles.row, { borderTopColor: c.line }]}>
      <CardArt product={r.w.product} width={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>
          {name}<Text style={{ color: c.rate }}>  {fmtRate(r.rate)}%</Text>{next ? <Text style={{ color: c.muted }}>  · {qLabel(r.q)}</Text> : null}
        </Text>
        {open ? <Text style={[styles.what, { color: c.muted }]} numberOfLines={2}>{r.what}</Text> : null}
        {pending ? <Text style={[styles.due, { color: c.ink }]}>Did you activate it?</Text>
          : r.due ? <Text style={[styles.due, { color: c.warn }]}>{r.due}</Text> : null}
        {pending ? (
          <View style={styles.actions}>
            <Btn c={c} title="Yes, done" onPress={() => finishAct(r.w.id, r.q, true)} />
            <Btn c={c} alt title="Not yet" onPress={() => finishAct(r.w.id, r.q, false)} />
          </View>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

function Btn({ c, title, onPress, alt }: { c: C; title: string; onPress: () => void; alt?: boolean }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} hitSlop={6}
      style={[styles.btn, { backgroundColor: alt ? c.surface2 : c.primary }]}>
      <Text style={[styles.btnText, { color: alt ? c.ink : c.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, paddingHorizontal: 14, paddingBottom: 2, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 16 },
  left: { fontFamily: fonts.medium, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 50, borderTopWidth: StyleSheet.hairlineWidth },
  name: { fontFamily: fonts.semibold, fontSize: 15 },
  what: { fontFamily: fonts.body, fontSize: 13, marginTop: 2, lineHeight: 18 },
  due: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  statusText: { fontFamily: fonts.semibold, fontSize: 14 },
  btn: { minHeight: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  btnText: { fontFamily: fonts.semibold, fontSize: 14 },
});
