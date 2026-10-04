/* Notifications (bell): quarterly activations, picks to confirm or choose, caps reached, your feedback. */
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { isoToDate, shortDate } from '@/core/dates';
import { type Task, activeWallet, allTasks, brandOf, dn, productOf } from '@/core/engine';
import type { WalletCard } from '@/core/types';
import { capLabel } from '@/core/wallet';
import { clearReports, confirmSame, dismissTask, finishAct, reportLine, startAct, undoCap } from '@/store/actions';
import { useCtx } from '@/store/app';
import { CardArt } from '@/ui/card-art';
import { Icon } from '@/ui/icon';
import { tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

type C = ReturnType<typeof useColors>;
const KIND: Record<string, [string, 'warn' | 'info' | 'accent']> = { activate: ['bolt', 'warn'], confirm: ['refresh', 'accent'], pick: ['list', 'info'] };

export default function Notifications() {
  const c = useColors(), ctx = useCtx();
  const tasks = allTasks(ctx), { TODAY } = ctx.clock;
  const caps: { w: WalletCard; k: string; u: string }[] = [];
  activeWallet(ctx).forEach(w => Object.entries(w.capped || {}).forEach(([k, u]) => { if (u >= TODAY) caps.push({ w, k, u }); }));
  const reports = ctx.state.reports;
  const openCard = (id: string) => router.push({ pathname: '/card/[id]', params: { id } });
  const openBank = (w: WalletCard) => { const u = brandOf(ctx, productOf(ctx, w.product)?.brand || '').login; if (u) Linking.openURL(u).catch(() => {}); };

  const chip = (w: WalletCard) => (
    <View style={styles.chip}><CardArt product={w.product} width={34} /><Text style={[styles.chipText, { color: c.ink }]}>{dn(ctx, w)}{w.last4 ? `  ••${w.last4}` : ''}</Text></View>
  );
  const buttons = (x: Task & { w: WalletCard }) => {
    const id = x.w.id;
    if (x.kind === 'activate') {
      if (x.w.pending === x.key) return <><Btn c={c} title="Yes, done" onPress={() => finishAct(id, x.q!, true)} /><Btn c={c} alt title="Not yet" onPress={() => finishAct(id, x.q!, false)} /></>;
      return <><Btn c={c} title="Activate now" onPress={() => { startAct(id, x.key!); openBank(x.w); }} /><Btn c={c} alt title="Dismiss" onPress={() => dismissTask(id, x.key!)} /></>;
    }
    if (x.kind === 'confirm') return <><Btn c={c} title="Keep same" onPress={() => confirmSame(id)} /><Btn c={c} alt title="Change" onPress={() => { openBank(x.w); openCard(id); }} /></>;
    return <Btn c={c} title="Choose" onPress={() => openCard(id)} />;
  };

  const empty = !tasks.length && !caps.length && !reports.length;
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" style={[styles.round, { backgroundColor: c.surface, borderColor: c.line }]}><Icon name="x" color={c.ink} size={20} /></Pressable>
        <Text style={[styles.title, { color: c.ink }]}>Notifications</Text>
        <View style={{ width: 44 }} />
      </View>

      {tasks.length ? (
        <>
          <Sec c={c} title="Action needed" n={tasks.length} />
          {tasks.map(x => {
            const [icon, tone] = KIND[x.kind] || KIND.pick, pending = x.w.pending === x.key;
            return (
              <Card key={x.w.id + (x.key || x.text)} c={c} icon={icon} tone={tone} dot
                title={pending ? 'Did you activate it?' : x.text} body={pending ? x.text.replace(/^Activate /, '') : x.sub}>
                {chip(x.w)}<View style={styles.actions}>{buttons(x)}</View>
              </Card>
            );
          })}
        </>
      ) : null}

      {caps.length ? (
        <>
          <Sec c={c} title="Spending caps reached" />
          {caps.map(x => (
            <Card key={x.w.id + x.k} c={c} icon="gauge" tone="info" title={capLabel(ctx, x.w, x.k)}
              body={`Skipped until ${shortDate(new Date(isoToDate(x.u).getTime() + 864e5))}, when the bonus resets.`}>
              {chip(x.w)}<View style={styles.actions}><Btn c={c} alt title="Not capped yet" onPress={() => undoCap(x.w.id, x.k)} /></View>
            </Card>
          ))}
        </>
      ) : null}

      {reports.length ? (
        <>
          <Sec c={c} title="Your feedback" />
          {reports.map((r, i) => <Card key={i} c={c} icon="flag" tone="muted" title={`${r.where} · ${r.card}`} body={`${r.reason}${r.note ? ` · ${r.note}` : ''} · ${shortDate(isoToDate(r.at))}`} />)}
          <View style={styles.actions}>
            <Btn c={c} title="Share all" onPress={() => Share.share({ message: reports.map(reportLine).join('\n') }).catch(() => {})} />
            <Btn c={c} alt title="Clear" onPress={clearReports} />
          </View>
        </>
      ) : null}

      {empty ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIc, { backgroundColor: c.hl }]}><Icon name="check" color={c.hlInk} size={30} strokeWidth={2.4} /></View>
          <Text style={[styles.emptyH, { color: c.ink }]}>You're all caught up</Text>
          <Text style={[styles.emptyP, { color: c.muted }]}>Quarterly activations, category picks, spending caps and your feedback will show up here.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Sec({ c, title, n }: { c: C; title: string; n?: number }) {
  return (
    <View style={styles.sec}>
      <Text style={[styles.secText, { color: c.ink }]}>{title}</Text>
      {n ? <View style={[styles.count, { backgroundColor: c.warnBg }]}><Text style={[styles.countText, { color: c.warn }]}>{n}</Text></View> : null}
    </View>
  );
}
function Card({ c, icon, tone, title, body, dot, children }: { c: C; icon: string; tone: 'warn' | 'info' | 'accent' | 'muted'; title: string; body?: string; dot?: boolean; children?: React.ReactNode }) {
  const bg = tone === 'warn' ? c.warnBg : tone === 'info' ? c.infoBg : tone === 'accent' ? c.surface2 : c.surface2;
  const fg = tone === 'warn' ? c.warn : tone === 'info' ? c.info : tone === 'accent' ? c.accent : c.muted;
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <View style={[styles.ic, { backgroundColor: bg }]}><Icon name={icon} color={fg} size={22} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.cTitle, { color: c.ink }]}>{title}</Text>
        {body ? <Text style={[styles.cBody, { color: c.muted }]}>{body}</Text> : null}
        {children}
      </View>
      {dot ? <View style={[styles.dot, { backgroundColor: c.warn }]} /> : null}
    </View>
  );
}
function Btn({ c, title, onPress, alt }: { c: C; title: string; onPress: () => void; alt?: boolean }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [styles.btn, { backgroundColor: alt ? (pressed ? c.line : c.surface2) : c.primary }]}>
      <Text style={[styles.btnText, { color: alt ? c.ink : c.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: 48 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 20 },
  sec: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 10, marginHorizontal: 4 },
  secText: { fontFamily: fonts.display, fontSize: 18 },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.bold, fontSize: 13 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 20, marginBottom: 10 },
  ic: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  cBody: { fontFamily: fonts.body, fontSize: 14, marginTop: 3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  btnText: { fontFamily: fonts.semibold, fontSize: 14 },
  dot: { position: 'absolute', top: 16, right: 14, width: 9, height: 9, borderRadius: 5 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIc: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyH: { fontFamily: fonts.display, fontSize: 22, marginBottom: 6 },
  emptyP: { fontFamily: fonts.body, fontSize: 15, textAlign: 'center' },
});
