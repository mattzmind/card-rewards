/* Schedules the deadline reminders from core/reminders.ts as local phone notifications.
   The phone decides whether Lucro may notify (permission); Lucro only decides which activity does (profile.notify,
   set in Notification settings). Permission is asked the first time the wallet has a card with quarterly deadlines
   (see app/_layout.tsx). profile.reminders mirrors the permission: undefined = not asked yet, true = allowed, false = blocked. */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { makeClock } from '@/core/dates';
import { reminderPlan } from '@/core/reminders';
import type { NotifyKind } from '@/core/types';

import { useApp } from './app';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

/* Android lists these in the phone's own notification settings, one per kind, matching the rows in Notification settings */
const CHANNELS: Record<NotifyKind, string> = { bonus: 'Quarterly bonuses', picks: 'Category picks' };
let channelsMade = false;
async function makeChannels() {
  if (Platform.OS !== 'android' || channelsMade) return;
  for (const [id, name] of Object.entries(CHANNELS)) await Notifications.setNotificationChannelAsync(id, { name, importance: Notifications.AndroidImportance.DEFAULT });
  channelsMade = true;
}

/* Does the wallet have anything with a quarterly deadline? */
export function needsReminders() {
  const { state, catalog } = useApp.getState();
  return state.wallet.some(w => { const p = catalog.products[w.product]; return !w.inactive && p && (p.rotating || (p.choice || []).some(s => s.period === 'quarter')); });
}

/* What the phone allows: on, can still be asked, or blocked (only the phone's Settings can turn it on) */
export type Permission = 'on' | 'ask' | 'blocked';
export async function getPermission(): Promise<Permission> {
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'on' : p.canAskAgain ? 'ask' : 'blocked';
  } catch { return 'blocked'; }
}

/* Re-read the permission (on launch and whenever the app comes back, since it can change in the phone's Settings).
   Once, for wallets from before Notification settings: reminders turned off with the old Profile switch
   (reminders false while the phone allows them) become both kinds off, so nobody who opted out starts getting them. */
export async function refreshPermission(): Promise<Permission> {
  const perm = await getPermission();
  const { state, update } = useApp.getState(), pr = state.profile;
  const seen = perm === 'on' ? true : perm === 'blocked' ? false : pr.reminders === true ? undefined : pr.reminders;
  if (pr.notify == null || pr.reminders !== seen) update(s => {
    if (s.profile.notify == null) s.profile.notify = perm === 'on' && s.profile.reminders === false ? { bonus: false, picks: false } : {};
    s.profile.reminders = seen;
  });
  return perm;
}

/* Ask the phone (when it still can); returns whether we may show notifications */
export async function enableReminders(): Promise<boolean> {
  let ok = false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    ok = cur.granted || (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })).granted;
  } catch {}
  useApp.getState().update(s => { s.profile.reminders = ok; if (s.profile.notify == null) s.profile.notify = {}; });
  await syncReminders();
  return ok;
}

/* Turn one kind of reminder on or off (Notification settings) */
export async function setNotify(kind: NotifyKind, on: boolean) {
  useApp.getState().update(s => { s.profile.notify = { ...s.profile.notify, [kind]: on }; });
  await syncReminders();
}

/* Replace everything scheduled with the current plan */
export async function syncReminders() {
  const { state, catalog } = useApp.getState();
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!state.profile.reminders) return 0;
    await makeChannels();
    const plan = reminderPlan({ state, catalog, clock: makeClock() });
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { url: '/notifications' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: r.kind },
      });
    }
    return plan.length;
  } catch { return 0; }
}

/* Tapping a reminder opens the Notifications sheet */
export function listenForReminderTaps() {
  const open = (resp: Notifications.NotificationResponse | null) => {
    const url = resp?.notification.request.content.data?.url;
    if (typeof url === 'string') setTimeout(() => router.push(url as '/notifications'), 300);
  };
  Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
