import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { ART } from '@/core/art';
import { brandOf, netLabel, productOf } from '@/core/engine';
import { useCtx } from '@/store/app';

import { fonts } from './theme';

/* Placeholder card face (colored gradient + chip) until licensed card images */
export function CardArt({ product, width, plain }: { product: string; width: number; plain?: boolean }) {
  const ctx = useCtx();
  const p = productOf(ctx, product), b = p ? brandOf(ctx, p.brand) : brandOf(ctx, '?');
  const [c1, c2] = ART[product] || b.colors;
  const lightFace = product === 'apple_card' || product === 'amex_platinum';
  const fg = lightFace ? '#111827' : '#ffffff';
  const h = width / 1.586, small = width < 90;
  return (
    <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[styles.card, { width, height: h, borderRadius: Math.max(6, width * 0.07) }]}>
      <View style={[styles.chip, { width: width * 0.13, height: width * 0.1, left: width * 0.08, top: h * 0.36 }]} />
      {!plain && !small && p ? (
        <>
          <Text style={[styles.iss, { color: fg, fontSize: width * 0.085 }]} numberOfLines={1}>{b.short || b.name}</Text>
          <Text style={[styles.net, { color: fg, fontSize: width * 0.07 }]}>{netLabel(p.network)}</Text>
        </>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  chip: { position: 'absolute', borderRadius: 4, backgroundColor: '#e7b84a' },
  iss: { position: 'absolute', left: '8%', top: '10%', fontFamily: fonts.bold },
  net: { position: 'absolute', right: '8%', bottom: '10%', fontFamily: fonts.bold },
});
