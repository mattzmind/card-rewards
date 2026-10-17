/* Soft fade behind the status bar on the tab screens (Earn, Wallet). Hidden at the top of the page; as you
   scroll it fades in, solid under the clock and battery and melting into the content below, so nothing
   scrolls up against the status bar text. Pass the scroll view `onScroll` and `scrollEventThrottle={16}`. */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Animated, { type SharedValue, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from './theme';

const FADE = 28, SHOW_BY = 40; // fade height below the status bar; fully shown after this much scrolling

export function useScrollY() {
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => { y.value = e.contentOffset.y; });
  return { y, onScroll };
}

export function TopFade({ y }: { y: SharedValue<number> }) {
  const c = useColors(), top = useSafeAreaInsets().top, h = top + FADE;
  const shown = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, SHOW_BY], [0, 1], 'clamp') }));
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { height: h }, shown]}>
      <LinearGradient colors={[c.bg, c.bg, c.bg + '00']} locations={[0, top / h, 1]} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0 },
});
