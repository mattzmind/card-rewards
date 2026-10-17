/* Small shared building blocks: section heading, list row, category tile, primary button,
   sheet top bar with a close (X) button, last-4 digits field. */
import * as Haptics from 'expo-haptics';
import { type ReactNode, createContext, useContext, useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';

import { Icon } from './icon';
import { GUTTER, fonts, useColors } from './theme';

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

/* flat: no box, just the rows and their dividers, for pages that are one plain surface (Profile, Data & Privacy,
   Notification settings). Rows inside a flat list show a plain icon instead of one in a tinted square. */
const FlatList = createContext(false);
export function List({ children, style, flat = false }: { children: ReactNode; style?: ViewStyle; flat?: boolean }) {
  const c = useColors();
  return (
    <FlatList.Provider value={flat}>
      <View style={[flat ? null : [styles.list, { backgroundColor: c.surface, borderColor: c.line }], style]}>{children}</View>
    </FlatList.Provider>
  );
}

/* Icon at the start of a settings row: no background, one color, one size, same width so titles line up */
export function RowIcon({ name, danger }: { name: string; danger?: boolean }) {
  const c = useColors();
  return <View style={styles.rowIcPlain}><Icon name={name} color={danger ? c.danger : c.ink} size={22} /></View>;
}

export function Row({ icon, title, sub, right, onPress, first, left, danger }:
  { icon?: string; title: string; sub?: string; right?: ReactNode; onPress?: () => void; first?: boolean; left?: ReactNode; danger?: boolean }) {
  const c = useColors(), flat = useContext(FlatList);
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }, pressed && { backgroundColor: c.surface2 }]}>
      {left ?? (!icon ? null : flat ? <RowIcon name={icon} danger={danger} />
        : <View style={[styles.rowIc, { backgroundColor: c.surface2 }]}><Icon name={icon} color={danger ? c.danger : c.accent} /></View>)}
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: danger ? c.danger : c.ink }]} numberOfLines={2}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: c.muted }]} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevR" color={c.muted} size={18} /> : null)}
    </Pressable>
  );
}

/* width: a fixed size (Favorites stay one third wide even when there are only one or two) */
export function Tile({ icon, label, onPress, wide, width }: { icon: string; label: string; onPress: () => void; wide?: boolean; width?: number }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [styles.tile, wide && styles.tileWide, width != null && { width, flexBasis: width, flexGrow: 0 }, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
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

/* Round X used at the top right of every slide-up sheet */
export function CloseButton({ onPress, label = 'Close' }: { onPress: () => void; label?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.round, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
      <Icon name="x" color={c.ink} size={20} />
    </Pressable>
  );
}

/* Top of a sheet: optional left content (e.g. a Back link), X on the right. Put it as the FIRST child of the
   sheet's root ScrollView with stickyHeaderIndices={[0]}: it stays pinned while the content scrolls under it.
   Keep the ScrollView as the sheet's root. iOS form sheets don't give a wrapper View a height, so a
   View > [bar, ScrollView] layout either overlaps the bar or collapses the ScrollView to nothing. */
export function SheetBar({ onClose, left, bg }: { onClose: () => void; left?: ReactNode; bg?: string }) {
  const c = useColors();
  return <View style={[styles.bar, { backgroundColor: bg || c.bg }]}><View style={{ flex: 1 }}>{left}</View><CloseButton onPress={onClose} /></View>;
}

/* Last 4 digits: digits only, standard iOS field behavior. The system clear button (circled ✕ while editing)
   erases it in one tap, and a Done bar sits above the number pad, which has no return key of its own. */
export const last4Ok = (v: string) => v.length === 0 || v.length === 4;
let doneBarSeq = 0;
export function Last4Input({ value, onChangeText, style }: { value: string; onChangeText: (v: string) => void; style?: TextStyle | TextStyle[] }) {
  const c = useColors();
  const [barId] = useState(() => `last4-done-${++doneBarSeq}`);
  return (
    <View>
      <TextInput value={value} onChangeText={v => onChangeText(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4}
        placeholder="0000" placeholderTextColor={c.muted + '99'} accessibilityLabel="Last 4 digits" returnKeyType="done" clearButtonMode="while-editing"
        inputAccessoryViewID={Platform.OS === 'ios' ? barId : undefined} style={[style, !value && styles.last4Empty]} />
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={barId}>
          <View style={[styles.doneBar, { backgroundColor: c.surface2, borderTopColor: c.line }]}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Done" style={styles.doneBtn}>
              <Text style={[styles.doneText, { color: c.accent }]}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  doneBar: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8 },
  doneBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  doneText: { fontFamily: fonts.semibold, fontSize: 17 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: -GUTTER, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  secHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12, marginHorizontal: 2 },
  secTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.3 },
  list: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, minHeight: 56 },
  rowIc: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  /* Placeholders use the field's font, so an empty field drops to regular weight: "0000" stays soft, typed digits stay bold */
  last4Empty: { fontFamily: fonts.body },
  rowIcPlain:{ width: 26, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, minWidth: 0, gap: 1 },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 16 },
  rowSub: { fontFamily: fonts.body, fontSize: 13 },
  tile: { flexBasis: '31%', flexGrow: 1, minHeight: 88, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  tileWide: { flexBasis: '46%', flexDirection: 'row', gap: 12, minHeight: 80 },
  tileLabel: { fontFamily: fonts.semibold, fontSize: 14, textAlign: 'center' },
  btn: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  btnText: { fontFamily: fonts.bold, fontSize: 16 },
});
