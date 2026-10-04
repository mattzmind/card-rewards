/* Schedules the deadline reminders from core/reminders.ts as local phone notifications.
   Off until you turn them on (Profile or Notifications), so we only ask for permission when it's useful. */
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { makeClock } from '@/core/dates';
import { reminderPlan } from '@/core/reminders';

import { useApp } from './app';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

/* Ask once; returns whether we may show notifications */
export async function enableReminders(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  const ok = cur.granted || (await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } })).granted;
  useApp.getState().update(s => { s.profile.reminders = ok; });
  await syncReminders();
  return ok;
}
export async function disableReminders() {
  useApp.getState().update(s => { s.profile.reminders = false; });
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/* Replace everything scheduled with the current plan */
export async function syncReminders() {
  const { state, catalog } = useApp.getState();
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!state.profile.reminders) return 0;
    const plan = reminderPlan({ state, catalog, clock: makeClock() });
    for (const r of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, data: { url: '/notifications' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date },
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
