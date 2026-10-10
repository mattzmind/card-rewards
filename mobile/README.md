# Lucro for iPhone and Android

The native Lucro app, built with Expo (React Native) and TypeScript. The web app in the
repo root stays live on GitHub Pages while this catches up.

## Run it on your iPhone
1. Install **Expo Go** from the App Store.
2. In this folder: `npm install` (first time only), then `npx expo start`.
3. Scan the QR code with the iPhone camera. Phone and PC must be on the same Wi-Fi
   (if not, use `npx expo start --tunnel`).

## Good to know
- Deadline reminders (Profile → Deadline reminders) are local notifications and work in Expo Go.
- Expo Go shows its own icon and splash; the Lucro icon/splash appear in real builds (EAS).
- Deep links: `lucro://answer?c=dining`, `lucro://card/<id>`, `lucro://notifications`.
- Screen previews without a phone: `npx expo export --platform web` renders the same screens in a browser
  (storage falls back to localStorage via `src/store/kv.web.ts`). Handy for screenshots; not a product target.

## Build and ship (EAS, no Mac needed)
Builds run in Expo's cloud and are signed with the Apple Developer account. Run `eas` as `npx eas-cli@latest`.
- One-time setup: `eas login`, then `eas init` (links the project and adds `extra.eas.projectId` to `app.json`).
- Your iPhone: `eas device:create` (register it), then `eas build --profile development --platform ios`.
  Install it, turn on Developer Mode (Settings → Privacy & Security), then `npx expo start`.
- App Store: `eas build --profile production --platform ios`, then `eas submit --platform ios --latest`.
  The build lands in TestFlight; build numbers go up automatically (`eas.json`).
- `bundleIdentifier` in `app.json` is permanent once the App Store Connect record exists. Pick it before the first build.

## Commands
- `npm test`: engine parity test + screen smoke tests
- `npm run typecheck`: TypeScript
- `npm run sync-catalog`: copy `../catalog.json` into `assets/` after rebuilding the catalog

## Layout
- `src/app/`: screens (Expo Router)
  - `(tabs)/index.tsx` Earn, `(tabs)/wallet.tsx` Wallet (sort/filter, swipe actions, drag to reorder)
  - sheets: `answer`, `card/[id]` (details, picks, activation), `add`, `notifications`, `profile`, `display` (sort/filter), `report`
  - `onboarding.tsx` (first run)
- `src/core/`: the card logic, plain TypeScript. `reminders.ts` plans deadline notifications. `engine.ts` ports `../src/engine.js`, `wallet.ts` ports `../src/wallet.js`.
  The parity tests in `__tests__/` check they give identical answers to the web app.
- `src/store/`: saved state (same shape as the web app, so backup files work both ways), actions, backup
- `src/ui/`: theme colors, icons, card art, rows, tiles, toast, wallet row, header buttons
