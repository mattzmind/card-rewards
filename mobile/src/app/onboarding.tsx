/* First run: welcome → your name → your cards → a first answer from their own wallet. */
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POPULAR_CARDS, catById } from '@/core/cats';
import { iso, makeClock } from '@/core/dates';
import { brandOf, dn, fmtRate, productOf, rank } from '@/core/engine';
import { newCard, useApp, useCtx } from '@/store/app';
import { importBackup } from '@/store/backup';
import { CardArt } from '@/ui/card-art';
import { Icon } from '@/ui/icon';
import { Button, List, Row, tap } from '@/ui/parts';
import { GUTTER, fonts, useColors } from '@/ui/theme';

const INK = '#0B1412', LIME = '#A3E635';
const PREVIEW = ['grocery', 'dining', 'gas'];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  return (
    <Animated.View key={step} entering={FadeInRight.duration(220)} exiting={FadeOutLeft.duration(120)} style={{ flex: 1 }}>
      {step === 1 ? <Welcome next={() => setStep(2)} />
        : step === 2 ? <NameStep back={() => setStep(1)} next={() => setStep(3)} />
        : <CardsAndDone back={() => setStep(2)} />}
    </Animated.View>
  );
}

function Welcome({ next }: { next: () => void }) {
  const insets = useSafeAreaInsets();
  const restore = async () => {
    try { await importBackup(); } catch (e) { Alert.alert('Could not restore', e instanceof Error ? e.message : String(e)); }
  };
  const vals: [string, string, string][] = [
    ['tag', 'The right card at every store', 'Search any store and see which card earns the most.'],
    ['bolt', 'Never miss a bonus', 'Reminders for quarterly activations and category picks.'],
    ['lock', 'Private by design', 'Your cards stay on this phone. No bank logins, ever.'],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: GUTTER, paddingBottom: 24 }}>
        <Text style={styles.word}>lucro</Text>
        <View style={styles.fan} pointerEvents="none">
          {POPULAR_CARDS.slice(0, 3).map((id, i) => (
            <View key={id} style={[styles.fanCard, { transform: [{ translateX: [-58, 58, 0][i] }, { translateY: [18, 18, -4][i] }, { rotate: ['-12deg', '12deg', '0deg'][i] }], zIndex: i }]}>
              <CardArt product={id} width={190} plain />
            </View>
          ))}
        </View>
        <Text style={styles.welcomeH}>Get paid back on every purchase.</Text>
        <View style={{ gap: 16, marginTop: 24 }}>
          {vals.map(([i, t, s]) => (
            <View key={t} style={styles.val}>
              <View style={styles.valIc}><Icon name={i} color={LIME} size={21} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.valT}>{t}</Text>
                <Text style={styles.valS}>{s}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 8 }}>
        <Button kind="lime" title="Get started" onPress={next} />
        <Pressable onPress={restore} style={styles.restore}>
          <Text style={styles.restoreText}>Have a backup? <Text style={{ color: '#fff', textDecorationLine: 'underline' }}>Restore it</Text></Text>
        </Pressable>
      </View>
    </View>
  );
}

function Top({ back, step }: { back: () => void; step: number }) {
  const c = useColors();
  return (
    <View style={styles.top}>
      <Pressable onPress={() => { tap(); back(); }} accessibilityLabel="Back" style={[styles.round, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="chevL" color={c.ink} size={20} />
      </Pressable>
      <View style={styles.dots}>{[2, 3, 4].map(s => <View key={s} style={[styles.dot, { backgroundColor: s <= step ? c.ink : c.line }]} />)}</View>
      <View style={{ width: 44 }} />
    </View>
  );
}

function NameStep({ back, next }: { back: () => void; next: () => void }) {
  const c = useColors(), insets = useSafeAreaInsets(), update = useApp(s => s.update);
  const [name, setName] = useState(useApp.getState().state.profile.name || '');
  const save = () => {
    const v = name.trim().slice(0, 30); if (!v) return;
    update(s => { s.profile.name = v; if (s.people[0]) s.people[0].name = v; });
    next();
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: GUTTER }}>
        <Top back={back} step={2} />
        <Text style={[styles.h1, { color: c.ink }]}>What should we call you?</Text>
        <Text style={[styles.p, { color: c.muted }]}>Just your first name, so Lucro feels like yours.</Text>
        <TextInput value={name} onChangeText={setName} placeholder="First name" placeholderTextColor={c.muted} autoFocus maxLength={30}
          autoComplete="given-name" textContentType="givenName" autoCapitalize="words" returnKeyType="next" onSubmitEditing={save}
          style={[styles.nameField, { color: c.ink, backgroundColor: c.surface, borderColor: c.line }]} />
      </View>
      <View style={[styles.barRow, { paddingBottom: insets.bottom + 8 }]}>
        <View style={{ minWidth: 84 }}><Button kind="ghost" title="Skip" onPress={next} /></View>
        <View style={{ flex: 1 }}><Button title="Continue" onPress={save} disabled={!name.trim()} /></View>
      </View>
    </KeyboardAvoidingView>
  );
}

function CardsAndDone({ back }: { back: () => void }) {
  const c = useColors(), insets = useSafeAreaInsets(), ctx = useCtx(), update = useApp(s => s.update);
  const [sel, setSel] = useState<string[]>([]), [q, setQ] = useState(''), [done, setDone] = useState(false);
  const name = (ctx.state.profile.name || '').trim().split(/\s+/)[0];
  const ids = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return POPULAR_CARDS.filter(id => productOf(ctx, id));
    return Object.keys(ctx.catalog.products).filter(id => { const p = productOf(ctx, id)!; return (brandOf(ctx, p.brand).name + ' ' + p.name + ' ' + p.short).toLowerCase().includes(t); }).slice(0, 30);
  }, [q, ctx]);
  const toggle = (id: string) => { tap(); setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id])); };

  /* Preview answers from the cards they picked, before anything is saved */
  const previewCtx = useMemo(() => ({ ...ctx, state: { ...ctx.state, wallet: sel.map(newCard) }, clock: makeClock() }), [ctx, sel]);
  const picks = PREVIEW.map(id => { const cat = catById(id)!, b = rank(previewCtx, cat)[0]; return b ? { cat, b } : null; }).filter(Boolean) as { cat: NonNullable<ReturnType<typeof catById>>; b: ReturnType<typeof rank>[number] }[];

  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    update(s => { s.wallet.push(...sel.map(newCard)); s.onboarded = true; s.profile.since = s.profile.since || iso(new Date()); });
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: GUTTER, paddingBottom: 24 }}>
          <Top back={() => setDone(false)} step={4} />
          <View style={[styles.doneIc, { backgroundColor: c.hl }]}><Icon name="check" color={c.hlInk} size={32} strokeWidth={2.4} /></View>
          <Text style={[styles.h1, { color: c.ink }]}>{name ? `You're all set, ${name}.` : "You're all set."}</Text>
          {picks.length ? (
            <>
              <Text style={[styles.p, { color: c.muted }]}>Here's what Lucro picks from your wallet:</Text>
              <List>{picks.map(({ cat, b }, i) => (
                <Row key={cat.id} first={i === 0} icon={cat.id} title={dn(previewCtx, b.w)} sub={cat.label}
                  right={<Text style={[styles.rate, { color: c.rate }]}>{fmtRate(b.rate)}%</Text>} />
              ))}</List>
              <Text style={[styles.p, { color: c.muted, fontSize: 14 }]}>Search any store on Earn to get the best card for it.</Text>
            </>
          ) : <Text style={[styles.p, { color: c.muted }]}>Add your cards any time from the Wallet tab, and Lucro will pick the best one for every purchase.</Text>}
        </ScrollView>
        <View style={{ paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 8 }}>
          <Button title={sel.length ? 'Start earning' : 'Explore Lucro'} onPress={finish} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: GUTTER, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Top back={back} step={3} />
        <Text style={[styles.h1, { color: c.ink }]}>{name ? `Hi ${name}, which cards do you carry?` : 'Which cards do you carry?'}</Text>
        <Text style={[styles.p, { color: c.muted }]}>Tap every card in your wallet. You can add more any time.</Text>
        <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Icon name="search" color={c.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search all cards" placeholderTextColor={c.muted} autoCorrect={false}
            style={[styles.searchInput, { color: c.ink }]} clearButtonMode="while-editing" />
        </View>
        <View style={styles.grid}>
          {ids.map(id => {
            const p = productOf(ctx, id)!, on = sel.includes(id);
            return (
              <Pressable key={id} onPress={() => toggle(id)} accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.obCard, { backgroundColor: c.surface, borderColor: on ? c.accent : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                <CardArt product={id} width={140} />
                <Text style={[styles.obName, { color: c.ink }]} numberOfLines={2}>{brandOf(ctx, p.brand).short} {p.name}</Text>
                {on ? <View style={[styles.check, { backgroundColor: c.primary }]}><Icon name="check" color={c.onPrimary} size={16} strokeWidth={2.4} /></View> : null}
              </Pressable>
            );
          })}
          {!ids.length ? <Text style={[styles.p, { color: c.muted }]}>No cards match “{q}”.</Text> : null}
        </View>
      </ScrollView>
      <View style={[styles.barRow, { paddingBottom: insets.bottom + 8, backgroundColor: c.bg }]}>
        <View style={{ minWidth: 84 }}><Button kind="ghost" title="Later" onPress={() => { setSel([]); setDone(true); }} /></View>
        <View style={{ flex: 1 }}><Button title={sel.length ? `Add ${sel.length} card${sel.length > 1 ? 's' : ''}` : 'Tap the cards you carry'} onPress={() => setDone(true)} disabled={!sel.length} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  word: { fontFamily: fonts.displayHeavy, fontSize: 26, color: '#fff', letterSpacing: -0.8 },
  fan: { height: 170, marginTop: 26, marginBottom: 18, alignItems: 'center' },
  fanCard: { position: 'absolute', top: 8 },
  welcomeH: { fontFamily: fonts.display, fontSize: 36, lineHeight: 38, letterSpacing: -1, color: '#fff', maxWidth: 320 },
  val: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  valIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(163,230,53,0.14)', alignItems: 'center', justifyContent: 'center' },
  valT: { fontFamily: fonts.semibold, fontSize: 16, color: '#fff' },
  valS: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(255,255,255,0.66)', marginTop: 2 },
  restore: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  restoreText: { fontFamily: fonts.body, fontSize: 15, color: 'rgba(255,255,255,0.72)' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 18 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 22, height: 5, borderRadius: 3 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  p: { fontFamily: fonts.body, fontSize: 16, marginTop: 8, marginBottom: 18 },
  nameField: { fontFamily: fonts.semibold, fontSize: 22, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16 },
  barRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 50 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, justifyContent: 'space-between' },
  obCard: { width: '48%', padding: 10, gap: 8, borderRadius: 16, borderWidth: 2, alignItems: 'center' },
  obName: { fontFamily: fonts.semibold, fontSize: 13, alignSelf: 'stretch' },
  check: { position: 'absolute', top: 4, right: 4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doneIc: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 18 },
  rate: { fontFamily: fonts.display, fontSize: 24 },
});
