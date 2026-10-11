/* Sidebar: slides in from the right (the side of the profile button) over a dimmed backdrop.
   Closes with the X (top left), a tap on the backdrop, or a swipe right (the panel follows the finger).
   The route itself is a transparent modal with no animation, so this panel does all the motion. */
import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './icon';
import { tap } from './parts';
import { fonts, useColors } from './theme';

const goBack = () => router.back();

export function SideSheet({ title, children }: { title: string; children: ReactNode }) {
  const c = useColors(), insets = useSafeAreaInsets(), { width } = useWindowDimensions();
  const W = Math.min(width * 0.88, 400);
  const x = useSharedValue(W);

  useEffect(() => { x.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })); }, [x]);
  const close = () => { x.set(withTiming(W, { duration: 200 }, done => { if (done) runOnJS(goBack)(); })); };

  const pan = Gesture.Pan().activeOffsetX([-14, 14]).failOffsetY([-12, 12])
    .onUpdate(e => { x.set(Math.max(0, e.translationX)); })
    .onEnd(e => {
      const shut = e.translationX > W * 0.3 || e.velocityX > 700;
      x.set(withTiming(shut ? W : 0, { duration: 180 }, done => { if (done && shut) runOnJS(goBack)(); }));
    });

  const panel = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const shade = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [0, W], [1, 0]) }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shade]}>
            <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View style={[styles.panel, { width: W, backgroundColor: c.bg, paddingTop: insets.top }, panel]} accessibilityViewIsModal>
            <View style={styles.bar}>
              <Pressable onPress={() => { tap(); close(); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close"
                style={({ pressed }) => [styles.round, { backgroundColor: pressed ? c.surface2 : c.surface, borderColor: c.line }]}>
                <Icon name="x" color={c.ink} size={20} />
              </Pressable>
              <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">{title}</Text>
              <View style={{ width: 44 }} />
            </View>
            <View style={{ flex: 1 }}>{children}</View>
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  shade: { backgroundColor: 'rgba(0,0,0,0.38)' },
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, borderTopLeftRadius: 24, borderBottomLeftRadius: 24, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: -6, height: 0 }, elevation: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.display, fontSize: 20 },
});
