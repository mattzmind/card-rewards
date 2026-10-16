/// <reference types="jest" />
/* Notification permission and the one-time move from the old Profile on/off switch to Notification settings. */
const mem: Record<string, string> = {};
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: (k: string) => mem[k] ?? null, setItemSync: (k: string, v: string) => { mem[k] = v; } } }));
const perm = { granted: true, canAskAgain: true };
const scheduled: string[] = [];
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(), AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => perm), requestPermissionsAsync: jest.fn(async () => perm),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => { scheduled.length = 0; }),
  scheduleNotificationAsync: jest.fn(async (n: { identifier: string }) => { scheduled.push(n.identifier); }),
  setNotificationChannelAsync: jest.fn(async () => null),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

import type { Profile } from '@/core/types';

import { fresh, newCard, upgrade, useApp } from '../app';
import { refreshPermission, setNotify } from '../reminders';

const pr = () => useApp.getState().state.profile;
const start = (profile: Partial<Profile>) => useApp.getState().replace(upgrade({ ...fresh(), onboarded: true,
  wallet: ['chase_freedom_flex', 'usbank_cash_plus'].map(newCard), profile: { name: '', theme: 'system', ...profile } }));

beforeEach(() => { perm.granted = true; perm.canAskAgain = true; scheduled.length = 0; });

test('someone who turned reminders off with the old Profile switch keeps them off', async () => {
  start({ reminders: false });
  expect(await refreshPermission()).toBe('on');
  expect(pr()).toMatchObject({ reminders: true, notify: { bonus: false, picks: false } });
});

test('everyone else gets every kind on, once', async () => {
  start({ reminders: true });
  await refreshPermission();
  expect(pr()).toMatchObject({ reminders: true, notify: {} });
  /* after the move, blocking then allowing again in the phone's Settings doesn't turn kinds off */
  perm.granted = false; perm.canAskAgain = false;
  expect(await refreshPermission()).toBe('blocked');
  expect(pr().reminders).toBe(false);
  perm.granted = true;
  await refreshPermission();
  expect(pr()).toMatchObject({ reminders: true, notify: {} });
});

test('not asked yet stays not asked', async () => {
  perm.granted = false;
  start({});
  expect(await refreshPermission()).toBe('ask');
  expect(pr().reminders).toBeUndefined();
});

test('turning a kind off reschedules without it', async () => {
  start({ reminders: true, notify: {} });
  await setNotify('bonus', true);
  const before = [...scheduled];
  await setNotify('bonus', false);
  expect(pr().notify).toEqual({ bonus: false });
  expect(scheduled.length).toBeGreaterThan(0);
  expect(scheduled.length).toBeLessThan(before.length);
  expect(scheduled.every(id => /^pick/.test(id))).toBe(true);
});
