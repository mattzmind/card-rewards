/* Profile (sheet from the avatar): who you are, your data, settings, support, version.
   Standard grouped-settings layout: your name card and stats on top, then Your data (everything lives only on this
   phone, so the backup matters most), Settings, Support, and the version as footer text. */
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { isoToDate, shortDate } from '@/core/dates';
import { activeWallet, productOf } from '@/core/engine';
import { notifyOn } from '@/core/reminders';
import type { Profile as P } from '@/core/types';
import { useApp, useCtx } from '@/store/app';
import { Avatar } from '@/ui/header-buttons';
import { Icon } from '@/ui/icon';
import { APP_URL, openSite } from '@/ui/links';
import { List, Row, SheetBar, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';
import { toast } from '@/ui/toast';

/* rate: turn on once Lucro is in the App Store and Google Play (and add ios.appStoreUrl to app.json) */
const SHOW = { rate: false };
const STALE_DAYS = 30;

export default function Profile() {
  const c = useColors(), ctx = useCtx(), update = useApp(s => s.update);
  const pr = ctx.state.profile, nm = (pr.name || '').trim();
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(nm);
  const since = pr.since ? isoToDate(pr.since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const d = ctx.catalog.updated ? shortDate(isoToDate(ctx.catalog.updated)) : '';
  const cards = activeWallet(ctx);
  const fees = cards.reduce((a, w) => a + (+(productOf(ctx, w.product)?.fee || 0) || 0), 0);
  const backedUp = ctx.state.backedUp ? isoToDate(ctx.state.backedUp) : null;
  const stale = cards.length > 0 && (!backedUp || (ctx.clock.NOW.getTime() - backedUp.getTime()) / 864e5 > STALE_DAYS);
  const notify = pr.reminders ? (notifyOn(ctx, 'bonus') || notifyOn(ctx, 'picks') ? 'On' : 'Off') : pr.reminders === false ? 'Off in Settings' : 'Off';

  const saveName = () => {
    const old = pr.name, v = draft.trim().slice(0, 30);
    update(s => { s.profile.name = v; if (s.people[0]) s.people[0].name = v || 'Me'; });
    setEditing(false);
    toast(v ? `Hi, ${v.split(/\s+/)[0]}` : 'Name removed', () => update(s => { s.profile.name = old; if (s.people[0]) s.people[0].name = old || 'Me'; }));
  };
  const startEdit = () => { tap(); setDraft(nm); setEditing(true); };
  const setTheme = (t: P['theme']) => { tap(); update(s => { s.profile.theme = t; }); };
  const go = (to: Parameters<typeof router.push>[0]) => { tap(); router.push(to); };
  const rate = () => {
    tap();
    const url = StoreReview.storeUrl();
    if (url) Linking.openURL(Platform.OS === 'ios' ? `${url}?action=write-review` : url).catch(() => {});
    else StoreReview.requestReview().catch(() => {});
  };
  const chev = (value?: string, dot?: boolean) => (
    <View style={styles.right}>
      {dot ? <View style={[styles.dot, { backgroundColor: c.warn }]} /> : null}
      {value ? <Text style={[styles.value, { color: c.muted }]}>{value}</Text> : null}
      <Icon name="chevR" color={c.muted} size={18} />
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} left={<Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">Profile</Text>} />

      <List style={styles.first}>
        {editing ? (
          <View style={styles.id}>
            <Avatar size={56} bg={c.surface2} />
            <TextInput value={draft} onChangeText={setDraft} placeholder="First name" placeholderTextColor={c.muted} autoFocus maxLength={30}
              autoComplete="given-name" textContentType="givenName" autoCapitalize="words" onSubmitEditing={saveName} returnKeyType="done"
              style={[styles.field, { color: c.ink, backgroundColor: c.bg, borderColor: c.line }]} />
            <Pressable onPress={saveName} accessibilityLabel="Save name" style={[styles.iconBtn, { backgroundColor: c.primary }]}><Icon name="check" color={c.onPrimary} size={18} /></Pressable>
            <Pressable onPress={() => setEditing(false)} accessibilityLabel="Cancel" style={styles.iconBtn}><Icon name="x" color={c.ink} size={18} /></Pressable>
          </View>
        ) : (
          <Pressable onPress={startEdit} accessibilityLabel={nm ? `${nm}. Edit name` : 'Add your name'}
            style={({ pressed }) => [styles.id, pressed && { backgroundColor: c.surface2 }]}>
            <Avatar size={56} bg={c.surface2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{nm || 'Add your name'}</Text>
              <Text style={[styles.sub, { color: c.muted }]} numberOfLines={1}>{nm ? (since ? `Member since ${since}` : 'Tap to change your name') : 'Lucro will greet you by name'}</Text>
            </View>
            <View style={[styles.pencil, { backgroundColor: c.surface2 }]}><Icon name={nm ? 'edit' : 'plus'} color={c.muted} size={16} /></View>
          </Pressable>
        )}
      </List>

      <View style={[styles.stats, { backgroundColor: c.surface, borderColor: c.line }]}>
        {([[String(cards.length), 'CARDS'], [String(ctx.state.favs.length), 'FAVORITES'], [`$${fees.toLocaleString('en-US')}`, 'ANNUAL FEES']] as const).map(([n, l], i) => (
          <View key={l} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.line }]} accessible accessibilityLabel={`${n} ${l.toLowerCase()}`}>
            <Text style={[styles.statN, { color: c.ink }]}>{n}</Text><Text style={[styles.statL, { color: c.muted }]}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sec, { color: c.ink }]}>Your data</Text>
      <List>
        <Row first icon="lock" title="Data & Privacy" onPress={() => go('/privacy')} right={chev(undefined, stale)}
          sub={backedUp ? `Last backup ${shortDate(backedUp)}` : 'No backup yet'} />
      </List>

      <Text style={[styles.sec, { color: c.ink }]}>Settings</Text>
      <List>
        <Row first icon="bell" title="Notifications" onPress={() => go('/notification-settings')} right={chev(notify)} />
        <View style={[styles.pref, { borderTopColor: c.line }]}>
          <View style={styles.prefHead}>
            <View style={[styles.rowIc, { backgroundColor: c.surface2 }]}><Icon name="sun" color={c.accent} /></View>
            <Text style={[styles.prefTitle, { color: c.ink }]}>Appearance</Text>
          </View>
          <View style={[styles.seg, { backgroundColor: c.surface2 }]} accessibilityRole="radiogroup">
            {(['system', 'light', 'dark'] as const).map(t => (
              <Pressable key={t} onPress={() => setTheme(t)} accessibilityRole="radio" accessibilityState={{ checked: pr.theme === t }}
                style={[styles.segBtn, pr.theme === t && { backgroundColor: c.ink }]}>
                <Text style={[styles.segText, { color: pr.theme === t ? c.bg : c.muted }]}>{t[0].toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </List>

      <Text style={[styles.sec, { color: c.ink }]}>Support</Text>
      <List>
        <Row first icon="help" title="Help & FAQ" onPress={() => { tap(); openSite('support'); }} />
        <Row icon="mail" title="Send feedback" sub="Ideas, problems, anything" onPress={() => go({ pathname: '/report', params: { general: '1' } })} />
        <Row icon="plus" title="Request a card" sub="Missing a card? We’ll add it" onPress={() => go({ pathname: '/report', params: { card: '' } })} />
        {SHOW.rate ? <Row icon="star" title="Rate Lucro" onPress={rate} /> : null}
        <Row icon="share" title="Share Lucro" onPress={() => { tap(); Share.share({ message: `Lucro tells you which credit card to use for every purchase. ${APP_URL}` }).catch(() => {}); }} />
      </List>

      <View style={styles.foot}>
        <Text style={[styles.footText, { color: c.muted }]}>Lucro {Constants.expoConfig?.version || ''}</Text>
        <Text style={[styles.footText, { color: c.muted }]}>
          {Object.keys(ctx.catalog.products).length} cards and {(ctx.catalog.stores || []).length.toLocaleString('en-US')} stores{d ? `, updated ${d}` : ''}
        </Text>
        <View style={styles.legal}>
          <Pressable onPress={() => openSite('terms')} accessibilityRole="link" style={styles.link}><Text style={[styles.linkText, { color: c.muted }]}>Terms of Use</Text></Pressable>
          <Text style={[styles.footText, { color: c.muted }]}>·</Text>
          <Pressable onPress={() => openSite('privacy')} accessibilityRole="link" style={styles.link}><Text style={[styles.linkText, { color: c.muted }]}>Privacy Policy</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingBottom: 40 },
  title: { fontFamily: fonts.display, fontSize: 20, paddingLeft: 4 },
  first: { marginTop: 8 },
  id: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 84 },
  name: { fontFamily: fonts.display, fontSize: 22 },
  sub: { fontFamily: fonts.body, fontSize: 14, marginTop: 2 },
  pencil: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  field: { flex: 1, fontFamily: fonts.semibold, fontSize: 17, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, marginTop: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statN: { fontFamily: fonts.display, fontSize: 24 },
  statL: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.8, marginTop: 4 },
  sec: { fontFamily: fonts.display, fontSize: 18, marginTop: 26, marginBottom: 10, marginHorizontal: 4 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontFamily: fonts.body, fontSize: 15 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  pref: { padding: 14, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  prefHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prefTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  rowIc: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.semibold, fontSize: 14 },
  foot: { alignItems: 'center', marginTop: 28, gap: 2 },
  footText: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  legal: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontFamily: fonts.medium, fontSize: 13, textDecorationLine: 'underline' },
});
