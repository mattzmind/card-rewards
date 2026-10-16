import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold } from '@expo-google-fonts/ibm-plex-sans';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useApp } from '@/store/app';
import { flushOutbox } from '@/store/feedback';
import { listenForReminderTaps, needsReminders, syncReminders, enableReminders } from '@/store/reminders';
import { useColors, useScheme } from '@/ui/theme';
import { OpeningSplash } from '@/ui/opening';
import { ToastHost } from '@/ui/toast';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold,
  });
  const scheme = useScheme(), c = useColors();
  const onboarded = useApp(s => s.state.onboarded || s.state.wallet.length > 0);
  const syncCatalog = useApp(s => s.syncCatalog);

  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  useEffect(() => { syncCatalog(); flushOutbox(); }, [syncCatalog]);
  /* Keep deadline reminders in step with the wallet. They're on by default: the first time the wallet has a card
     with quarterly deadlines, ask for notification permission (unless reminders were turned off in Profile). */
  const wallet = useApp(s => s.state.wallet), reminders = useApp(s => s.state.profile.reminders);
  useEffect(() => {
    if (reminders === false || !onboarded) return;
    const t = setTimeout(() => { if (reminders) syncReminders(); else if (needsReminders()) enableReminders(); }, 800);
    return () => clearTimeout(t);
  }, [wallet, reminders, onboarded]);
  useEffect(() => listenForReminderTaps(), []);
  if (!loaded) return null;

  const sheet = { presentation: 'formSheet' as const, sheetGrabberVisible: true, sheetAllowedDetents: [0.92], sheetCornerRadius: 24, contentStyle: { backgroundColor: c.bg } };
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.ink, border: c.line, primary: c.accent } };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            {['answer', 'card/[id]', 'add', 'notifications', 'display', 'report'].map(name => (
              <Stack.Screen key={name} name={name} options={sheet} />
            ))}
            {/* Profile is a sidebar from the right (ui/side-sheet.tsx animates it), so the route itself just appears */}
            <Stack.Screen name="profile" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          </Stack.Protected>
        </Stack>
        <ToastHost />
        <OpeningSplash />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
