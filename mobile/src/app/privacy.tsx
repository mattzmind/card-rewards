/* Data & Privacy (from Profile), one plain page like Profile: backup and restore, how Lucro keeps your data, the privacy policy,
   and Erase all data on its own at the bottom. */
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isoToDate, shortDate } from '@/core/dates';
import { fresh, useApp } from '@/store/app';
import { exportBackup, importBackup } from '@/store/backup';
import { openSite } from '@/ui/links';
import { List, Row, SheetBar, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';
import { toast } from '@/ui/toast';

export default function Privacy() {
  const c = useColors(), backedUp = useApp(s => s.state.backedUp), replace = useApp(s => s.replace);

  const restore = async () => {
    try { const n = await importBackup(); if (n != null) { router.dismissAll(); toast(`Restored ${n} card${n === 1 ? '' : 's'}`); } }
    catch (e) { Alert.alert('Could not restore', e instanceof Error ? e.message : String(e)); }
  };
  /* Erasing ends onboarding, so the app goes back to the welcome screen on its own (Stack.Protected in _layout) */
  const erase = () => Alert.alert('Erase all data?', 'This deletes your cards, picks, favorites and settings from this phone. Save a backup first if you might want them back.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Erase', style: 'destructive', onPress: () => replace(fresh()) },
  ]);

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={styles.wrap} stickyHeaderIndices={[0]}>
      <SheetBar bg={c.surface} onClose={() => router.back()} left={<Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">Data & Privacy</Text>} />

      <Text style={[styles.sec, { color: c.ink }]}>Backup</Text>
      <List flat>
        <Row first icon="download" title="Save a backup file" onPress={() => { tap(); exportBackup().catch(() => {}); }}
          sub={backedUp ? `Last backup ${shortDate(isoToDate(backedUp))}` : 'No backup yet. Save one to iCloud Drive, Google Drive or Files.'} />
        <Row icon="restore" title="Restore from a backup" sub="Works with backups from the Lucro web app too" onPress={() => { tap(); restore(); }} />
      </List>
      <Text style={[styles.note, { color: c.muted }]}>
        Your cards are stored only on this phone, so a backup is the only way to move them to a new phone or get them back.
      </Text>

      <Text style={[styles.sec, { color: c.ink }]}>Privacy</Text>
      <List flat>
        <Row first icon="lock" title="Privacy Policy" onPress={() => { tap(); openSite('privacy'); }} />
      </List>
      <Text style={[styles.note, { color: c.muted }]}>
        Lucro has no accounts and never asks for card numbers or bank logins. Your wallet stays on this phone.
      </Text>

      <List flat style={{ marginTop: 28 }}>
        <Row first icon="trash" title="Erase all data" onPress={erase} right={<View />} danger />
      </List>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingBottom: 48 },
  title: { fontFamily: fonts.display, fontSize: 20, paddingLeft: 4 },
  sec: { fontFamily: fonts.display, fontSize: 20, marginTop: 30, marginBottom: 4, marginHorizontal: 14 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 6, marginHorizontal: 14 },
});
