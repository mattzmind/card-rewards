/* Notification settings (from Profile, or the gear in the Notifications inbox). One plain page like Profile.
   The phone controls whether Lucro may notify and how (banners, sounds, Lock Screen); this screen only picks which
   activity sends a reminder. A banner on top asks for permission, or points to the phone's Settings when it's blocked. */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { notifyOn } from '@/core/reminders';
import type { NotifyKind } from '@/core/types';
import { useCtx } from '@/store/app';
import { type Permission, enableReminders, refreshPermission, setNotify } from '@/store/reminders';
import { Icon } from '@/ui/icon';
import { Button, List, Row, SheetBar, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

const KINDS: { kind: NotifyKind; icon: string; title: string; sub: string }[] = [
  { kind: 'bonus', icon: 'bolt', title: 'Quarterly bonuses', sub: 'When a bonus opens, and before it’s due' },
  { kind: 'picks', icon: 'list', title: 'Category picks', sub: 'Before next quarter’s picks are due' },
];

export default function NotificationSettings() {
  const c = useColors(), ctx = useCtx();
  const [perm, setPerm] = useState<Permission | null>(null);
  useEffect(() => {
    refreshPermission().then(setPerm);
    const sub = AppState.addEventListener('change', st => { if (st === 'active') refreshPermission().then(setPerm); });
    return () => sub.remove();
  }, []);
  const on = perm === 'on';
  const turnOn = async () => { await enableReminders(); setPerm(await refreshPermission()); };
  const openSettings = () => { tap(); Linking.openSettings().catch(() => {}); };

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={styles.wrap} stickyHeaderIndices={[0]}>
      <SheetBar bg={c.surface} onClose={() => router.back()} left={<Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">Notifications</Text>} />

      {perm && !on ? (
        <View style={[styles.banner, { borderColor: c.line }]}>
          <View style={styles.bannerHead}>
            <View style={[styles.ic, { backgroundColor: c.hl }]}><Icon name="bell" color={c.hlInk} size={22} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerH, { color: c.ink }]}>{perm === 'ask' ? 'Get a heads-up before deadlines' : 'Notifications are off for Lucro'}</Text>
              <Text style={[styles.bannerP, { color: c.muted }]}>
                {perm === 'ask' ? 'Lucro reminds you before bonuses need activating and category picks are due.'
                  : 'Turn them on in your phone’s Settings to get reminders before bonuses and picks are due.'}
              </Text>
            </View>
          </View>
          <Button kind="lime" title={perm === 'ask' ? 'Turn on' : 'Open Settings'} onPress={perm === 'ask' ? turnOn : openSettings} />
        </View>
      ) : null}

      <Text style={[styles.sec, { color: c.ink }]}>Remind me about</Text>
      <List flat style={!on ? { opacity: 0.5 } : undefined}>
        {KINDS.map((k, i) => (
          <Row key={k.kind} first={i === 0} icon={k.icon} title={k.title} sub={k.sub}
            right={<Switch value={on && notifyOn(ctx, k.kind)} disabled={!on} onValueChange={v => { tap(); setNotify(k.kind, v); }}
              trackColor={{ true: '#16a34a' }} accessibilityLabel={k.title} />} />
        ))}
      </List>
      <Text style={[styles.note, { color: c.muted }]}>Sounds, banners and Lock Screen are set in your phone’s Settings.</Text>
      {on ? (
        <Pressable onPress={openSettings} accessibilityRole="link" style={styles.link}>
          <Text style={[styles.linkText, { color: c.accent }]}>Open phone Settings</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingBottom: 48 },
  title: { fontFamily: fonts.display, fontSize: 20, paddingLeft: 4 },
  banner: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 14, marginTop: 8, marginHorizontal: 14 },
  bannerHead: { flexDirection: 'row', gap: 12 },
  ic: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bannerH: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21 },
  bannerP: { fontFamily: fonts.body, fontSize: 14, marginTop: 3 },
  sec: { fontFamily: fonts.display, fontSize: 20, marginTop: 30, marginBottom: 4, marginHorizontal: 14 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 6, marginHorizontal: 14 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 14 },
  linkText: { fontFamily: fonts.semibold, fontSize: 14 },
});
