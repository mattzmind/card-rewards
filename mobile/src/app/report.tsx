/* "Wrong card?" feedback from an answer. Saved in Notifications so it can be shared. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { catById } from '@/core/cats';
import { dn, fmtRate, rank } from '@/core/engine';
import { REASONS, addReport } from '@/store/actions';
import { useCtx } from '@/store/app';
import { Button, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

export default function Report() {
  const { c: catId, s: storeId } = useLocalSearchParams<{ c: string; s?: string }>();
  const c = useColors(), ctx = useCtx();
  const [reason, setReason] = useState(0), [note, setNote] = useState('');
  const cat = catById(catId), store = storeId ? (ctx.catalog.stores || []).find(x => x.id === storeId) : null;
  if (!cat) return null;
  const submit = () => {
    const b = rank(ctx, cat, store)[0];
    addReport({ where: store ? store.name : cat.label, cat: cat.label, card: b ? `${dn(ctx, b.w)} ${fmtRate(b.rate)}%` : 'none', reason: REASONS[reason], note: note.trim() });
    router.back();
  };
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={[styles.h, { color: c.ink }]}>What went wrong?</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Your feedback is saved in notifications so you can send it in.</Text>
      <View style={{ gap: 8 }}>
        {REASONS.map((r, i) => (
          <Pressable key={r} onPress={() => { tap(); setReason(i); }} accessibilityRole="radio" accessibilityState={{ checked: reason === i }}
            style={[styles.radio, { backgroundColor: c.surface, borderColor: reason === i ? c.accent : c.line }]}>
            <View style={[styles.dot, { borderColor: reason === i ? c.accent : c.line }]}>{reason === i ? <View style={[styles.dotIn, { backgroundColor: c.accent }]} /> : null}</View>
            <Text style={[styles.radioText, { color: c.ink }]}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.label, { color: c.muted }]}>Details (optional)</Text>
      <TextInput value={note} onChangeText={setNote} multiline placeholder="For example: Costco charged this as gas, not warehouse" placeholderTextColor={c.muted}
        style={[styles.field, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
      <View style={{ marginTop: 18, gap: 4 }}>
        <Button title="Submit feedback" onPress={submit} />
        <Button kind="ghost" title="Cancel" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 48 },
  h: { fontFamily: fonts.display, fontSize: 24 },
  sub: { fontFamily: fonts.body, fontSize: 15, marginTop: 4, marginBottom: 16 },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotIn: { width: 10, height: 10, borderRadius: 5 },
  radioText: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  label: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 18, marginBottom: 8 },
  field: { fontFamily: fonts.body, fontSize: 16, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top' },
});
