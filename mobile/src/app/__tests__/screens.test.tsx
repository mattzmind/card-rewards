/// <reference types="jest" />
/* Smoke test: each Phase 1 screen renders real data without crashing. */
import { fireEvent, render, screen } from '@testing-library/react-native';

const mem: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: (k: string) => mem[k] ?? null, setItemSync: (k: string, v: string) => { mem[k] = v; } } }));
const params: Record<string, string> = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => params }));
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const anim = { duration: () => anim };
  return { __esModule: true, default: { View }, FadeInRight: anim, FadeOutLeft: anim };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { newCard, useApp } from '@/store/app';

import Answer from '../answer';
import Onboarding from '../onboarding';
import Earn from '../(tabs)/index';
import Wallet from '../(tabs)/wallet';

beforeEach(() => {
  useApp.getState().replace({
    people: [{ id: 'me', name: 'Alex' }], recents: [], usage: {}, reports: [], favs: [], onboarded: true,
    profile: { name: 'Alex', theme: 'system' },
    wallet: ['amex_gold', 'citi_double_cash', 'chase_freedom_flex', 'citi_costco'].map(newCard),
  });
});

test('Earn shows the greeting, search results and categories', async () => {
  await render(<Earn />);
  expect(screen.getByText('Alex')).toBeTruthy();
  expect(screen.getByText(/4 CARDS READY/)).toBeTruthy();
  expect(screen.getByText('All categories')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('Where are you shopping?'), 'costco');
  expect(screen.getAllByText('Costco').length).toBeGreaterThan(0);
});

test('Answer picks the best card and logs the lookup', async () => {
  params.c = 'dining'; delete params.s;
  await render(<Answer />);
  expect(screen.getByText('Amex Gold')).toBeTruthy();
  expect(useApp.getState().state.usage.dining).toBe(1);
  expect(useApp.getState().state.recents[0]).toEqual({ c: 'dining', s: undefined });
});

test('Answer at Costco only ranks Visa cards', async () => {
  params.c = 'costco'; params.s = 'costco';
  await render(<Answer />);
  expect(screen.getByText(/aren't shown/)).toBeTruthy();
});

test('Wallet lists the cards', async () => {
  await render(<Wallet />);
  expect(screen.getByText('4 cards')).toBeTruthy();
  expect(screen.getByText('Save a backup file')).toBeTruthy();
});

test('Onboarding starts on the welcome screen', async () => {
  await render(<Onboarding />);
  expect(screen.getByText('Get paid back on every purchase.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Get started'));
  expect(screen.getByText('What should we call you?')).toBeTruthy();
});
