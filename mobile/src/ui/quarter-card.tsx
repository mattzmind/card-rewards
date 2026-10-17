/* Wallet: this quarter's bonuses, always shown while the wallet has a rotating or quarterly-pick card.
   Each row says what the card earns this quarter and whether it's on; anything left to do (activate,
   choose, confirm) has its button right there. Tap a row for the card's details. */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { qLabel } from '@/core/dates';
import { dn, fmtRate } from '@/core/engine';
import { type QuarterRow, quarterRows } from '@/core/wallet';
import { confirmSame, finishAct, startAct } from '@/store/actions';
import { useCtx } from '@/store/app';

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
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <View style={styles.head}>
        <Icon name="bolt" color={todo ? c.warn : c.rate} size={18} />
        <Text style={[styles.title, { color: c.ink }]}>{qLabel(QK)} bonuses</Text>
        <Text style={[styles.left, { color: c.muted }]}>{daysLeftInQ} day{daysLeftInQ === 1 ? '' : 's'} left</Text>
      </View>
      {rows.map((r, i) => <Line key={r.w.id + r.q} c={c} r={r} name={dn(ctx, r.w)} next={r.q !== QK} first={i === 0} ctxBank={() => openBank(ctx, r.w)} />)}
    </View>
  );
}

function Line({ c, r, name, next, first, ctxBank }: { c: C; r: QuarterRow; name: string; next: boolean; first: boolean; ctxBank: () => void }) {
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
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, pressed && { opacity: 0.7 }]}>
      <CardArt product={r.w.product} width={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>
          {name}<Text style={{ color: c.rate }}>  {fmtRate(r.rate)}%</Text>{next ? <Text style={{ color: c.muted }}>  · {qLabel(r.q)}</Text> : null}
        </Text>
        <Text style={[styles.what, { color: c.muted }]} numberOfLines={2}>{r.what}</Text>
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
      style={({ pressed }) => [styles.btn, { backgroundColor: alt ? (pressed ? c.line : c.surface2) : pressed ? c.ink : c.primary }]}>
      <Text style={[styles.btnText, { color: alt ? c.ink : c.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, marginTop: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 18 },
  left: { fontFamily: fonts.medium, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56 },
  name: { fontFamily: fonts.semibold, fontSize: 15 },
  what: { fontFamily: fonts.body, fontSize: 14, marginTop: 2, lineHeight: 19 },
  due: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  statusText: { fontFamily: fonts.semibold, fontSize: 14 },
  btn: { minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  btnText: { fontFamily: fonts.semibold, fontSize: 14 },
});
