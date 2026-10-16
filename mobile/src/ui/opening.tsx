/* Opening animation: plays every time the app opens (same as #splash in the web app's src/template.html).
   The logo pops in, its two chevrons and the dot rise in turn, then "lucro" and the tagline. It holds for a few
   seconds and slides up off the screen. Tap anywhere to skip. Reduce Motion: no movement, just a fade out.
   No setting to turn it off: it is part of the brand. */
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing, ReduceMotion, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { fonts } from './theme';

const BG = '#0B1412'; // matches the native launch screen (app.json), so the hand-off is seamless
const HOLD = 3800;    // ms before it slides away (the intro itself is done by ~1.2s)
const OUT = 550;
/* Reduce Motion is handled here (fade, no movement), so Reanimated must not skip the timers too */
const pop = Easing.bezier(0.2, 1.3, 0.4, 1), ease = Easing.bezier(0.25, 0.1, 0.25, 1), swoop = Easing.bezier(0.75, 0, 0.25, 1);

/* 0 → 1 after `delay` ms; drives one element's opacity + rise */
function useStep(delay: number, ms: number, easing = pop, still = false) {
  const v = useSharedValue(still ? 1 : 0);
  useEffect(() => { if (!still) v.set(withDelay(delay, withTiming(1, { duration: ms, easing, reduceMotion: ReduceMotion.Never }), ReduceMotion.Never)); }, [v, delay, ms, easing, still]);
  return v;
}
const useRise = (v: SharedValue<number>, dy: number) => useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ translateY: (1 - v.get()) * dy }] }));

export function OpeningSplash() {
  const [shown, setShown] = useState(true);
  return shown ? <Splash onDone={() => setShown(false)} /> : null;
}

function Splash({ onDone }: { onDone: () => void }) {
  const still = useReducedMotion(), { height } = useWindowDimensions();
  const logo = useStep(0, 450, pop, still);
  const c1 = useStep(250, 450, pop, still), c2 = useStep(450, 450, pop, still), dot = useStep(700, 450, pop, still);
  const word = useStep(500, 500, ease, still), tag = useStep(700, 500, ease, still);
  const out = useSharedValue(0);

  const leave = (delay: number, ms: number) => {
    out.set(withDelay(delay, withTiming(1, { duration: ms, easing: swoop, reduceMotion: ReduceMotion.Never }, done => { if (done) runOnJS(onDone)(); }), ReduceMotion.Never));
  };
  useEffect(() => { leave(HOLD, still ? 300 : OUT); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const wrap = useAnimatedStyle(() => still
    ? { opacity: 1 - out.get() }
    : { transform: [{ translateY: -out.get() * height }], borderBottomLeftRadius: out.get() * 40, borderBottomRightRadius: out.get() * 40 });
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.get(), transform: [{ scale: 0.92 + 0.08 * logo.get() }] }));
  const c1Style = useRise(c1, 14 * 1.16), c2Style = useRise(c2, 14 * 1.16), dotStyle = useRise(dot, 14 * 1.16);
  const wordStyle = useRise(word, 14), tagStyle = useRise(tag, 10);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <StatusBar style="light" />
      <Pressable style={styles.fill} onPress={() => leave(0, still ? 200 : 350)} accessibilityRole="button" accessibilityLabel="Lucro. Tap to skip.">
        <Animated.View style={[styles.logo, logoStyle]}>
          <Svg width={116} height={116} viewBox="0 0 100 100"><Rect x={0.5} y={0.5} width={99} height={99} rx={23} fill={BG} stroke="rgba(255,255,255,0.10)" strokeWidth={1} /></Svg>
          <Animated.View style={[StyleSheet.absoluteFill, c1Style]}>
            <Svg width={116} height={116} viewBox="0 0 100 100"><Path d="M27 76 L50 53 L73 76" stroke="#14B8A6" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, c2Style]}>
            <Svg width={116} height={116} viewBox="0 0 100 100"><Path d="M27 52 L50 29 L73 52" stroke="#A3E635" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, dotStyle]}>
            <Svg width={116} height={116} viewBox="0 0 100 100"><Circle cx={50} cy={15} r={5} fill="#FCD34D" /></Svg>
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[styles.word, wordStyle]}>lucro</Animated.Text>
        <Animated.Text style={[styles.tag, tagStyle]}>Use the right card, every time.</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: BG, zIndex: 200, overflow: 'hidden' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  logo: {
    width: 116, height: 116, marginBottom: 18, borderRadius: 27, overflow: 'visible',
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 25, shadowOffset: { width: 0, height: 20 },
  },
  word: { fontFamily: fonts.displayHeavy, fontSize: 46, letterSpacing: -2, color: '#fff' },
  tag: { fontFamily: 'IBMPlexSans_500Medium', fontSize: 17, color: 'rgba(255,255,255,0.72)' },
});
