/* Color tokens: the same values as the web app's src/template.html (:root and dark mode). */
import { useColorScheme } from 'react-native';

import { useApp } from '@/store/app';

const light = {
  bg: '#f3f6f2', surface: '#ffffff', surface2: '#ecf1ea', ink: '#0b1412', muted: '#56655f', line: '#dde5dc',
  accent: '#0f766e', onAccent: '#ffffff', rate: '#047857',
  primary: '#0b1412', onPrimary: '#ffffff', hl: '#a3e635', hlInk: '#0b1412', badge: '#fcd34d', onBadge: '#0b1412',
  warn: '#8a5200', warnBg: '#fdf1dc', star: '#d97706', info: '#1d4f91', infoBg: '#e7f0fb', danger: '#b42318',
  heroA: 'rgba(163,230,53,0.30)', heroB: 'rgba(20,184,166,0.26)', heroC: '#eaf3e6',
};
const dark: typeof light = {
  bg: '#0b1412', surface: '#131d1a', surface2: '#1b2723', ink: '#eef3ef', muted: '#9aaba3', line: '#24322d',
  accent: '#2dd4bf', onAccent: '#032420', rate: '#a3e635',
  primary: '#a3e635', onPrimary: '#0b1412', hl: '#a3e635', hlInk: '#0b1412', badge: '#fcd34d', onBadge: '#0b1412',
  warn: '#fbbf24', warnBg: '#2f250f', star: '#fbbf24', info: '#9cc7fb', infoBg: '#14243a', danger: '#f87171',
  heroA: 'rgba(163,230,53,0.16)', heroB: 'rgba(20,184,166,0.18)', heroC: '#0e1c18',
};
export type Colors = typeof light;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  body: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
};
export const GUTTER = 20;

/* Follows the phone's light/dark setting unless Profile > Appearance overrides it */
export function useScheme(): 'light' | 'dark' {
  const sys = useColorScheme();
  const pref = useApp(s => s.state.profile.theme);
  if (pref === 'light' || pref === 'dark') return pref;
  return sys === 'dark' ? 'dark' : 'light';
}
export function useColors(): Colors {
  return useScheme() === 'dark' ? dark : light;
}
