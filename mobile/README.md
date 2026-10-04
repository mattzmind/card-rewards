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
- `src/app/`: screens (Expo Router). `(tabs)/index.tsx` Earn, `(tabs)/wallet.tsx`, `answer.tsx`, `onboarding.tsx`
- `src/core/`: the card logic, plain TypeScript. `engine.ts` is a port of `../src/engine.js`;
  `__tests__/parity.test.ts` checks it gives identical answers for every card, category and store.
- `src/store/`: saved state (same shape as the web app, so backup files work both ways)
- `src/ui/`: theme colors, icons, card art, rows and tiles
