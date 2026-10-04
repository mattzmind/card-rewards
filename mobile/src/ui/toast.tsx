/* Bottom toast with optional Undo (same pattern as the web app). Call toast("Saved", undoFn) from anywhere. */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { fonts, useColors } from './theme';

interface T { id: number; msg: string; undo?: () => void }
const useToast = create<{ t: T | null }>(() => ({ t: null }));
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string, undo?: () => void) {
  clearTimeout(timer);
  useToast.setState({ t: { id: Date.now(), msg, undo } });
  timer = setTimeout(() => useToast.setState({ t: null }), 4000);
  (timer as { unref?: () => void })?.unref?.(); // don't keep test runs alive
}

export function ToastHost() {
  const t = useToast(s => s.t), c = useColors(), insets = useSafeAreaInsets();
  useEffect(() => () => clearTimeout(timer), []);
  if (!t) return null;
  return (
    <Animated.View key={t.id} entering={FadeInDown.duration(160)} exiting={FadeOutDown.duration(160)}
      style={[styles.toast, { backgroundColor: c.ink, bottom: insets.bottom + 70 }]} accessibilityLiveRegion="polite">
      <Text style={[styles.msg, { color: c.bg }]} numberOfLines={2}>{t.msg}</Text>
      {t.undo ? (
        <Pressable hitSlop={12} onPress={() => { t.undo!(); useToast.setState({ t: null }); }}>
          <Text style={[styles.undo, { color: c.bg }]}>Undo</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 100 },
  msg: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  undo: { fontFamily: fonts.bold, fontSize: 15, textDecorationLine: 'underline' },
});
