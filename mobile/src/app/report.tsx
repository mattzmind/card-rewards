/* Feedback, emailed to the Lucro team (store/feedback.ts). Four modes:
   "Wrong card?" from an answer (c, s), a request to add a store that search couldn't find (missing),
   with a searchable category list, a request to add a card that isn't in the catalog (card),
   or general feedback from Profile (general). */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CATS, catById } from '@/core/cats';
import { dn, fmtRate, rank } from '@/core/engine';
import { REASONS, addReport } from '@/store/actions';
import { useCtx } from '@/store/app';
import { Icon } from '@/ui/icon';
import { Button, List, Row, SheetBar, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

export default function Report() {
  const { c: catId, s: storeId, missing, card, general } = useLocalSearchParams<{ c?: string; s?: string; missing?: string; card?: string; general?: string }>();
  if (general != null) return <General />;
  if (card != null) return <RequestCard name={card} />;
  if (missing != null) return <RequestStore name={missing} />;
  return <WrongCard catId={catId || ''} storeId={storeId} />;
}

function WrongCard({ catId, storeId }: { catId: string; storeId?: string }) {
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
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} />
      <Text style={[styles.h, { color: c.ink }]}>What went wrong?</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Your report goes straight to the Lucro team so we can fix the card data.</Text>
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
        style={[styles.field, styles.multi, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
      <View style={{ marginTop: 18, gap: 4 }}>
        <Button title="Submit feedback" onPress={submit} />
        <Button kind="ghost" title="Cancel" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

function RequestStore({ name: initial }: { name: string }) {
  const c = useColors();
  const [name, setName] = useState(initial), [note, setNote] = useState('');
  const [cat, setCat] = useState(''), [find, setFind] = useState('');
  const picked = catById(cat), f = find.trim().toLowerCase();
  const cats = CATS.filter(x => !f || (x.label + ' ' + (x.kw || '')).toLowerCase().includes(f))
    .sort((a, b) => (a.id === 'other' ? 1 : 0) - (b.id === 'other' ? 1 : 0) || a.label.localeCompare(b.label));
  const submit = () => {
    addReport({ where: name.trim(), cat: picked ? picked.label : '', card: 'Store not listed', reason: picked ? `Please add this store (${picked.label.toLowerCase()})` : 'Please add this store', note: note.trim() }, 'Thanks! Your request was sent');
    router.back();
  };
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} />
      <Text style={[styles.h, { color: c.ink }]}>Request a store</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Tell us which store or restaurant is missing. Your request goes straight to the Lucro team.</Text>
      <Text style={[styles.label, { color: c.muted, marginTop: 0 }]}>Store name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="For example: Rosa's Taqueria" placeholderTextColor={c.muted} autoCorrect={false} returnKeyType="next"
        style={[styles.field, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
      <Text style={[styles.label, { color: c.muted }]}>Category{picked ? `: ${picked.label}` : ''}</Text>
      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="search" color={c.muted} size={20} />
        <TextInput value={find} onChangeText={setFind} placeholder="Search categories" placeholderTextColor={c.muted} autoCorrect={false}
          clearButtonMode="while-editing" style={[styles.searchInput, { color: c.ink }]} />
      </View>
      <List style={styles.catList}>
        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {cats.length ? cats.map((x, i) => (
            <Row key={x.id} first={i === 0} icon={x.id} title={x.label} onPress={() => { tap(); setCat(x.id === cat ? '' : x.id); }}
              right={x.id === cat ? <Icon name="check" color={c.accent} size={20} strokeWidth={2.4} /> : <View />} />
          )) : <Text style={[styles.sub, { color: c.muted, margin: 14 }]}>No category matches “{find.trim()}”.</Text>}
        </ScrollView>
      </List>
      <Text style={[styles.label, { color: c.muted }]}>City and what they sell (optional)</Text>
      <TextInput value={note} onChangeText={setNote} multiline placeholder="For example: Austin, TX. Family-owned Mexican restaurant" placeholderTextColor={c.muted}
        style={[styles.field, styles.multi, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
      <View style={{ marginTop: 18, gap: 4 }}>
        <Button title="Send request" onPress={submit} disabled={!name.trim()} />
        <Button kind="ghost" title="Cancel" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

/* A card that isn't in the catalog yet (e.g. a credit union card) */
function RequestCard({ name: initial }: { name: string }) {
  const c = useColors();
  const [name, setName] = useState(initial), [bank, setBank] = useState(''), [note, setNote] = useState('');
  const submit = () => {
    addReport({ where: bank.trim() || 'Bank not given', cat: '', card: name.trim(), reason: 'Please add this card', note: note.trim() }, 'Thanks! Your request was sent');
    router.back();
  };
  const field = [styles.field, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }];
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} />
      <Text style={[styles.h, { color: c.ink }]}>Request a card</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Tell us which card is missing and we’ll add its rewards to Lucro. Your request goes straight to the Lucro team.</Text>
      <Text style={[styles.label, { color: c.muted, marginTop: 0 }]}>Card name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="For example: Diamond Preferred" placeholderTextColor={c.muted} autoCorrect={false} returnKeyType="next" style={field} />
      <Text style={[styles.label, { color: c.muted }]}>Bank (optional)</Text>
      <TextInput value={bank} onChangeText={setBank} placeholder="For example: Citi" placeholderTextColor={c.muted} autoCorrect={false} returnKeyType="next" style={field} />
      <Text style={[styles.label, { color: c.muted }]}>What it earns, if you know (optional)</Text>
      <TextInput value={note} onChangeText={setNote} multiline placeholder="For example: 3% at grocery stores, 1% everything else" placeholderTextColor={c.muted}
        style={[...field, styles.multi]} />
      <Text style={[styles.sub, { color: c.muted, fontSize: 13, marginTop: 10 }]}>Never include your card number.</Text>
      <View style={{ marginTop: 8, gap: 4 }}>
        <Button title="Send request" onPress={submit} disabled={!name.trim()} />
        <Button kind="ghost" title="Cancel" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

/* Anything else: an idea, a problem, a question (from Profile) */
const TOPICS = ['An idea', 'Something isn’t working', 'Something else'];
function General() {
  const c = useColors();
  const [topic, setTopic] = useState(0), [note, setNote] = useState('');
  const submit = () => {
    addReport({ where: 'Lucro app', cat: '', card: '', reason: `Feedback: ${TOPICS[topic]}`, note: note.trim() }, 'Thanks! Your feedback was sent');
    router.back();
  };
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets stickyHeaderIndices={[0]}>
      <SheetBar onClose={() => router.back()} />
      <Text style={[styles.h, { color: c.ink }]}>Send feedback</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Tell us what would make Lucro better. It goes straight to the Lucro team.</Text>
      <View style={{ gap: 8 }}>
        {TOPICS.map((r, i) => (
          <Pressable key={r} onPress={() => { tap(); setTopic(i); }} accessibilityRole="radio" accessibilityState={{ checked: topic === i }}
            style={[styles.radio, { backgroundColor: c.surface, borderColor: topic === i ? c.accent : c.line }]}>
            <View style={[styles.dot, { borderColor: topic === i ? c.accent : c.line }]}>{topic === i ? <View style={[styles.dotIn, { backgroundColor: c.accent }]} /> : null}</View>
            <Text style={[styles.radioText, { color: c.ink }]}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.label, { color: c.muted }]}>Your message</Text>
      <TextInput value={note} onChangeText={setNote} multiline placeholder="For example: I’d love a widget for my Home Screen" placeholderTextColor={c.muted}
        style={[styles.field, styles.multi, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
      <Text style={[styles.sub, { color: c.muted, fontSize: 13, marginTop: 10 }]}>Never include card numbers. Add your email in the message if you’d like a reply.</Text>
      <View style={{ marginTop: 8, gap: 4 }}>
        <Button title="Send" onPress={submit} disabled={!note.trim()} />
        <Button kind="ghost" title="Cancel" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: GUTTER, paddingBottom: 48 },
  h: { fontFamily: fonts.display, fontSize: 24 },
  sub: { fontFamily: fonts.body, fontSize: 15, marginTop: 4, marginBottom: 16 },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotIn: { width: 10, height: 10, borderRadius: 5 },
  radioText: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  label: { fontFamily: fonts.semibold, fontSize: 13, marginTop: 18, marginBottom: 8 },
  field: { fontFamily: fonts.body, fontSize: 16, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48 },
  multi: { minHeight: 90, textAlignVertical: 'top' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 48 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: 10 },
  catList: { height: 280, marginTop: 8 },
});
