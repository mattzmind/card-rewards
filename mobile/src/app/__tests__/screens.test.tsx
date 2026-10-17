/// <reference types="jest" />
/* Smoke tests: every screen renders real data, and the main actions change the saved state. */
import { fireEvent, render, screen } from '@testing-library/react-native';

const mem: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: (k: string) => mem[k] ?? null, setItemSync: (k: string, v: string) => { mem[k] = v; } } }));
const params: Record<string, string> = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissAll: jest.fn() }, useLocalSearchParams: () => params, useScrollToTop: jest.fn(),
  useNavigation: () => ({ setOptions: jest.fn(), addListener: () => () => {}, dispatch: jest.fn() }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('react-native-reanimated', () => {
  const { View, ScrollView } = jest.requireActual('react-native');
  const anim: any = { duration: () => anim, delay: () => anim };
  return { __esModule: true, default: { View, ScrollView }, useAnimatedRef: () => ({ current: null }), FadeInRight: anim, FadeOutLeft: anim, FadeInDown: anim, FadeOutDown: anim,
    useSharedValue: (v: any) => ({ value: v, get: () => v, set: () => {} }), useAnimatedStyle: () => ({}), useAnimatedScrollHandler: () => undefined, withTiming: (v: any) => v, interpolate: () => 1, runOnJS: (fn: any) => fn,
    Easing: { out: () => () => 0, cubic: () => 0 } };
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
jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  const pan: any = new Proxy({}, { get: () => () => pan });
  return { GestureHandlerRootView: View, GestureDetector: ({ children }: any) => children, Gesture: { Pan: () => pan } };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-store-review', () => ({ storeUrl: () => null, requestReview: jest.fn(async () => {}) }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
const perm = { granted: true, canAskAgain: true };
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(), AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => perm), requestPermissionsAsync: jest.fn(async () => perm),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}), scheduleNotificationAsync: jest.fn(async () => {}), setNotificationChannelAsync: jest.fn(async () => null),
}));
jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((_t: any, _m: any, buttons: any) => { buttons?.[buttons.length - 1]?.onPress?.(); });

import { newCard, useApp } from '@/store/app';

import Earn from '../(tabs)/index';
import Wallet from '../(tabs)/wallet';
import Add from '../add';
import Answer from '../answer';
import CardDetails from '../card/[id]';
import Display from '../display';
import NotificationSettings from '../notification-settings';
import Notifications from '../notifications';
import Onboarding from '../onboarding';
import Privacy from '../privacy';
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
  expect(screen.getByText(/Alex/)).toBeTruthy();
  expect(screen.queryByText(/CARDS READY/)).toBeNull(); // hidden for now (SHOW.cardCount)
  expect(screen.getByText('All categories')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('Where are you shopping?'), 'costco');
  expect(screen.getAllByText('Costco').length).toBeGreaterThan(0);
});

test('Earn keeps popular categories when there are favorites', async () => {
  useApp.getState().update(s => { s.favs = ['c:dining']; });
  await render(<Earn />);
  expect(screen.getByText('Favorites')).toBeTruthy();
  expect(screen.getByText('Popular categories')).toBeTruthy();
});

test('Earn offers to request a store that is not listed', async () => {
  const { router } = jest.requireMock('expo-router');
  await render(<Earn />);
  await fireEvent.changeText(screen.getByPlaceholderText('Where are you shopping?'), 'Rosas Taqueria ');
  await fireEvent.press(screen.getByText('Request “Rosas Taqueria”'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/report', params: { missing: 'Rosas Taqueria' } });
});

test('Earn hides the store request for one letter or a store that is already listed', async () => {
  await render(<Earn />);
  await fireEvent.changeText(screen.getByPlaceholderText('Where are you shopping?'), 'c');
  expect(screen.queryByText(/^Request “/)).toBeNull();
  await fireEvent.changeText(screen.getByPlaceholderText('Where are you shopping?'), 'Costco');
  expect(screen.queryByText(/^Request “/)).toBeNull();
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
  expect(screen.getByText(/aren’t shown/)).toBeTruthy();
});

test('Wallet shows the summary, toolbar and cards', async () => {
  await render(<Wallet />);
  expect(screen.getByText('Wallet')).toBeTruthy();
  expect(screen.getByText(/4 CARDS/)).toBeTruthy();
  expect(screen.getByText('Sort')).toBeTruthy();
  expect(screen.getByText('Amex Gold')).toBeTruthy();
  expect(screen.getByText(/ bonuses$/)).toBeTruthy();
  expect(screen.getByText(/^Tip: .+ earns /)).toBeTruthy();
  expect(screen.queryByText('TOP RATE')).toBeNull();
});

test('Card details: mark the quarterly bonus activated, then save', async () => {
  const flex = st().wallet.find(w => w.product === 'chase_freedom_flex')!;
  params.id = flex.id;
  await render(<CardDetails />);
  expect(screen.getByText('Rewards')).toBeTruthy();
  await fireEvent.press(screen.getAllByText('Mark activated')[0]);
  expect(st().wallet.find(w => w.id === flex.id)!.activated.length).toBe(0); // a draft until saved
  await fireEvent.press(screen.getAllByText('Save changes')[0]);
  expect(st().wallet.find(w => w.id === flex.id)!.activated.length).toBe(1);
});

test('Card details: category dropdowns turn Save changes on, and saving stores the picks', async () => {
  useApp.getState().update(s => { s.wallet.push(newCard('usbank_cash_plus')); });
  const cp = st().wallet.find(w => w.product === 'usbank_cash_plus')!;
  params.id = cp.id;
  await render(<CardDetails />);
  await fireEvent.press(screen.getByLabelText('5% category 1: Choose a category'));
  await fireEvent.press(screen.getByText('Fast food'));
  expect(screen.getByText('Choose 2 categories for 5% to save.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('5% category 2: Choose a category'));
  expect(screen.getByText('Already picked')).toBeTruthy(); // can't pick fast food twice
  await fireEvent.press(screen.getByText('Cell phone'));
  await fireEvent.press(screen.getByLabelText('2% category 1: Choose a category'));
  await fireEvent.press(screen.getByText('Restaurants'));
  await fireEvent.press(screen.getAllByText('Save changes')[0]);
  const sel = st().wallet.find(w => w.id === cp.id)!.sel;
  expect(sel.five?.opts).toEqual(['fast_food', 'phone']);
  expect(sel.two?.opts).toEqual(['dining']);
  expect(screen.getByText(/^Saved for Q/)).toBeTruthy();
});

test('Card details: Citi Custom Cash top category is saved with a button, not on tap', async () => {
  useApp.getState().update(s => { s.wallet.push(newCard('citi_custom_cash')); });
  const cc = st().wallet.find(w => w.product === 'citi_custom_cash')!;
  params.id = cc.id;
  await render(<CardDetails />);
  expect(screen.queryByText(/No longer offered/)).toBeNull();
  await fireEvent.press(screen.getByLabelText('Top category: Choose a category'));
  await fireEvent.press(screen.getAllByText('Gas')[0]);
  expect(st().wallet.find(w => w.id === cc.id)!.autoFocus).toBeUndefined();
  await fireEvent.press(screen.getAllByText('Save changes')[0]);
  expect(st().wallet.find(w => w.id === cc.id)!.autoFocus).toBe('gas');
});

test('Card details: Save changes stays off until an edit, then saves last 4', async () => {
  const gold = st().wallet.find(w => w.product === 'amex_gold')!;
  params.id = gold.id;
  await render(<CardDetails />);
  expect(screen.getByText('Last 4 digits (optional)')).toBeTruthy();
  await fireEvent.press(screen.getByText('Save changes'));
  expect(st().wallet.find(w => w.id === gold.id)!.last4).toBe('');
  await fireEvent.changeText(screen.getByLabelText('Last 4 digits'), '12');
  expect(screen.getByText(/Enter all 4 digits/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Last 4 digits'), '4321');
  await fireEvent.press(screen.getByText('Save changes'));
  expect(st().wallet.find(w => w.id === gold.id)!.last4).toBe('4321');
});

test('Add: pick several cards, add them, then set up the one with categories', async () => {
  await render(<Add />);
  expect(screen.getByText('Add cards')).toBeTruthy();
  await fireEvent.changeText(screen.getByPlaceholderText('Search banks or cards'), 'sapphire preferred');
  await fireEvent.press(screen.getByText('Chase Sapphire Preferred'));
  await fireEvent.changeText(screen.getByPlaceholderText('Search banks or cards'), 'cash+');
  await fireEvent.press(screen.getByText('U.S. Bank Cash+'));
  await fireEvent.press(screen.getByText('Add 2 cards'));
  await fireEvent.changeText(screen.getAllByPlaceholderText('0000')[0], '12a34');
  await fireEvent.press(screen.getByText('Add to wallet'));
  expect(st().wallet.find(w => w.product === 'chase_sapphire_preferred')?.last4).toBe('1234');
  expect(st().wallet.find(w => w.product === 'usbank_cash_plus')).toBeTruthy();
  expect(screen.getByText('2 cards added')).toBeTruthy();
  await fireEvent.press(screen.getByText('Continue'));
  expect(screen.getByText(/Set up your/)).toBeTruthy(); // only Cash+ needs setup
  await fireEvent.press(screen.getByText('Skip for now'));
  expect(require('expo-router').router.back).toHaveBeenCalled();
});

test('Add: request a card that is not listed', async () => {
  await render(<Add />);
  await fireEvent.changeText(screen.getByPlaceholderText('Search banks or cards'), 'zzz platinum');
  await fireEvent.press(screen.getByText('Request “zzz platinum”'));
  expect(require('expo-router').router.push).toHaveBeenCalledWith({ pathname: '/report', params: { card: 'zzz platinum' } });
});

test('Notifications render', async () => {
  await render(<Notifications />);
  expect(screen.getByText('Notifications')).toBeTruthy();
});

test('Profile invites a guest to add a name', async () => {
  useApp.getState().update(s => { s.profile.name = ''; });
  await render(<Profile />);
  await fireEvent.press(screen.getByText('Add your name'));
  await fireEvent.changeText(screen.getByPlaceholderText('First name'), 'Sam');
  await fireEvent.press(screen.getByLabelText('Save name'));
  expect(st().profile.name).toBe('Sam');
});

test('Profile: name card, stats, sections in order, and change appearance', async () => {
  await render(<Profile />);
  expect(screen.getByText('Alex')).toBeTruthy();
  expect(screen.getByText('ANNUAL FEES')).toBeTruthy();
  expect(screen.getByText('No backup yet')).toBeTruthy();
  const order = ['Your data', 'Settings', 'Support'].map(t => JSON.stringify(screen.toJSON()).indexOf(`"${t}"`));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  expect(screen.queryByText('Deadline reminders')).toBeNull();
  expect(screen.queryByText('Rate Lucro')).toBeNull(); // hidden until Lucro is in the stores
  await fireEvent.press(screen.getByText('Dark'));
  expect(st().profile.theme).toBe('dark');
});

test('Profile opens Data & Privacy, Notification settings and feedback', async () => {
  const { router } = jest.requireMock('expo-router');
  await render(<Profile />);
  await fireEvent.press(screen.getByText('Data & Privacy'));
  expect(router.push).toHaveBeenCalledWith('/privacy');
  await fireEvent.press(screen.getByText('Notifications'));
  expect(router.push).toHaveBeenCalledWith('/notification-settings');
  await fireEvent.press(screen.getByText('Send feedback'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/report', params: { general: '1' } });
});

test('Data & Privacy: erase all data starts over', async () => {
  await render(<Privacy />);
  expect(screen.getByText('Save a backup file')).toBeTruthy();
  await fireEvent.press(screen.getByText('Erase all data'));
  expect(st().wallet).toEqual([]);
  expect(st().onboarded).toBeFalsy();
});

test('Notification settings: one switch per activity, no master switch', async () => {
  useApp.getState().update(s => { s.profile.reminders = true; s.profile.notify = {}; });
  await render(<NotificationSettings />);
  expect(await screen.findByLabelText('Quarterly bonuses')).toBeTruthy();
  expect(screen.queryByText('Turn on')).toBeNull();
  await fireEvent(screen.getByLabelText('Category picks'), 'valueChange', false);
  expect(st().profile.notify).toEqual({ picks: false });
});

test('Notification settings: blocked by the phone points to Settings', async () => {
  perm.granted = false; perm.canAskAgain = false;
  try {
    await render(<NotificationSettings />);
    expect(await screen.findByText('Open Settings')).toBeTruthy();
    expect(st().profile.reminders).toBe(false);
  } finally { perm.granted = true; perm.canAskAgain = true; }
});

test('Sort sheet saves a new sort', async () => {
  params.mode = 'sort';
  await render(<Display />);
  await fireEvent.press(screen.getByText('Sorting'));
  await fireEvent.press(screen.getByText('Name A–Z'));
  await fireEvent.press(screen.getByLabelText('Save'));
  expect(st().view?.sort).toBe('name');
});

const tick = () => new Promise(r => setTimeout(r, 0));
test('Report sends feedback (kept in the outbox until it can be emailed), not into notifications', async () => {
  params.c = 'dining';
  await render(<Report />);
  await fireEvent.press(screen.getByText('Submit feedback'));
  await tick();
  expect(st().reports.length).toBe(0);
  expect(st().outbox?.[0].where).toBe('Dining');
});

test('Report: request a missing card', async () => {
  params.card = 'Diamond Preferred';
  await render(<Report />);
  await fireEvent.changeText(screen.getByPlaceholderText('For example: Citi'), 'Citi');
  await fireEvent.press(screen.getByText('Send request'));
  await tick();
  expect(st().outbox?.[0]).toMatchObject({ where: 'Citi', card: 'Diamond Preferred', reason: 'Please add this card' });
});

test('Report: request a missing store', async () => {
  params.missing = 'Rosas Taqueria';
  await render(<Report />);
  await fireEvent.changeText(screen.getByPlaceholderText('Search categories'), 'restaurant');
  await fireEvent.press(screen.getByText('Dining'));
  await fireEvent.changeText(screen.getByPlaceholderText(/Austin/), 'Austin, TX');
  await fireEvent.press(screen.getByText('Send request'));
  await tick();
  expect(st().outbox?.[0]).toMatchObject({ where: 'Rosas Taqueria', cat: 'Dining', card: 'Store not listed', note: 'Austin, TX' });
});

test('Report: general feedback from Profile', async () => {
  params.general = '1';
  await render(<Report />);
  await fireEvent.press(screen.getByText('Something isn’t working'));
  await fireEvent.changeText(screen.getByPlaceholderText(/widget/), 'Search is slow');
  await fireEvent.press(screen.getByText('Send'));
  await tick();
  expect(st().outbox?.[0]).toMatchObject({ where: 'Lucro app', reason: 'Feedback: Something isn’t working', note: 'Search is slow' });
});

test('Onboarding starts on the welcome screen', async () => {
  await render(<Onboarding />);
  expect(screen.getByText('Get paid back on every purchase.')).toBeTruthy();
  for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByText('Next'));
  await fireEvent.press(screen.getByText('Get started'));
  expect(screen.getByText('What is your name?')).toBeTruthy();
});
