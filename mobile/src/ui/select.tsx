/* Dropdown: a field that opens a list of options right below it (like the bank sites' "Choose categories").
   Inline instead of a modal, so it works inside the slide-up sheets. Options taken by a sibling dropdown
   (e.g. your other 5% pick) are shown but can't be chosen twice. */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from './icon';
import { tap } from './parts';
import { fonts, useColors } from './theme';

export interface Opt { id: string; label: string }

export function Select({ value, options, onChange, open, onToggle, placeholder = 'Choose a category', taken = [], label }: {
  value?: string; options: Opt[]; onChange: (id: string) => void; open: boolean; onToggle: () => void;
  placeholder?: string; taken?: string[]; label?: string;
}) {
  const c = useColors(), cur = options.find(o => o.id === value);
  return (
    <View style={[styles.box, { borderColor: open ? c.accent : c.line, backgroundColor: c.surface }]}>
      <Pressable onPress={() => { tap(); onToggle(); }} accessibilityRole="button" accessibilityState={{ expanded: open }}
        accessibilityLabel={`${label ? label + ': ' : ''}${cur ? cur.label : placeholder}`}
        style={({ pressed }) => [styles.field, pressed && { backgroundColor: c.surface2 }]}>
        <Text style={[styles.value, { color: cur ? c.ink : c.muted }]} numberOfLines={1}>{cur ? cur.label : placeholder}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="chevD" color={c.ink} size={20} /></View>
      </Pressable>
      {open ? (
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }}>
          {options.map(o => {
            const on = o.id === value, off = !on && taken.includes(o.id);
            return (
              <Pressable key={o.id} disabled={off} onPress={() => { tap(); onChange(o.id); }} accessibilityRole="menuitem"
                accessibilityState={{ selected: on, disabled: off }}
                style={({ pressed }) => [styles.opt, pressed && { backgroundColor: c.surface2 }, on && { backgroundColor: c.surface2 }]}>
                <Text style={[styles.optText, { color: off ? c.muted : c.ink, fontFamily: on ? fonts.semibold : fonts.body }]}>{o.label}</Text>
                {on ? <Icon name="check" color={c.accent} size={18} strokeWidth={2.4} /> : off ? <Text style={[styles.taken, { color: c.muted }]}>Already picked</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14 },
  value: { flex: 1, fontFamily: fonts.medium, fontSize: 16 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14 },
  optText: { flex: 1, fontSize: 15 },
  taken: { fontFamily: fonts.body, fontSize: 12 },
});
