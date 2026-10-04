/* Profile: name, stats, appearance, backup/restore, privacy, erase, share, version. */
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { isoToDate, shortDate } from '@/core/dates';
import { activeWallet } from '@/core/engine';
import type { Profile as P } from '@/core/types';
import { fresh, useApp, useCtx } from '@/store/app';
import { exportBackup, importBackup } from '@/store/backup';
import { disableReminders, enableReminders } from '@/store/reminders';
import { Avatar } from '@/ui/header-buttons';
import { Icon } from '@/ui/icon';
import { List, Row, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';
import { toast } from '@/ui/toast';

const APP_URL = 'https://mattzmind.github.io/card-rewards/';

export default function Profile() {
  const c = useColors(), ctx = useCtx(), update = useApp(s => s.update), replace = useApp(s => s.replace);
  const pr = ctx.state.profile, nm = (pr.name || '').trim();
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState(nm);
  const looks = Object.values(ctx.state.usage).reduce((a, b) => a + (+b || 0), 0);
  const since = pr.since ? isoToDate(pr.since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const d = ctx.catalog.updated ? shortDate(isoToDate(ctx.catalog.updated)) : '';

  const saveName = () => {
    const old = pr.name, v = draft.trim().slice(0, 30);
    update(s => { s.profile.name = v; if (s.people[0]) s.people[0].name = v || 'Me'; });
    setEditing(false);
    toast(v ? `Hi, ${v.split(/\s+/)[0]}` : 'Name removed', () => update(s => { s.profile.name = old; if (s.people[0]) s.people[0].name = old || 'Me'; }));
  };
  const setTheme = (t: P['theme']) => { tap(); update(s => { s.profile.theme = t; }); };
  const toggleReminders = async (on: boolean) => {
    tap();
    if (!on) { await disableReminders(); return; }
    if (!(await enableReminders())) Alert.alert('Notifications are off', "Turn on notifications for Expo Go (or Lucro) in your phone's Settings to get reminders.");
  };
  const restore = async () => {
    try { const n = await importBackup(); if (n != null) { router.back(); toast(`Restored ${n} card${n === 1 ? '' : 's'}`); } }
    catch (e) { Alert.alert('Could not restore', e instanceof Error ? e.message : String(e)); }
  };
  const erase = () => Alert.alert('Erase all data?', 'This deletes your cards, picks, favorites and settings from this phone. Save a backup first if you might want them back.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Erase', style: 'destructive', onPress: () => replace(fresh()) },
  ]);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.head}>
        <Avatar size={76} />
        {editing ? (
          <View style={styles.renameRow}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="First name" placeholderTextColor={c.muted} autoFocus maxLength={30}
              autoComplete="given-name" textContentType="givenName" autoCapitalize="words" onSubmitEditing={saveName} returnKeyType="done"
              style={[styles.field, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
            <Pressable onPress={saveName} accessibilityLabel="Save name" style={[styles.iconBtn, { backgroundColor: c.primary }]}><Icon name="check" color={c.onPrimary} size={18} /></Pressable>
            <Pressable onPress={() => setEditing(false)} accessibilityLabel="Cancel" style={styles.iconBtn}><Icon name="x" color={c.ink} size={18} /></Pressable>
          </View>
        ) : (
          <Pressable onPress={() => { tap(); setDraft(nm); setEditing(true); }} style={styles.nameRow} accessibilityLabel="Edit name">
            <Text style={[styles.name, { color: nm ? c.ink : c.muted }]}>{nm || 'Add your name'}</Text>
            <View style={[styles.pencil, { backgroundColor: c.surface2 }]}><Icon name="edit" color={c.muted} size={16} /></View>
          </Pressable>
        )}
        {since ? <Text style={[styles.sub, { color: c.muted }]}>Using Lucro since {since}</Text> : null}
      </View>

      <View style={[styles.stats, { backgroundColor: c.surface }]}>
        {[[activeWallet(ctx).length, 'CARDS'], [looks, 'LOOKUPS'], [ctx.state.favs.length, 'FAVORITES']].map(([n, l], i) => (
          <View key={l} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.line }]}>
            <Text style={[styles.statN, { color: c.ink }]}>{n}</Text><Text style={[styles.statL, { color: c.muted }]}>{l}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sec, { color: c.ink }]}>Preferences</Text>
      <List>
        <View style={styles.pref}>
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
        <Row icon="bell" title="Deadline reminders" sub="A heads-up before quarterly bonuses and picks are due"
          right={<Switch value={!!pr.reminders} onValueChange={toggleReminders} trackColor={{ true: '#16a34a' }} accessibilityLabel="Deadline reminders" />} />
      </List>

      <Text style={[styles.sec, { color: c.ink }]}>Your data</Text>
      <List>
        <Row first icon="download" title="Save a backup file" sub={ctx.state.backedUp ? `Last backup ${shortDate(isoToDate(ctx.state.backedUp))}` : 'No backup yet. Save one to iCloud Drive or Files.'} onPress={() => exportBackup().catch(() => {})} />
        <Row icon="restore" title="Restore from a backup" sub="Works with backups from the Lucro web app too" onPress={restore} />
        <Row icon="lock" title="Private by design" sub="Your cards stay on this phone. Lucro never asks for card numbers or bank logins." />
        <Row icon="trash" title="Erase all data" onPress={erase} right={<View />} danger />
      </List>

      <Text style={[styles.sec, { color: c.ink }]}>About</Text>
      <List>
        <Row first icon="share" title="Share Lucro" sub="Send it to a friend" onPress={() => Share.share({ message: `Lucro tells you which credit card to use for every purchase. ${APP_URL}` }).catch(() => {})} />
        <Row icon="info" title={`Lucro ${Constants.expoConfig?.version || ''}`} sub={`${Object.keys(ctx.catalog.products).length} cards and ${(ctx.catalog.stores || []).length} stores${d ? `, updated ${d}` : ''}`} />
      </List>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingTop: 28, paddingBottom: 48 },
  head: { alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  name: { fontFamily: fonts.display, fontSize: 26 },
  pencil: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  field: { flex: 1, fontFamily: fonts.semibold, fontSize: 18, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 15 },
  stats: { flexDirection: 'row', borderRadius: 22, paddingVertical: 16, marginTop: 20 },
  stat: { flex: 1, alignItems: 'center' },
  statN: { fontFamily: fonts.display, fontSize: 26 },
  statL: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.8, marginTop: 4 },
  sec: { fontFamily: fonts.display, fontSize: 18, marginTop: 26, marginBottom: 10, marginHorizontal: 4 },
  pref: { padding: 14, gap: 12 },
  prefHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  prefTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  rowIc: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.semibold, fontSize: 14 },
});
