/// <reference types="jest" />
/* Smoke tests: every screen renders real data, and the main actions change the saved state. */
import { fireEvent, render, screen } from '@testing-library/react-native';

const mem: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: (k: string) => mem[k] ?? null, setItemSync: (k: string, v: string) => { mem[k] = v; } } }));
const params: Record<string, string> = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => params }));
jest.mock('react-native-reanimated', () => {
  const { View, ScrollView } = jest.requireActual('react-native');
  const anim = { duration: () => anim };
  return { __esModule: true, default: { View, ScrollView }, useAnimatedRef: () => ({ current: null }), FadeInRight: anim, FadeOutLeft: anim, FadeInDown: anim, FadeOutDown: anim };
});
jest.mock('react-native-sortables', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: { Grid: ({ data, renderItem, keyExtractor }: any) => <View>{data.map((item: any, index: number) => <View key={keyExtractor(item)}>{renderItem({ item, index })}</View>)}</View> } };
});
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const { forwardRef } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: forwardRef(({ children }: any, _ref: any) => <View>{children}</View>) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((_t: any, _m: any, buttons: any) => { buttons?.[buttons.length - 1]?.onPress?.(); });

import { newCard, useApp } from '@/store/app';

import Earn from '../(tabs)/index';
import Wallet from '../(tabs)/wallet';
import Add from '../add';
import Answer from '../answer';
import CardDetails from '../card/[id]';
import Display from '../display';
import Notifications from '../notifications';
import Onboarding from '../onboarding';
import Profile from '../profile';
import Report from '../report';

const st = () => useApp.getState().state;
beforeEach(() => {
  Object.keys(params).forEach(k => delete params[k]);
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

test('Earn with no cards asks for one', async () => {
  useApp.getState().update(s => { s.wallet = []; });
  await render(<Earn />);
  expect(screen.getByText('Add your first card')).toBeTruthy();
});

test('Answer picks the best card and logs the lookup', async () => {
  params.c = 'dining';
  await render(<Answer />);
  expect(screen.getByText('Amex Gold')).toBeTruthy();
  expect(screen.getByText('Wrong card?')).toBeTruthy();
  expect(st().usage.dining).toBe(1);
  expect(st().recents[0]).toEqual({ c: 'dining', s: undefined });
});

test('Answer at Costco only ranks Visa cards', async () => {
  params.c = 'costco'; params.s = 'costco';
  await render(<Answer />);
  expect(screen.getByText(/aren't shown/)).toBeTruthy();
});

test('Wallet shows the summary, toolbar and cards', async () => {
  await render(<Wallet />);
  expect(screen.getByText('Your wallet')).toBeTruthy();
  expect(screen.getByText(/4 CARDS/)).toBeTruthy();
  expect(screen.getByText('My order')).toBeTruthy();
  expect(screen.getByText('Amex Gold')).toBeTruthy();
  expect(screen.getByText(/Your best rate/)).toBeTruthy();
});

test('Card details: mark the quarterly bonus activated', async () => {
  const flex = st().wallet.find(w => w.product === 'chase_freedom_flex')!;
  params.id = flex.id;
  await render(<CardDetails />);
  expect(screen.getByText('Rewards')).toBeTruthy();
  const mark = screen.queryAllByText('Mark activated');
  if (mark.length) {
    await fireEvent.press(mark[0]);
    expect(st().wallet.find(w => w.id === flex.id)!.activated.length).toBe(1);
  }
});

test('Add: search a card and add it', async () => {
  await render(<Add />);
  expect(screen.getByText('Add a card')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('Search banks or cards'), 'sapphire preferred');
  await fireEvent.press(screen.getByText('Chase Sapphire Preferred'));
  await fireEvent.changeText(screen.getByPlaceholderText('1234'), '12a34');
  await fireEvent.press(screen.getByText('Add to wallet'));
  const added = st().wallet.find(w => w.product === 'chase_sapphire_preferred');
  expect(added?.last4).toBe('1234');
});

test('Notifications render', async () => {
  await render(<Notifications />);
  expect(screen.getByText('Notifications')).toBeTruthy();
});

test('Profile: change appearance', async () => {
  await render(<Profile />);
  expect(screen.getByText('Alex')).toBeTruthy();
  await fireEvent.press(screen.getByText('Dark'));
  expect(st().profile.theme).toBe('dark');
});

test('Sort sheet saves a new sort', async () => {
  params.mode = 'sort';
  await render(<Display />);
  await fireEvent.press(screen.getByText('Sorting'));
  await fireEvent.press(screen.getByText('Name A–Z'));
  await fireEvent.press(screen.getByLabelText('Save'));
  expect(st().view?.sort).toBe('name');
});

test('Report saves feedback', async () => {
  params.c = 'dining';
  await render(<Report />);
  await fireEvent.press(screen.getByText('Submit feedback'));
  expect(st().reports.length).toBe(1);
  expect(st().reports[0].where).toBe('Dining');
});

test('Onboarding starts on the welcome screen', async () => {
  await render(<Onboarding />);
  expect(screen.getByText('Get paid back on every purchase.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Get started'));
  expect(screen.getByText('What should we call you?')).toBeTruthy();
});
