# Lucro for iPhone and Android

The native Lucro app, built with Expo (React Native) and TypeScript. The web app in the
repo root stays live on GitHub Pages while this catches up.

## Run it on your iPhone
1. Install **Expo Go** from the App Store.
2. In this folder: `npm install` (first time only), then `npx expo start`.
3. Scan the QR code with the iPhone camera. Phone and PC must be on the same Wi-Fi
   (if not, use `npx expo start --tunnel`).

## Commands
- `npm test`: engine parity test + screen smoke tests
- `npm run typecheck`: TypeScript
- `npm run sync-catalog`: copy `../catalog.json` into `assets/` after rebuilding the catalog

## Layout
- `src/app/`: screens (Expo Router)
  - `(tabs)/index.tsx` Earn, `(tabs)/wallet.tsx` Wallet (sort/filter, swipe actions, drag to reorder)
  - sheets: `answer`, `card/[id]` (details, picks, activation), `add`, `notifications`, `profile`, `display` (sort/filter), `report`
  - `onboarding.tsx` (first run)
- `src/core/`: the card logic, plain TypeScript. `engine.ts` ports `../src/engine.js`, `wallet.ts` ports `../src/wallet.js`.
  The parity tests in `__tests__/` check they give identical answers to the web app.
- `src/store/`: saved state (same shape as the web app, so backup files work both ways), actions, backup
- `src/ui/`: theme colors, icons, card art, rows, tiles, toast, wallet row, header buttons
