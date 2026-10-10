# Lucro roadmap

Future features. Not scheduled yet; add new ideas at the bottom of the list.

## Answer before you pay (widgets + location notifications)

**Status:** idea. Waits until the native app has location (GPS) permission and push notifications.

**Goal:** put the recommendation in front of the user right before they pay, without opening the app.

- **Home Screen / Lock Screen widget:** shows the best card for the user's top categories
  (e.g. Dining, Groceries, Gas). A tap opens the answer sheet via the existing deep link
  `lucro://answer?c=<category>`.
- **Location-based notification:** when the user arrives at a known merchant, notify them:
  "You're at Whole Foods: use your Amex Gold." Builds on the current notification work
  (deadline reminders in `mobile/src/core/reminders.ts`).

**Notes:**
- Ranking must come from `mobile/src/core/engine.ts` so the widget and notification match the in-app answer.
- Location is opt-in, asked only when the user turns this on, with a plain reason. Process it on the
  device and never store or send location history (update `site/privacy.html` before shipping).
- Needs a development build: widgets and background geofencing don't run in Expo Go.
- Rate-limit notifications (e.g. once per store visit) so they stay useful, not noisy.
