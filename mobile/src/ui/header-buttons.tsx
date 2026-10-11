/* Top of Earn and Wallet: the screen name (left), notifications bell (with count) and profile avatar (right). */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { allTasks } from '@/core/engine';
import { myName, useApp, useCtx } from '@/store/app';

import { Icon } from './icon';
import { tap } from './parts';
import { fonts, useColors } from './theme';

/* Screen name at the top left (Earn, Wallet) */
export function ScreenTitle({ children }: { children: string }) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">{children}</Text>;
}

/* White circle like the bell: the first initial, or the usual person outline for a guest (no name given) */
export function Avatar({ size = 44 }: { size?: number }) {
  const c = useColors(), name = myName(useApp(s => s.state));
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface }]}>
      {name ? <Text style={[styles.avatarText, { color: c.ink, fontSize: size * 0.42 }]}>{name[0].toUpperCase()}</Text>
        : <Icon name="user" color={c.ink} size={size * 0.5} />}
    </View>
  );
}

export function HeaderButtons({ extra }: { extra?: React.ReactNode }) {
  const c = useColors(), n = allTasks(useCtx()).length;
  return (
    <View style={styles.row}>
      <Pressable onPress={() => { tap(); router.push('/notifications'); }} accessibilityLabel={`Notifications${n ? `, ${n} need attention` : ''}`}
        style={({ pressed }) => [styles.bell, { backgroundColor: pressed ? c.surface2 : c.surface }]}>
        <Icon name="bell" color={c.ink} size={22} />
        {n ? <View style={[styles.badge, { backgroundColor: c.badge }]}><Text style={[styles.badgeText, { color: c.onBadge }]}>{n}</Text></View> : null}
      </Pressable>
      {extra}
      <Pressable onPress={() => { tap(); router.push('/profile'); }} accessibilityLabel="Profile" style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.7 : 1 }]}>
        <Avatar />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayHeavy, fontSize: 30, letterSpacing: -0.8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 3, right: 1, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display },
});
