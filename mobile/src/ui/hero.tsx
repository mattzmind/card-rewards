/* Tinted header behind a tab's title (Earn, Wallet). The diagonal tint fades into the page along the
   bottom too, so there's no hard edge for the search bar or first card to line up with. */
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

import { useColors } from './theme';

export function Hero({ style, children }: { style?: ViewStyle | ViewStyle[]; children: ReactNode }) {
  const c = useColors();
  return (
    <LinearGradient colors={[c.heroA, c.heroB, c.bg]} locations={[0, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={style}>
      <LinearGradient colors={[c.bg + '00', c.bg]} style={styles.fade} pointerEvents="none" />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
});
