/* Wallet (Phase 1: read-only list + backup). Swipe, reorder, sort/filter and editing come in Phase 2. */
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeWallet, brandOf, dn, fmtRate, netLabel, netOf, productOf, tasksFor } from '@/core/engine';
import { useApp, useCtx } from '@/store/app';
import { exportBackup, importBackup } from '@/store/backup';
import { CardArt } from '@/ui/card-art';
import { List, Row, SectionTitle } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

export default function Wallet() {
  const c = useColors(), insets = useSafeAreaInsets(), ctx = useCtx();
  const backedUp = useApp(s => s.state.backedUp);
  const cards = activeWallet(ctx), off = ctx.state.wallet.filter(w => w.inactive);

  const restore = async () => {
    try { const n = await importBackup(); if (n != null) Alert.alert('Wallet restored', `${n} card${n === 1 ? '' : 's'} restored.`); }
    catch (e) { Alert.alert('Could not restore', e instanceof Error ? e.message : String(e)); }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 40 }}>
      <Text style={[styles.title, { color: c.ink }]}>Wallet</Text>
      <Text style={[styles.sub, { color: c.muted }]}>{cards.length} card{cards.length === 1 ? '' : 's'}{off.length ? ` · ${off.length} deactivated` : ''}</Text>

      {cards.length ? (
        <List style={{ marginTop: 18 }}>
          {cards.map((w, i) => {
            const p = productOf(ctx, w.product), t = tasksFor(ctx, w).length;
            const top = p ? Math.max(p.base, ...(p.rules || []).map(r => r.rate), ...(p.choice || []).map(s => s.rate), p.rotating?.rate || 0, p.auto?.rate || 0) * (p.type === 'cash' ? 1 : (p.cpp || 1)) : 0;
            return (
              <Row key={w.id} first={i === 0} left={<CardArt product={w.product} width={64} />}
                title={dn(ctx, w)}
                sub={[p ? brandOf(ctx, p.brand).name : '', netLabel(netOf(ctx, w)), w.last4 ? `•••• ${w.last4}` : '', t ? `${t} to set up` : ''].filter(Boolean).join(' · ')}
                right={<View style={{ alignItems: 'flex-end' }}><Text style={[styles.upTo, { color: c.muted }]}>up to</Text><Text style={[styles.top, { color: c.rate }]}>{fmtRate(Math.round(top * 100) / 100)}%</Text></View>} />
            );
          })}
        </List>
      ) : <Text style={[styles.sub, { color: c.muted, marginTop: 24 }]}>No cards yet.</Text>}

      <SectionTitle>Backup</SectionTitle>
      <List>
        <Row first icon="download" title="Save a backup file" sub={backedUp ? `Last backup ${backedUp}` : 'No backup yet. Save one to iCloud Drive or Files.'} onPress={() => exportBackup().catch(() => {})} />
        <Row icon="restore" title="Restore from a backup" sub="Works with backups from the Lucro web app too" onPress={restore} />
      </List>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.body, fontSize: 16, marginTop: 4 },
  upTo: { fontFamily: fonts.semibold, fontSize: 11 },
  top: { fontFamily: fonts.display, fontSize: 22 },
});
