/* Small shared building blocks: section heading, list row, category tile, primary button. */
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon } from './icon';
import { fonts, useColors } from './theme';

export const tap = () => Haptics.selectionAsync().catch(() => {});

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.secHead}>
      <Text style={[styles.secTitle, { color: c.ink }]}>{children}</Text>
      {right}
    </View>
  );
}

export function List({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[styles.list, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function Row({ icon, title, sub, right, onPress, first, left }:
  { icon?: string; title: string; sub?: string; right?: ReactNode; onPress?: () => void; first?: boolean; left?: ReactNode }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, pressed && { backgroundColor: c.surface2 }]}>
      {left ?? (icon ? <View style={[styles.rowIc, { backgroundColor: c.surface2 }]}><Icon name={icon} color={c.accent} /></View> : null)}
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: c.ink }]} numberOfLines={2}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevR" color={c.muted} size={18} /> : null)}
    </Pressable>
  );
}

export function Tile({ icon, label, onPress, wide }: { icon: string; label: string; onPress: () => void; wide?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [styles.tile, wide && styles.tileWide, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <Icon name={icon} color={c.accent} size={wide ? 26 : 24} />
      <Text style={[styles.tileLabel, { color: c.ink }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

export function Button({ title, onPress, disabled, kind = 'primary' }:
  { title: string; onPress: () => void; disabled?: boolean; kind?: 'primary' | 'ghost' | 'lime' }) {
  const c = useColors();
  const bg = kind === 'primary' ? c.primary : kind === 'lime' ? c.hl : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'lime' ? c.hlInk : c.muted;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} disabled={disabled}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed && kind !== 'ghost' ? 0.97 : 1 }] }]}>
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12, marginHorizontal: 2 },
  secTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.3 },
  list: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, minHeight: 56 },
  rowIc: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, minWidth: 0, gap: 1 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  rowSub: { fontFamily: fonts.body, fontSize: 13 },
  tile: { flexBasis: '31%', flexGrow: 1, minHeight: 88, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  tileWide: { flexBasis: '46%', flexDirection: 'row', gap: 12, minHeight: 80 },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },
  btn: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnText: { fontFamily: fonts.bold, fontSize: 16 },
});
