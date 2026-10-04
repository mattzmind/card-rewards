/* One card in the Wallet list. Swipe right: Pin / More. Swipe left: Deactivate (or Reactivate) / Delete.
   Tap opens the card's details. */
import { router } from 'expo-router';
import { useRef } from 'react';
import { ActionSheetIOS, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { brandOf, dn, fmtRate, netLabel, netOf, productOf, tasksFor } from '@/core/engine';
import type { WalletCard } from '@/core/types';
import { bestFor, deactivatedLabel, topRate } from '@/core/wallet';
import { moveTo, removeCards, setInactive, togglePin } from '@/store/actions';
import { useCtx } from '@/store/app';

import { CardArt } from './card-art';
import { Icon } from './icon';
import { tap } from './parts';
import { fonts, useColors } from './theme';

export function openCardMenu(w: WalletCard, name: string, shown: string[]) {
  const open = () => router.push({ pathname: '/card/[id]', params: { id: w.id } });
  if (Platform.OS !== 'ios') { open(); return; }
  const opts: [string, () => void][] = [
    ['Edit details & rewards', open],
    ...(w.inactive ? [] : [
      [w.pinned ? 'Unpin' : 'Pin to top', () => togglePin(w.id)],
      ['Move to top', () => moveTo(w.id, 'top', shown)],
      ['Move to bottom', () => moveTo(w.id, 'bottom', shown)],
    ] as [string, () => void][]),
    [w.inactive ? 'Reactivate' : 'Deactivate', () => setInactive([w.id], !w.inactive)],
    ['Delete', () => removeCards([w.id])],
  ];
  ActionSheetIOS.showActionSheetWithOptions(
    { title: name, options: [...opts.map(o => o[0]), 'Cancel'], destructiveButtonIndex: opts.length - 1, cancelButtonIndex: opts.length },
    i => { if (i < opts.length) opts[i][1](); },
  );
}

export function WalletRow({ w, shown, showRate, showLast4, first }: { w: WalletCard; shown: string[]; showRate: boolean; showLast4: boolean; first?: boolean }) {
  const c = useColors(), ctx = useCtx(), ref = useRef<SwipeableMethods>(null);
  const p = productOf(ctx, w.product), name = dn(ctx, w);
  const needs = !w.inactive && tasksFor(ctx, w).length > 0;
  const sub = w.inactive ? deactivatedLabel(ctx, w) : (w.nickname && p) || !p ? (p ? `${brandOf(ctx, p.brand).name} ${p.name}` : 'Not in the catalog') : '';
  const pills = !w.inactive && p ? bestFor(ctx, w) : [];
  const close = () => ref.current?.close();
  /* A swipe must never count as a tap: ignore presses that moved, that happen while the row is
     being dragged, or while its actions are open (then a tap just closes them). */
  const start = useRef({ x: 0, y: 0 }), swiping = useRef(false), open = useRef(false);
  const settle = (isOpen: boolean) => { open.current = isOpen; setTimeout(() => { swiping.current = false; }, 250); };
  const onRowPress = (e: { nativeEvent: { pageX: number; pageY: number } }) => {
    const moved = Math.abs(e.nativeEvent.pageX - start.current.x) > 8 || Math.abs(e.nativeEvent.pageY - start.current.y) > 8;
    if (moved || swiping.current) return;
    if (open.current) { close(); return; }
    tap(); router.push({ pathname: '/card/[id]', params: { id: w.id } });
  };

  const act = (icon: string, label: string, bg: string, fg: string, fn: () => void) => (
    <Pressable key={label} onPress={() => { tap(); close(); fn(); }} style={[styles.act, { backgroundColor: bg }]} accessibilityLabel={`${label} ${name}`}>
      <Icon name={icon} color={fg} size={22} /><Text style={[styles.actText, { color: fg }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Swipeable ref={ref} friction={1.6} overshootFriction={8} leftThreshold={50} rightThreshold={50}
      onSwipeableOpenStartDrag={() => { swiping.current = true; }} onSwipeableCloseStartDrag={() => { swiping.current = true; }}
      onSwipeableOpen={() => settle(true)} onSwipeableClose={() => settle(false)} onSwipeableWillClose={() => settle(false)}
      renderLeftActions={() => (
        <View style={styles.acts}>
          {act('more', 'More', c.primary, c.onPrimary, () => openCardMenu(w, name, shown))}
          {!w.inactive ? act('pin', w.pinned ? 'Unpin' : 'Pin', c.accent, c.onAccent, () => togglePin(w.id)) : null}
        </View>
      )}
      renderRightActions={() => (
        <View style={styles.acts}>
          {w.inactive ? act('restore', 'Reactivate', '#0f766e', '#fff', () => setInactive([w.id], false))
            : act('archive', 'Deactivate', '#b7791f', '#fff', () => setInactive([w.id], true))}
          {act('trash', 'Delete', '#b42318', '#fff', () => removeCards([w.id]))}
        </View>
      )}>
      <Pressable onPressIn={e => { start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; }} onPress={onRowPress}
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surface2 : c.surface, opacity: w.inactive ? 0.6 : 1 },
          !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }]}>
        <CardArt product={w.product} width={58} />
        <View style={styles.main}>
          <View style={styles.titleRow}>
            {w.pinned && !w.inactive ? <Icon name="pin" color={c.accent} size={15} /> : null}
            <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>{name}</Text>
            {needs ? <View style={[styles.dot, { backgroundColor: c.warn }]} accessibilityLabel="needs an update" /> : null}
          </View>
          {sub ? <Text style={[styles.sub, { color: c.muted }]} numberOfLines={1}>{sub}</Text> : null}
          {pills.length ? (
            <View style={styles.pills}>
              {pills.map(b => (
                <View key={b.label} style={[styles.pill, { backgroundColor: b.warn ? c.warnBg : c.surface2 }]}>
                  <Text style={[styles.pillText, { color: b.warn ? c.warn : c.ink }]}><Text style={{ fontFamily: fonts.bold }}>{b.rate}</Text> {b.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.meta}>
            {p ? <Text style={[styles.net, { color: c.ink, borderColor: c.line }]}>{netLabel(netOf(ctx, w)).toUpperCase()}</Text> : null}
            {showLast4 && w.last4 ? <Text style={[styles.sub, { color: c.muted }]}>•••• {w.last4}</Text> : null}
          </View>
        </View>
        {showRate && !w.inactive && p ? (
          <View style={styles.top}>
            <Text style={[styles.upTo, { color: c.muted }]}>up to</Text>
            <Text style={[styles.rate, { color: c.rate }]}>{fmtRate(topRate(ctx, w))}%</Text>
          </View>
        ) : null}
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, minHeight: 76 },
  main: { flex: 1, minWidth: 0, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.semibold, fontSize: 17, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sub: { fontFamily: fonts.body, fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontFamily: fonts.medium, fontSize: 12.5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  net: { fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  top: { alignItems: 'flex-end' },
  upTo: { fontFamily: fonts.semibold, fontSize: 11 },
  rate: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4 },
  acts: { flexDirection: 'row' },
  act: { width: 84, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actText: { fontFamily: fonts.semibold, fontSize: 12 },
});
